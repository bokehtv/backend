import express from 'express';
import { authRouter } from './auth/auth.router';
import { contentRouter } from './content/content.router';
import { errorResponse } from './common/response';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/content', contentRouter);

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', err.message));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
