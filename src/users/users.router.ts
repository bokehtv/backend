import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware } from '../common/middleware';

export const usersRouter = Router();
const usersController = new UsersController();

// All user routes require authentication
usersRouter.use(authMiddleware);
usersRouter.get('/me', usersController.getMe);
