import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.DOCUMENT_API_URL || 'http://localhost:3001';

export const handlers = [
  // Check availability endpoint
  http.get(`${API_BASE_URL}/check-availability`, () => {
    return HttpResponse.json({
      titleNumber: 'DN1234567',
      available: true,
      documents: [
        { id: 'OC3', name: 'Official Copy', price: 3.0 },
        { id: 'TITLE_PLAN', name: 'Title Plan', price: 3.0 },
      ],
    });
  }),

  // Purchase endpoint
  http.post(`${API_BASE_URL}/purchase`, async () => {
    return HttpResponse.json({
      orderId: 'order-123',
      status: 'PROCESSING',
      documents: [],
    });
  }),

  // Order status endpoint
  http.get(`${API_BASE_URL}/order/:orderId`, ({ params }) => {
    return HttpResponse.json({
      orderId: params.orderId,
      status: 'COMPLETED',
      documents: [
        {
          id: 'doc-123',
          type: 'OC3',
          status: 'READY',
          downloadUrl: '/download/doc-123',
        },
      ],
    });
  }),

  // Download endpoint
  http.get(`${API_BASE_URL}/download/:documentId`, () => {
    const mockPdf = Buffer.from('mock-pdf-content').toString('base64');
    return HttpResponse.json({
      content: mockPdf,
      filename: 'document.pdf',
    });
  }),

  // Webhook subscription endpoint
  http.post(`${API_BASE_URL}/subscribe`, () => {
    return HttpResponse.json({
      subscriptionId: 'sub-123',
      webhookUrl: 'http://localhost:3000/api/webhooks/documents',
    });
  }),

  // Verify ownership endpoint
  http.post(`${API_BASE_URL}/verify-ownership`, () => {
    return HttpResponse.json({
      verified: true,
      titleNumber: 'DN1234567',
      ownershipDetails: {
        matchScore: 95,
      },
    });
  }),

  // Error responses
  http.get(`${API_BASE_URL}/error`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred',
        },
      },
      { status: 500 }
    );
  }),
];

export const errorHandlers = [
  // Network error simulation
  http.get(`${API_BASE_URL}/network-error`, () => {
    return HttpResponse.error();
  }),

  // Unauthorized error
  http.get(`${API_BASE_URL}/unauthorized`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      },
      { status: 401 }
    );
  }),
];
