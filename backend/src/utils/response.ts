import { Response } from 'express';

export class ApiError extends Error {
  statusCode: number;
  errors?: unknown[];

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: Record<string, unknown>
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const sendError = (
  res: Response,
  message: string = 'Internal Server Error',
  statusCode: number = 500,
  errors?: unknown[]
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

