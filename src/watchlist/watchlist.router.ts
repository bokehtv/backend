import { Router } from 'express';
import { WatchlistController } from './watchlist.controller';
import { authMiddleware } from '../common/middleware';

export const watchlistRouter = Router();
const watchlistController = new WatchlistController();

// Protect all watchlist routes
watchlistRouter.use(authMiddleware);

watchlistRouter.get('/', watchlistController.getWatchlist);
watchlistRouter.post('/', watchlistController.addToWatchlist);
watchlistRouter.put('/:id', watchlistController.updateStatus);
watchlistRouter.delete('/:id', watchlistController.removeFromWatchlist);
