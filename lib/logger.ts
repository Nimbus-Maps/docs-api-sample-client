import pino from 'pino';
import { isDevelopment, isTest } from './env';

/**
 * Structured logger using Pino
 * Redacts sensitive information from logs
 * Note: pino-pretty transport is disabled to avoid worker thread issues with Next.js bundling
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // In test mode, disable logging to keep test output clean
  enabled: !isTest,
  // Use pretty formatting options for development (without transport/worker threads)
  ...(isDevelopment && {
    transport: undefined, // Disabled: causes worker thread errors with Next.js
  }),
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'idToken',
      'authorization',
      'cookie',
      'apiKey',
      'secret',
      'webhookSecret',
      'SESSION_SECRET',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.authorization',
      '*.cookie',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  // Add consistent base fields
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context
 * @param context - Additional fields to include in all log entries
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Log an error with structured context
 * @param error - The error object
 * @param message - Optional context message
 * @param context - Additional context fields
 */
export function logError(error: unknown, message?: string, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(
    {
      err,
      ...context,
    },
    message || err.message
  );
}

/**
 * Log a warning with structured context
 * @param message - The warning message
 * @param context - Additional context fields
 */
export function logWarn(message: string, context?: Record<string, unknown>) {
  logger.warn(context, message);
}

/**
 * Log an info message with structured context
 * @param message - The info message
 * @param context - Additional context fields
 */
export function logInfo(message: string, context?: Record<string, unknown>) {
  logger.info(context, message);
}

/**
 * Log a debug message with structured context
 * @param message - The debug message
 * @param context - Additional context fields
 */
export function logDebug(message: string, context?: Record<string, unknown>) {
  logger.debug(context, message);
}

/**
 * HTTP logger that does NOT redact authorization headers or tokens
 * Use this ONLY for debugging HTTP requests/responses
 * WARNING: This logger will expose sensitive credentials in logs
 */
export const httpLogger = pino({
  level: process.env.HTTP_LOG_LEVEL || process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  enabled: !isTest && (process.env.ENABLE_HTTP_LOGGING === 'true' || isDevelopment),
  // No redaction - logs full headers including Authorization
  base: {
    env: process.env.NODE_ENV,
    logger: 'http',
  },
});

/**
 * Log an HTTP request with full headers (including Authorization)
 * @param method - HTTP method
 * @param url - Request URL
 * @param headers - Request headers
 * @param body - Request body (optional)
 */
export function logHttpRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown
) {
  httpLogger.info({
    type: 'http_request',
    method,
    url,
    headers,
    body: body || undefined,
  }, `HTTP Request: ${method} ${url}`);
}

/**
 * Log an HTTP response with full headers
 * @param method - HTTP method
 * @param url - Request URL
 * @param status - Response status code
 * @param statusText - Response status text
 * @param headers - Response headers
 * @param data - Response data (optional)
 * @param duration - Request duration in ms (optional)
 */
export function logHttpResponse(
  method: string,
  url: string,
  status: number,
  statusText: string,
  headers: Record<string, string>,
  data?: unknown,
  duration?: number
) {
  httpLogger.info({
    type: 'http_response',
    method,
    url,
    status,
    statusText,
    headers,
    data: data || undefined,
    duration,
  }, `HTTP Response: ${method} ${url} - ${status} ${statusText}${duration ? ` (${duration}ms)` : ''}`);
}

/**
 * Log an HTTP error with full details
 * @param method - HTTP method
 * @param url - Request URL
 * @param error - Error object
 * @param duration - Request duration in ms (optional)
 */
export function logHttpError(
  method: string,
  url: string,
  error: unknown,
  duration?: number
) {
  const err = error as { message?: string; code?: string; response?: { status?: number; statusText?: string; headers?: Record<string, string>; data?: unknown } };
  httpLogger.error({
    type: 'http_error',
    method,
    url,
    error: {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      statusText: err.response?.statusText,
      headers: err.response?.headers,
      data: err.response?.data,
    },
    duration,
  }, `HTTP Error: ${method} ${url} - ${err.message ?? 'unknown'}${duration ? ` (${duration}ms)` : ''}`);
}
