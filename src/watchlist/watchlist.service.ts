import { z } from 'zod';
import { prisma } from '../common/prisma';
import redis from '../common/redis';
import logger from '../common/logger';

export const AddToWatchlistDto = z.object({
  tmdb_id: z.number(),
  type: z.enum(['MOVIE', 'TV']),
  title: z.string(),
  poster_url: z.string().nullable().optional(),
  status: z.enum(['WANT', 'WATCHING', 'DONE']),
});

export const UpdateWatchlistStatusDto = z.object({
  status: z.enum(['WANT', 'WATCHING', 'DONE']),
});

export type AddToWatchlistInput = z.infer<typeof AddToWatchlistDto>;
export type UpdateWatchlistStatusInput = z.infer<typeof UpdateWatchlistStatusDto>;

export class WatchlistService {
  private readonly redisPrefix = 'watchlist:';
  private readonly cacheTTL = 3600; // 1 hour for user-specific data

  async getWatchlist(userId: string) {
    const cacheKey = `${this.redisPrefix}${userId}`;
    
    // Check cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info('Redis cache hit for watchlist', { userId, cacheKey });
      return JSON.parse(cachedData);
    }
    
    logger.info('Redis cache miss for watchlist', { userId, cacheKey });

    const list = await prisma.watchlist.findMany({
      where: { user_id: userId },
      include: {
        content: true,
      },
      orderBy: {
        added_at: 'desc',
      },
    });

    // Store in cache
    await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(list));

    return list;
  }

  async addToWatchlist(userId: string, data: AddToWatchlistInput) {
    // Upsert the content from TMDB to ensure it exists in our DB
    const content = await prisma.content.upsert({
      where: { tmdb_id: data.tmdb_id },
      update: {
        title: data.title,
        poster_url: data.poster_url,
      },
      create: {
        tmdb_id: data.tmdb_id,
        type: data.type,
        title: data.title,
        poster_url: data.poster_url,
      },
    });

    // Prevent duplicate entries
    const existingEntry = await prisma.watchlist.findFirst({
      where: { user_id: userId, content_id: content.id }
    });

    if (existingEntry) {
      throw new Error('This content is already in your watchlist. Update the status instead.');
    }

    // Wrap in transaction with activity logs
    const result = await prisma.$transaction(async (tx) => {
      const watchlistEntry = await tx.watchlist.create({
        data: {
          user_id: userId,
          content_id: content.id,
          status: data.status,
        },
        include: { content: true },
      });

      await tx.activityLog.create({
        data: {
          user_id: userId,
          action: 'ADDED_TO_WATCHLIST',
          content_id: content.id,
        },
      });

      return watchlistEntry;
    });

    // Invalidate cache
    await this.invalidateCache(userId);

    return result;
  }

  async updateStatus(userId: string, watchlistId: string, status: 'WANT' | 'WATCHING' | 'DONE') {
    const entry = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!entry || entry.user_id !== userId) {
      throw new Error('Watchlist entry not found');
    }

    const updatedEntry = await prisma.watchlist.update({
      where: { id: watchlistId },
      data: { status },
      include: { content: true }
    });

    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: `UPDATED_STATUS_TO_${status}`,
        content_id: entry.content_id,
      },
    });

    // Invalidate cache
    await this.invalidateCache(userId);

    return updatedEntry;
  }

  async removeFromWatchlist(userId: string, watchlistId: string) {
    const entry = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!entry || entry.user_id !== userId) {
      throw new Error('Watchlist entry not found');
    }

    await prisma.watchlist.delete({ where: { id: watchlistId } });
    
    // Log removal
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action: 'REMOVED_FROM_WATCHLIST',
        content_id: entry.content_id,
      },
    });

    // Invalidate cache
    await this.invalidateCache(userId);

    return { success: true };
  }

  private async invalidateCache(userId: string) {
    const cacheKey = `${this.redisPrefix}${userId}`;
    await redis.del(cacheKey);
    logger.info('Redis cache invalidated for watchlist', { userId, cacheKey });
  }
}
