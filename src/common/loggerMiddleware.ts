import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import crypto from 'crypto';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.locals.requestId = requestId;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      message: 'HTTP Request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      requestId,
      durationMs: duration,
      ip: req.ip,
      userId: res.locals.user?.id || undefined,
      userAgent: req.headers['user-agent'] || '',
    });
  });

  next();
};
