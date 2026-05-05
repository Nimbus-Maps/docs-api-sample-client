import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from './env';
import { logHttpRequest, logHttpResponse, logHttpError } from './logger';
import {
  AvailabilityCheckResponse,
  PurchaseRequest,
  PurchaseResponse,
  OrderStatusResponse,
  WebhookSubscriptionRequest,
  WebhookSubscriptionResponse,
  WebhookAuditRequest,
  WebhookAuditResponse,
  WebhookEventDetailsResponse,
  WebhookStatisticsRequest,
  WebhookStatisticsResponse,
  VerifyOwnershipRequest,
  VerifyOwnershipResponse,
  DocumentDownloadResponse,
  ApiErrorResponse,
} from './types';

/**
 * Create an axios client for the Document API with HTTP request/response logging
 * @param accessToken - The user's access token
 */
export function createDocumentApiClient(accessToken: string): AxiosInstance {
  const baseURL = env.DOCUMENT_API_URL;

  const client = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
  });

  // Request interceptor - log outgoing requests
  client.interceptors.request.use(
    (config) => {
      // Store request timestamp for duration calculation
      (config as unknown as Record<string, unknown>).requestStartTime = Date.now();

      // Log the request with full headers including Authorization
      logHttpRequest(
        config.method?.toUpperCase() || 'GET',
        config.baseURL ? `${config.baseURL}${config.url}` : config.url || '',
        config.headers as Record<string, string>,
        config.data
      );

      return config;
    },
    (error) => {
      logHttpError('UNKNOWN', 'Request interceptor error', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - log incoming responses
  client.interceptors.response.use(
    (response) => {
      // Calculate request duration
      const startTime = (response.config as unknown as Record<string, unknown>).requestStartTime;
      const duration = startTime ? Date.now() - (startTime as number) : undefined;

      // Log the response with full headers and data
      logHttpResponse(
        response.config.method?.toUpperCase() || 'GET',
        response.config.baseURL
          ? `${response.config.baseURL}${response.config.url}`
          : response.config.url || '',
        response.status,
        response.statusText,
        response.headers as Record<string, string>,
        response.data,
        duration
      );

      return response;
    },
    (error) => {
      // Calculate request duration
      const startTime = (error.config as Record<string, unknown>)?.requestStartTime;
      const duration = startTime ? Date.now() - (startTime as number) : undefined;

      // Log the error with full details
      logHttpError(
        error.config?.method?.toUpperCase() || 'UNKNOWN',
        error.config?.baseURL
          ? `${error.config.baseURL}${error.config.url}`
          : error.config?.url || 'UNKNOWN',
        error,
        duration
      );

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Check document availability for a title
 */
export async function checkAvailability(
  accessToken: string,
  params: { title_number?: string; title_id?: string }
): Promise<AvailabilityCheckResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.get<AvailabilityCheckResponse>('/check-availability', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Purchase documents for a title
 */
export async function purchaseDocuments(
  accessToken: string,
  request: PurchaseRequest
): Promise<PurchaseResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.post<PurchaseResponse>('/purchase', request);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get order status
 */
export async function getOrderStatus(
  accessToken: string,
  orderId: string
): Promise<OrderStatusResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.get<OrderStatusResponse>(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Subscribe to webhooks
 */
export async function subscribeWebhook(
  accessToken: string,
  request: WebhookSubscriptionRequest
): Promise<WebhookSubscriptionResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.post<WebhookSubscriptionResponse>('/subscribe', request);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Download a document
 */
export async function downloadDocument(
  accessToken: string,
  documentId: string
): Promise<DocumentDownloadResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.get<DocumentDownloadResponse>(`/download/${documentId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Verify ownership
 */
export async function verifyOwnership(
  accessToken: string,
  request: VerifyOwnershipRequest
): Promise<VerifyOwnershipResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.post<VerifyOwnershipResponse>('/verify-ownership', request);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Cancel a webhook subscription
 */
export async function unsubscribeWebhook(
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  const client = createDocumentApiClient(accessToken);

  try {
    await client.delete(`/subscriptions/${subscriptionId}`);
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get webhook delivery audit log
 */
export async function getWebhookAudit(
  accessToken: string,
  request: WebhookAuditRequest = {}
): Promise<WebhookAuditResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.post<WebhookAuditResponse>('/webhooks/audit', request);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get all delivery attempts for a specific webhook event
 */
export async function getWebhookEventDetails(
  accessToken: string,
  eventId: string
): Promise<WebhookEventDetailsResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.get<WebhookEventDetailsResponse>(`/webhooks/events/${eventId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get webhook delivery statistics for a date range
 */
export async function getWebhookStatistics(
  accessToken: string,
  request: WebhookStatisticsRequest
): Promise<WebhookStatisticsResponse> {
  const client = createDocumentApiClient(accessToken);

  try {
    const response = await client.post<WebhookStatisticsResponse>('/webhooks/statistics', request);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Handle API errors and convert to a consistent format
 */
function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response?.data?.error) {
      const apiError = axiosError.response.data.error;
      const message = `${apiError.code}: ${apiError.message}`;
      const err = new Error(message) as Error & { code: string; status: number; details: unknown };
      err.code = apiError.code;
      err.status = axiosError.response.status;
      err.details = apiError.details;
      return err;
    }

    return new Error(axiosError.message || 'API request failed');
  }

  return error instanceof Error ? error : new Error('Unknown error occurred');
}
