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

const app = express();
app.use(cookieParser());
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: NODE_ENV === 'production' ? FRONTEND_URL : ['http://localhost:3000', FRONTEND_URL],
  credentials: true
}));

app.use(express.json());

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

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
