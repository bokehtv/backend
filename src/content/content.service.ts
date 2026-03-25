import { z } from 'zod';
import redis from '../common/redis';
import logger from '../common/logger';

export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  page: z.string().optional().transform(p => p ? parseInt(p, 10) : 1),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export class ContentService {
  private readonly tmdbBaseUrl = 'https://api.themoviedb.org/3';
  private readonly redisPrefix = 'tmdb:search:';
  private readonly cacheTTL = 86400; // 24 hours in seconds

  async searchMulti(query: string, page: number = 1) {
    const cacheKey = `${this.redisPrefix}${query.toLowerCase()}:${page}`;
    
    // Check cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info('Redis cache hit for TMDB search', { query, page, cacheKey });
      return JSON.parse(cachedData);
    }
    
    logger.info('Redis cache miss for TMDB search', { query, page, cacheKey });

    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
      throw new Error('TMDB_API_KEY is not configured in the environment');
    }

    const url = `${this.tmdbBaseUrl}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.status_message || 'Failed to fetch data from TMDB');
    }

    const data = await response.json();
    
    // Formatting the TMDB response into our structure
    const results = {
      results: data.results.map((item: any) => ({
        tmdb_id: item.id,
        type: item.media_type,
        title: item.title || item.name,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date,
      })),
      meta: {
        page: data.page,
        total: data.total_results,
        totalPages: data.total_pages,
      }
    };

    // Store in cache
    await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(results));
    
    return results;
  }

  async getTrending(page: number = 1) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) throw new Error('TMDB_API_KEY is not configured');

    const url = `${this.tmdbBaseUrl}/trending/all/day?api_key=${apiKey}&page=${page}`;
    let response;
    try {
      response = await fetch(url);
    } catch (networkError) {
       throw new Error(`TMDB connection failed: ${(networkError as Error).message}. Check your server internet connection.`);
    }

    if (!response.ok) throw new Error('Failed to fetch trending results from TMDB');

    const data = await response.json();
    return {
      results: data.results.map((item: any) => ({
        tmdb_id: item.id,
        type: item.media_type || (item.title ? 'movie' : 'tv'),
        title: item.title || item.name,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date,
      })),
      meta: {
        page: data.page,
        total: data.total_results,
        totalPages: data.total_pages,
      }
    };
  }
}
