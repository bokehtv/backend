import express from 'express';
import { authRouter } from './auth/auth.router';
import { contentRouter } from './content/content.router';
import { usersRouter } from './users/users.router';
import { watchlistRouter } from './watchlist/watchlist.router';
import { errorResponse } from './common/response';
import { generalRateLimiter } from './common/rate-limit';
import { logger } from './common/logger';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Apply general rate limiter to all API routes
app.use('/api/v1', generalRateLimiter);

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/content', contentRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/watchlist', watchlistRouter);

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
