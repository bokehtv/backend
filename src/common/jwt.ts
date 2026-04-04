import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (process.env.NODE_ENV === 'production' && (!ACCESS_SECRET || !REFRESH_SECRET)) {
  throw new Error('CRITICAL: JWT secrets are missing in production environment');
}

const FINAL_ACCESS_SECRET = ACCESS_SECRET || 'dev_access_secret';
const FINAL_REFRESH_SECRET = REFRESH_SECRET || 'dev_refresh_secret';

export interface JwtPayload {
  userId: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, FINAL_ACCESS_SECRET, { expiresIn: '1h' });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, FINAL_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, FINAL_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, FINAL_REFRESH_SECRET) as JwtPayload;
}
