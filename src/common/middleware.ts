import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';
import { errorResponse } from './response';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check Authorization Header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } 
  // 2. Fallback to Cookie (for SSR/F5 hydration)
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Missing or invalid authentication'));
  }

  try {
    const payload = verifyAccessToken(token);
    res.locals.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or expired access token'));
  }
}
