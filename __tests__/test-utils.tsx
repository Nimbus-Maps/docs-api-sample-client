import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Keep cache forever in tests
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>;
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock session
export const createMockSession = (overrides = {}) => ({
  accessToken: 'mock-access-token',
  idToken: 'mock-id-token',
  expiresOn: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  account: {
    username: 'test@example.com',
    name: 'Test User',
    localAccountId: 'local-123',
    homeAccountId: 'home-123',
  },
  ...overrides,
});

// Helper to create mock API error
export const createMockApiError = (code = 'INTERNAL_ERROR', message = 'An error occurred') => ({
  error: {
    code,
    message,
    details: [],
  },
});
