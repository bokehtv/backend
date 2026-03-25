import { Router } from 'express';
import { ContentController } from './content.controller';

export const contentRouter = Router();
const contentController = new ContentController();

contentRouter.get('/search', contentController.search);
contentRouter.get('/trending', contentController.getTrending);
