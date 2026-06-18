import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  createDocumentApiClient,
  checkAvailability,
  purchaseDocuments,
  getOrderStatus,
  subscribeWebhook,
  unsubscribeWebhook,
  downloadDocument,
  verifyOwnership,
} from './api-client';

// Helper to create mock API error
const createMockApiError = (code = 'INTERNAL_ERROR', message = 'An error occurred') => ({
  error: {
    code,
    message,
    details: [],
  },
});

// Helper to build a mock axios client that includes interceptors (createDocumentApiClient registers them)
const mockClient = (methods: Record<string, jest.Mock> = {}): AxiosInstance =>
  ({
    ...methods,
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  }) as unknown as AxiosInstance;

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client', () => {
  const accessToken = 'test-access-token';
  const mockBaseURL = 'http://localhost:3001';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DOCUMENT_API_URL = mockBaseURL;
  });

  afterEach(() => {
    delete process.env.DOCUMENT_API_URL;
  });

  describe('createDocumentApiClient', () => {
    it('should create axios client with correct configuration', () => {
      const mockCreate = jest.fn().mockReturnValue(mockClient());
      mockedAxios.create = mockCreate;

      createDocumentApiClient(accessToken);

      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: mockBaseURL,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should include bearer token in authorization header', () => {
      const mockCreate = jest.fn().mockReturnValue(mockClient());
      mockedAxios.create = mockCreate;

      createDocumentApiClient('my-token-123');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.headers.Authorization).toBe('Bearer my-token-123');
    });
  });

  describe('checkAvailability', () => {
    it('should make GET request with title_number parameter', async () => {
      const mockResponse = {
        data: {
          titleNumber: 'DN1234567',
          available: true,
          documents: [],
        },
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));

      const result = await checkAvailability(accessToken, { title_number: 'DN1234567' });

      expect(mockGet).toHaveBeenCalledWith('/check-availability', {
        params: { title_number: 'DN1234567' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should make GET request with title_id parameter', async () => {
      const mockResponse = {
        data: { titleId: '12345', available: true, documents: [] },
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));

      await checkAvailability(accessToken, { title_id: '12345' });

      expect(mockGet).toHaveBeenCalledWith('/check-availability', {
        params: { title_id: '12345' },
      });
    });

    it('should handle API error response', async () => {
      const mockError: AxiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: createMockApiError('TITLE_NOT_FOUND', 'Title not found'),
        },
      } as unknown as AxiosError;

      const mockGet = jest.fn().mockRejectedValue(mockError);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(checkAvailability(accessToken, { title_number: 'INVALID' })).rejects.toThrow(
        'TITLE_NOT_FOUND: Title not found'
      );
    });
  });

  describe('purchaseDocuments', () => {
    it('should make POST request with purchase data', async () => {
      const purchaseRequest = {
        title_number: 'DN1234567',
        documents: ['OC3', 'TITLE_PLAN'],
        customer_reference: 'REF-123',
      };

      const mockResponse = {
        data: {
          orderId: 'order-123',
          status: 'PROCESSING',
          documents: [],
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ post: mockPost }));

      const result = await purchaseDocuments(accessToken, purchaseRequest);

      expect(mockPost).toHaveBeenCalledWith('/purchase', purchaseRequest);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getOrderStatus', () => {
    it('should make GET request to orders endpoint', async () => {
      const mockResponse = {
        data: {
          orderId: 'order-123',
          status: 'COMPLETED',
          documents: [],
        },
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));

      const result = await getOrderStatus(accessToken, 'order-123');

      expect(mockGet).toHaveBeenCalledWith('/orders/order-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('subscribeWebhook', () => {
    it('should make POST request to subscribe endpoint', async () => {
      const subscriptionRequest = {
        webhook_url: 'https://example.com/webhooks',
      };

      const mockResponse = {
        data: {
          subscriptionId: 'sub-123',
          webhookUrl: subscriptionRequest.webhook_url,
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ post: mockPost }));

      const result = await subscribeWebhook(accessToken, subscriptionRequest);

      expect(mockPost).toHaveBeenCalledWith('/subscribe', subscriptionRequest);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('downloadDocument', () => {
    it('should make GET request to download endpoint', async () => {
      const mockResponse = {
        data: {
          content: 'base64-encoded-pdf',
          filename: 'document.pdf',
        },
      };

      const mockGet = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));

      const result = await downloadDocument(accessToken, 'doc-123');

      expect(mockGet).toHaveBeenCalledWith('/download/doc-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('verifyOwnership', () => {
    it('should make POST request to verify-ownership endpoint', async () => {
      const verifyRequest = {
        title_number: 'DN1234567',
        first_forename: 'John',
        surname: 'Smith',
      };

      const mockResponse = {
        data: {
          verified: true,
          titleNumber: 'DN1234567',
          ownershipDetails: {},
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ post: mockPost }));

      const result = await verifyOwnership(accessToken, verifyRequest);

      expect(mockPost).toHaveBeenCalledWith('/verify-ownership', verifyRequest);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Error handling', () => {
    it('should extract error code and message from API error response', async () => {
      const mockError: AxiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid title number format',
              details: ['Must be alphanumeric'],
            },
          },
        },
      } as unknown as AxiosError;

      const mockGet = jest.fn().mockRejectedValue(mockError);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));
      mockedAxios.isAxiosError.mockReturnValue(true);

      try {
        await checkAvailability(accessToken, { title_number: 'INVALID' });
        fail('Should have thrown error');
      } catch (error) {
        const e = error as Error & { code?: string; status?: number; details?: unknown };
        expect(e.message).toContain('INVALID_REQUEST');
        expect(e.message).toContain('Invalid title number format');
        expect(e.code).toBe('INVALID_REQUEST');
        expect(e.status).toBe(400);
        expect(e.details).toEqual(['Must be alphanumeric']);
      }
    });

    it('should handle network errors', async () => {
      const mockError = {
        isAxiosError: true,
        message: 'Network Error',
      } as AxiosError;

      const mockGet = jest.fn().mockRejectedValue(mockError);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(checkAvailability(accessToken, { title_number: 'DN1234567' })).rejects.toThrow(
        'Network Error'
      );
    });

    it('should preserve HTTP status when API error response has no error payload', async () => {
      const mockError: AxiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          data: {},
        },
      } as unknown as AxiosError;

      const mockDelete = jest.fn().mockRejectedValue(mockError);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ delete: mockDelete }));
      mockedAxios.isAxiosError.mockReturnValue(true);

      try {
        await unsubscribeWebhook(accessToken, 'missing-subscription');
        fail('Should have thrown error');
      } catch (error) {
        const e = error as Error & { status?: number };
        expect(e.message).toBe('Request failed with status code 404');
        expect(e.status).toBe(404);
      }
    });

    it('should handle unknown errors', async () => {
      const mockError = 'Unknown error string';

      const mockGet = jest.fn().mockRejectedValue(mockError);
      mockedAxios.create = jest.fn().mockReturnValue(mockClient({ get: mockGet }));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(checkAvailability(accessToken, { title_number: 'DN1234567' })).rejects.toThrow(
        'Unknown error occurred'
      );
    });
  });
});
