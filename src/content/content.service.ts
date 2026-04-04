import { z } from 'zod';
import redis from '../common/redis';
import logger from '../common/logger';

export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  page: z.string().optional().transform(p => p ? parseInt(p, 10) : 1),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export interface TmdbItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
}

export class ContentService {
  private readonly tmdbBaseUrl = 'https://api.themoviedb.org/3';
  private readonly redisPrefix = 'tmdb:search:';
  private readonly cacheTTL = 86400; // 24 hours in seconds

  async searchMulti(query: string, page: number = 1) {
    const cacheKey = `${this.redisPrefix}${query.toLowerCase()}:${page}`;
    
    // Check cache (Graceful Fallback)
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          logger.info('Redis cache hit for TMDB search', { query, page, cacheKey });
          return parsed;
        } catch (parseError) {
          logger.warn('Redis cache corrupted for search, ignoring...', { cacheKey, error: (parseError as Error).message });
          // If parse fails, we just continue to fetch from TMDB
        }
      }
      logger.info('Redis cache miss for TMDB search', { query, page, cacheKey });
    } catch (err) {
      logger.warn('Redis unavailable for cache check, skipping...', { error: (err as Error).message });
    }

    const apiKey = process.env.TMDB_API_KEY;
    const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;
    
    if (!apiKey && !readAccessToken) {
      throw new Error('Neither TMDB_API_KEY nor TMDB_READ_ACCESS_TOKEN is configured in the environment');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    let url: string;
    
    if (readAccessToken) {
      // Use Bearer Token (Preferred TMDB method)
      headers['Authorization'] = `Bearer ${readAccessToken}`;
      url = `${this.tmdbBaseUrl}/search/multi?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;
    } else {
      // Fallback to Query String API Key
      url = `${this.tmdbBaseUrl}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.status_message || 'Failed to fetch data from TMDB');
    }

    const data = await response.json();
    
    // Formatting the TMDB response into our structure
    const results = {
      results: (data.results as TmdbItem[]).map((item) => ({
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

    // Store in cache (Graceful Fallback)
    try {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(results));
    } catch (err) {
      logger.warn('Redis unavailable to store cache, skipping...', { error: (err as Error).message });
    }
    
    return results;
  }

  async getTrending(page: number = 1) {
    const cacheKey = `${this.redisPrefix}trending:${page}`;

    // Check cache (Graceful Fallback)
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.info('Redis cache hit for trending', { page, cacheKey });
        return JSON.parse(cachedData);
      }
      logger.info('Redis cache miss for trending', { page, cacheKey });
    } catch (err) {
      logger.warn('Redis unavailable for trending cache check, skipping...', { error: (err as Error).message });
    }

    const apiKey = process.env.TMDB_API_KEY;
    const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;
    
    if (!apiKey && !readAccessToken) {
      throw new Error('TMDB auth not configured');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    let url: string;
    
    if (readAccessToken) {
      headers['Authorization'] = `Bearer ${readAccessToken}`;
      url = `${this.tmdbBaseUrl}/trending/all/day?page=${page}`;
    } else {
      url = `${this.tmdbBaseUrl}/trending/all/day?api_key=${apiKey}&page=${page}`;
    }

    let response;
    try {
      response = await fetch(url, { headers });
    } catch (networkError) {
       throw new Error(`TMDB connection failed: ${(networkError as Error).message}. Check your server internet connection.`, { cause: networkError });
    }

    if (!response.ok) throw new Error('Failed to fetch trending results from TMDB');

    const data = await response.json();
    
    // Formatting the TMDB response into our structure
    const results = {
      results: ((data.results || []) as TmdbItem[]).map((item) => ({
        tmdb_id: item.id,
        type: item.media_type || (item.title ? 'movie' : 'tv'),
        title: item.title || item.name,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date,
      })),
      meta: {
        page: data.page || 1,
        total: data.total_results || 0,
        totalPages: data.total_pages || 1,
      }
    };

    // Store in cache (Graceful Fallback)
    try {
      await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(results));
    } catch (err) {
      logger.warn('Redis unavailable to store trending cache, skipping...', { error: (err as Error).message });
    }

    return results;
  }
}

