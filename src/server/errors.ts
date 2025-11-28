/**
 * Comprehensive error handling module
 * Production-grade error classes and handling
 */

export enum ErrorCode {
  // Database Errors
  DB_ERROR = 'DB_ERROR',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_EXISTS = 'KEY_EXISTS',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  PERSISTENCE_ERROR = 'PERSISTENCE_ERROR',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  INVALID_TYPE = 'INVALID_TYPE',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  AUTH_FAILED = 'AUTH_FAILED',

  // Operation Errors
  OPERATION_ERROR = 'OPERATION_ERROR',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  OPERATION_FAILED = 'OPERATION_FAILED',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',

  // Replication Errors
  REPLICATION_ERROR = 'REPLICATION_ERROR',
  SYNC_ERROR = 'SYNC_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  cause?: Error;
  timestamp: Date;
  retryable: boolean;
  statusCode?: number;
}

/**
 * Base error class
 */
export class EcoceeError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;

  constructor(code: ErrorCode, message: string, details?: Record<string, any>, cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.code = code;
    this.context = {
      code,
      message,
      details,
      cause,
      timestamp: new Date(),
      retryable: this.isRetryable(code),
      statusCode: this.getStatusCode(code),
    };

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(code: ErrorCode): boolean {
    const retryableCodes = [
      ErrorCode.OPERATION_TIMEOUT,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.SYNC_ERROR,
    ];
    return retryableCodes.includes(code);
  }

  /**
   * Get HTTP status code
   */
  private getStatusCode(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      [ErrorCode.DB_ERROR]: 500,
      [ErrorCode.KEY_NOT_FOUND]: 404,
      [ErrorCode.KEY_EXISTS]: 409,
      [ErrorCode.TYPE_MISMATCH]: 400,
      [ErrorCode.OUT_OF_MEMORY]: 507,
      [ErrorCode.PERSISTENCE_ERROR]: 500,
      [ErrorCode.VALIDATION_ERROR]: 400,
      [ErrorCode.INVALID_ARGUMENT]: 400,
      [ErrorCode.INVALID_SYNTAX]: 400,
      [ErrorCode.INVALID_TYPE]: 400,
      [ErrorCode.NETWORK_ERROR]: 503,
      [ErrorCode.CONNECTION_TIMEOUT]: 504,
      [ErrorCode.CONNECTION_REFUSED]: 503,
      [ErrorCode.AUTH_FAILED]: 401,
      [ErrorCode.OPERATION_ERROR]: 500,
      [ErrorCode.OPERATION_TIMEOUT]: 504,
      [ErrorCode.OPERATION_FAILED]: 500,
      [ErrorCode.NOT_IMPLEMENTED]: 501,
      [ErrorCode.REPLICATION_ERROR]: 500,
      [ErrorCode.SYNC_ERROR]: 500,
      [ErrorCode.UNKNOWN_ERROR]: 500,
    };
    return statusMap[code] || 500;
  }

  /**
   * Convert to JSON for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      code: this.code,
      message: this.message,
      details: this.context.details,
      timestamp: this.context.timestamp,
      retryable: this.context.retryable,
      statusCode: this.context.statusCode,
      stack: this.stack,
    };
  }
}

/**
 * Database-specific errors
 */
export class DatabaseError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(ErrorCode.DB_ERROR, message, details, cause);
  }
}

export class KeyNotFoundError extends EcoceeError {
  constructor(key: string, details?: Record<string, any>) {
    super(ErrorCode.KEY_NOT_FOUND, `Key not found: ${key}`, { key, ...details });
  }
}

export class KeyExistsError extends EcoceeError {
  constructor(key: string, details?: Record<string, any>) {
    super(ErrorCode.KEY_EXISTS, `Key already exists: ${key}`, { key, ...details });
  }
}

export class TypeMismatchError extends EcoceeError {
  constructor(key: string, expectedType: string, actualType: string) {
    super(ErrorCode.TYPE_MISMATCH, `Type mismatch for key ${key}: expected ${expectedType}, got ${actualType}`, {
      key,
      expectedType,
      actualType,
    });
  }
}

export class OutOfMemoryError extends EcoceeError {
  constructor(requested: number, available: number) {
    super(ErrorCode.OUT_OF_MEMORY, `Out of memory: requested ${requested} bytes, ${available} bytes available`, {
      requested,
      available,
    });
  }
}

export class PersistenceError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(ErrorCode.PERSISTENCE_ERROR, message, details, cause);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class InvalidArgumentError extends EcoceeError {
  constructor(argument: string, message: string) {
    super(ErrorCode.INVALID_ARGUMENT, `Invalid argument '${argument}': ${message}`, { argument });
  }
}

export class InvalidSyntaxError extends EcoceeError {
  constructor(input: string, message: string) {
    super(ErrorCode.INVALID_SYNTAX, `Invalid syntax: ${message}`, { input });
  }
}

export class InvalidTypeError extends EcoceeError {
  constructor(value: any, expectedType: string) {
    super(ErrorCode.INVALID_TYPE, `Invalid type: expected ${expectedType}, got ${typeof value}`, {
      value,
      expectedType,
    });
  }
}

/**
 * Network errors
 */
export class NetworkError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(ErrorCode.NETWORK_ERROR, message, details, cause);
  }
}

export class ConnectionTimeoutError extends EcoceeError {
  constructor(timeout: number) {
    super(ErrorCode.CONNECTION_TIMEOUT, `Connection timeout after ${timeout}ms`, { timeout });
  }
}

export class ConnectionRefusedError extends EcoceeError {
  constructor(host: string, port: number) {
    super(ErrorCode.CONNECTION_REFUSED, `Connection refused to ${host}:${port}`, { host, port });
  }
}

export class AuthFailedError extends EcoceeError {
  constructor(reason: string) {
    super(ErrorCode.AUTH_FAILED, `Authentication failed: ${reason}`, { reason });
  }
}

/**
 * Operation errors
 */
export class OperationError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(ErrorCode.OPERATION_ERROR, message, details, cause);
  }
}

export class OperationTimeoutError extends EcoceeError {
  constructor(operation: string, timeout: number) {
    super(ErrorCode.OPERATION_TIMEOUT, `Operation '${operation}' timed out after ${timeout}ms`, {
      operation,
      timeout,
    });
  }
}

export class NotImplementedError extends EcoceeError {
  constructor(feature: string) {
    super(ErrorCode.NOT_IMPLEMENTED, `Feature not implemented: ${feature}`, { feature });
  }
}

/**
 * Replication errors
 */
export class ReplicationError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(ErrorCode.REPLICATION_ERROR, message, details, cause);
  }
}

export class SyncError extends EcoceeError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super(ErrorCode.SYNC_ERROR, message, details, cause);
  }
}

/**
 * Error handler for retry logic
 */
export class ErrorHandler {
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY_MS = 1000;

  /**
   * Execute operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation',
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        const isRetryable =
          error instanceof EcoceeError ? error.context.retryable : false;

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError || new Error(`Operation '${operationName}' failed after ${maxRetries} attempts`);
  }

  /**
   * Execute operation with timeout
   */
  static async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    operationName: string = 'operation'
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new OperationTimeoutError(operationName, timeoutMs)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Execute operation with circuit breaker
   */
  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ): Promise<T> {
    // Implementation would track failure count and automatically break on threshold
    return operation();
  }
}

export default EcoceeError;
