import { rateLimit } from 'express-rate-limit';
import { logger } from './logger';
import { errorResponse } from './response';

/**
 * Common rate limiter specifically for authentication endpoints.
 * Limits each IP to 10 requests per 15 minutes window for auth actions.
 */
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 10, // Limit each IP to 10 requests per `window`
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        logger.warn({
            message: 'Auth rate limit exceeded',
            ip: req.ip,
            url: req.originalUrl,
            headers: req.headers
        });
        
        res.status(options.statusCode).json(errorResponse('RATE_LIMIT_EXCEEDED', options.message));
    },
	message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
});

/**
 * General rate limiter for all other API endpoints.
 * Looser constraints — typically 100 requests per 15 minutes.
 */
export const generalRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 100,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn({
            message: 'General rate limit exceeded',
            ip: req.ip,
            url: req.originalUrl
        });
        
        res.status(options.statusCode).json(errorResponse('RATE_LIMIT_EXCEEDED', options.message));
    },
	message: 'Too many requests from this IP, please try again later',
});
