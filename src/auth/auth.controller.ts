import { Request, Response } from 'express';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { successResponse, errorResponse } from '../common/response';
import { ZodError } from 'zod';

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response) => {
    try {
      const data = RegisterDto.parse(req.body);
      const user = await this.authService.register(data);
      res.status(201).json(successResponse(user));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(errorResponse('VALIDATION_ERROR', error.issues[0].message));
      } else {
        res.status(400).json(errorResponse('BAD_REQUEST', (error as Error).message));
      }
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const data = LoginDto.parse(req.body);
      
      const { user, accessToken, refreshToken } = await this.authService.login(data);
      
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Set the access token as cookie for F5 flicker prevention
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'strict',
        maxAge: 1 * 60 * 60 * 1000 // 1 hour
      });

      // Set the refresh token as HttpOnly cookie as locked in ADR-005
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json(successResponse({ user, accessToken }));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(errorResponse('VALIDATION_ERROR', error.issues[0].message));
      } else {
        res.status(400).json(errorResponse('BAD_REQUEST', (error as Error).message));
      }
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.refreshToken;
      
      if (!token) {
        return res.status(401).json(errorResponse('UNAUTHORIZED', 'Missing refresh token'));
      }

      const { user, accessToken, refreshToken } = await this.authService.refresh(token);
      
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'strict',
        maxAge: 1 * 60 * 60 * 1000
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json(successResponse({ user, accessToken }));
    } catch (error) {
      res.status(401).json(errorResponse('UNAUTHORIZED', (error as Error).message));
    }
  };

  logout = async (req: Request, res: Response) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
    } as const;

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.status(200).json(successResponse({ message: 'Logged out successfully' }));
  };
}
