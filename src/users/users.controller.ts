import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { successResponse, errorResponse } from '../common/response';

export class UsersController {
  private usersService = new UsersService();

  getMe = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const user = await this.usersService.getUserProfile(userId);
      res.status(200).json(successResponse(user));
    } catch (error) {
      res.status(404).json(errorResponse('NOT_FOUND', (error as Error).message));
    }
  };
}
