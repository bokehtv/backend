import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authRateLimiter } from '../common/rate-limit';

const router = Router();
const authController = new AuthController();

// @route   POST /api/v1/auth/register
// @desc    Register a new user
router.post('/register', authRateLimiter, authController.register);

// @route   POST /api/v1/auth/login
// @desc    Standard email/password login
router.post('/login', authRateLimiter, authController.login);

export { router as authRouter };
