import { ErrorCode, ErrorCodes } from '../constants/errors';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, ErrorCodes.VALIDATION_ERROR, message, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(401, ErrorCodes.AUTHENTICATION_ERROR, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied: insufficient permissions') {
    super(403, ErrorCodes.AUTHORIZATION_ERROR, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, ErrorCodes.NOT_FOUND, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(409, ErrorCodes.CONFLICT_ERROR, message);
  }
}

export class FileUploadError extends AppError {
  constructor(message = 'File upload failed', statusCode = 400) {
    super(statusCode, ErrorCodes.FILE_UPLOAD_ERROR, message);
  }
}

export class MLServiceError extends AppError {
  constructor(message = 'ML service error occurred', details?: unknown) {
    super(502, ErrorCodes.ML_SERVICE_ERROR, message, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(500, ErrorCodes.DATABASE_ERROR, message);
  }
}
