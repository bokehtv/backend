import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();
const authController = new AuthController();

// @route   POST /api/v1/auth/register
router.post('/register', authController.register);

// @route   POST /api/v1/auth/login
router.post('/login', authController.login);

export { router as authRouter };
