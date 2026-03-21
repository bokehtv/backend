import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';
import { errorResponse } from './response';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Missing or invalid authorization header'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    res.locals.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired access token'));
  }
}
