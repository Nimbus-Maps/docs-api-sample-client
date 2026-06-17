import { logHttpRequest, logHttpResponse, logHttpError } from './logger';

/**
 * Wrap the native fetch API with HTTP logging
 * Logs full request and response including headers and body
 *
 * @param input - Request URL or Request object
 * @param init - Request options
 * @returns Promise resolving to Response
 */
// OAuth / form params that must never appear in logs
const SENSITIVE_PARAMS = new Set([
  'code',
  'code_verifier',
  'client_secret',
  'refresh_token',
  'access_token',
  'password',
]);

/**
 * Redact sensitive OAuth parameters from a URL-encoded body string.
 */
function sanitizeBodyForLogging(body: string): string {
  try {
    const params = new URLSearchParams(body);
    const hasSensitive = [...params.keys()].some((k) => SENSITIVE_PARAMS.has(k));
    if (!hasSensitive) return body;
    for (const key of SENSITIVE_PARAMS) {
      if (params.has(key)) params.set(key, '[REDACTED]');
    }
    return params.toString();
  } catch {
    return body;
  }
}

function sanitizeParamsForLogging(params: Iterable<[string, FormDataEntryValue | string]>) {
  return Object.fromEntries(
    [...params].map(([key, value]) => [key, SENSITIVE_PARAMS.has(key) ? '[REDACTED]' : value])
  );
}

export async function loggedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const startTime = Date.now();

  // Extract URL and method for logging
  const url = input instanceof Request ? input.url : input.toString();
  const method = init?.method?.toUpperCase() || 'GET';

  // Extract headers for logging
  let headers: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      headers = { ...init.headers };
    }
  }

  // Log body if present (convert to string for logging)
  let bodyForLogging: unknown = undefined;
  if (init?.body) {
    if (typeof init.body === 'string') {
      bodyForLogging = sanitizeBodyForLogging(init.body);
    } else if (init.body instanceof URLSearchParams) {
      bodyForLogging = sanitizeParamsForLogging(init.body.entries());
    } else if (init.body instanceof FormData) {
      bodyForLogging = sanitizeParamsForLogging(init.body.entries());
    } else {
      bodyForLogging = '[Binary or Stream Data]';
    }
  }

  // Log the outgoing request
  logHttpRequest(method, url, headers, bodyForLogging);

  try {
    // Make the actual fetch call
    const response = await fetch(input, init);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    let responseData: unknown = undefined;

    try {
      // Try to parse as JSON
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await clonedResponse.json();
      } else if (contentType?.includes('text/')) {
        responseData = await clonedResponse.text();
      } else {
        responseData = `[Binary data: ${contentType || 'unknown type'}]`;
      }
    } catch {
      // If we can't read the body, just note it
      responseData = '[Unable to parse response body]';
    }

    // Log the response
    logHttpResponse(
      method,
      url,
      response.status,
      response.statusText,
      responseHeaders,
      responseData,
      duration
    );

    // Return the original response (not the cloned one)
    return response;
  } catch (error) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Log the error
    logHttpError(method, url, error, duration);

    // Re-throw the error
    throw error;
  }
}
