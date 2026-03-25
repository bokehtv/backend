import Redis from 'ioredis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  connectTimeout: 2000,
  retryStrategy(times) {
    // Exponential backoff with a cap at 10 seconds
    const delay = Math.min(times * 100 * Math.pow(2, Math.floor(times / 5)), 10000);
    return delay;
  },
});

let connectionErrorCount = 0;

redis.on('connect', () => {
  logger.info('Redis connected', { url: REDIS_URL });
  connectionErrorCount = 0; // Reset counter on success
});

redis.on('error', (err) => {
  connectionErrorCount++;
  // Only log every 10th failure to reduce noise, unless it's the first one
  if (connectionErrorCount === 1 || connectionErrorCount % 10 === 0) {
    logger.error('Redis connection error (throttled)', { 
      error: err.message, 
      attempt: connectionErrorCount 
    });
  }
});

export default redis;
