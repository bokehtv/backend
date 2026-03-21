import { Request, Response } from 'express';
import { ContentService, SearchQuerySchema } from './content.service';
import { successResponse, errorResponse } from '../common/response';
import { ZodError } from 'zod';

export class ContentController {
  private contentService = new ContentService();

  search = async (req: Request, res: Response) => {
    try {
      // Validate query parameters
      const { query, page } = SearchQuerySchema.parse(req.query);
      
      const { results, meta } = await this.contentService.searchMulti(query, page);
      
      res.status(200).json(successResponse(results, meta));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(errorResponse('VALIDATION_ERROR', error.issues[0].message));
      } else {
        const message = (error as Error).message;
        const statusCode = message.includes('TMDB_API_KEY is not configured') ? 500 : 400;
        res.status(statusCode).json(errorResponse(statusCode === 500 ? 'SERVER_ERROR' : 'BAD_REQUEST', message));
      }
    }
  };
}
