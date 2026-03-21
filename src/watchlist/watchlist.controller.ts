import { Request, Response } from 'express';
import { WatchlistService, AddToWatchlistDto, UpdateWatchlistStatusDto } from './watchlist.service';
import { successResponse, errorResponse } from '../common/response';
import { ZodError } from 'zod';

export class WatchlistController {
  private watchlistService = new WatchlistService();

  getWatchlist = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const list = await this.watchlistService.getWatchlist(userId);
      res.status(200).json(successResponse(list));
    } catch (error) {
      res.status(500).json(errorResponse('SERVER_ERROR', (error as Error).message));
    }
  };

  addToWatchlist = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const data = AddToWatchlistDto.parse(req.body);
      const entry = await this.watchlistService.addToWatchlist(userId, data);
      res.status(201).json(successResponse(entry));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(errorResponse('VALIDATION_ERROR', error.issues[0].message));
      } else {
        res.status(400).json(errorResponse('BAD_REQUEST', (error as Error).message));
      }
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const watchlistId = req.params.id as string;
      const { status } = UpdateWatchlistStatusDto.parse(req.body);
      
      const updated = await this.watchlistService.updateStatus(userId, watchlistId, status);
      res.status(200).json(successResponse(updated));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(errorResponse('VALIDATION_ERROR', error.issues[0].message));
      } else {
        res.status(400).json(errorResponse('BAD_REQUEST', (error as Error).message));
      }
    }
  };

  removeFromWatchlist = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const watchlistId = req.params.id as string;
      await this.watchlistService.removeFromWatchlist(userId, watchlistId);
      res.status(200).json(successResponse(null));
    } catch (error) {
      res.status(400).json(errorResponse('BAD_REQUEST', (error as Error).message));
    }
  };
}
