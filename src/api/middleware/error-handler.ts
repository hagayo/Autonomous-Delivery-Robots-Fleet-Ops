import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/logger';

const logger = Logger.getInstance();

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(`API Error: ${error.message}`, {
    url: req.url,
    method: req.method,
    stack: error.stack
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
};