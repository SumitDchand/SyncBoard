import { Request, Response, NextFunction } from 'express';
import { ApiError, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  logger.error(`${req.method} ${req.url} - Error: ${err.message}`, {
    stack: err.stack,
    errors: err.errors,
  });

  // Handle custom ApiError
  if (err instanceof ApiError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    sendError(res, `Duplicate value entered for ${field}. Please use another value.`, 409);
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(res, `Resource not found with id of ${err.value}`, 404);
    return;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el: any) => ({
      field: el.path,
      message: el.message,
    }));
    sendError(res, 'Validation Error', 400, errors);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid authentication token', 401);
    return;
  }
  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Token has expired', 401);
    return;
  }

  // Fallback for unhandled internal server error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  sendError(res, message, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 404);
};

