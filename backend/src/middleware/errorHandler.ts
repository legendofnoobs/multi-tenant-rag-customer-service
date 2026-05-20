import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.id || 'unknown';

  if (err instanceof AppError) {
    logger.warn({ requestId, statusCode: err.statusCode, code: err.code }, err.message);
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  logger.error({ requestId, err }, 'Unhandled error');
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};
