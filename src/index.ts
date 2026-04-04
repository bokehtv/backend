import 'dotenv/config';
import express from 'express';
import { authRouter } from './auth/auth.router';
import { contentRouter } from './content/content.router';
import { usersRouter } from './users/users.router';
import { watchlistRouter } from './watchlist/watchlist.router';
import { errorResponse } from './common/response';
import { generalRateLimiter } from './common/rate-limit';
import { logger } from './common/logger';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { metricsMiddleware } from './common/metrics';
import { loggerMiddleware } from './common/loggerMiddleware';

import { prisma } from './common/prisma';
import http from 'http';

const app = express();
app.set('trust proxy', 1);
app.use(cookieParser());

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: NODE_ENV === 'production' ? FRONTEND_URL : ['http://localhost:3000', FRONTEND_URL],
  credentials: true
}));

app.use(express.json());

// Telemetry & Logging
app.use(metricsMiddleware);
app.use(loggerMiddleware);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Apply general rate limiter to all API routes
app.use('/api/v1', generalRateLimiter);

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/watchlist', watchlistRouter);

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({
    message: 'Unhandled server error',
    error: err.message,
    stack: err.stack,
    url: req.originalUrl
  });
  res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', err.message));
});

let server: http.Server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }

  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { error: (err as Error).message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
