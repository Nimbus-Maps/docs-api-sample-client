import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock environment variables
Object.assign(process.env, {
  NODE_ENV: 'test',
  AZURE_TENANT_ID: 'test-tenant-id',
  AZURE_CLIENT_ID: 'test-client-id',
  AZURE_REDIRECT_URI: 'http://localhost:3000/api/auth/callback',
  DOCUMENT_API_URL: 'http://localhost:3001',
  DOCUMENT_API_APP_ID: 'test-api-app-id',
  SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
});

// Suppress console errors in tests (unless debugging)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
