import { loggedFetch } from './logged-fetch';
import {
  clearClientCredentialsTokenCache,
  ClientCredentialsAuthError,
  getClientCredentialsToken,
} from './client-credentials-token';

jest.mock('./env', () => ({
  env: {
    AZURE_TENANT_ID: 'test-tenant-id',
    DOCUMENT_API_AUTH_MODE: 'client_credentials',
    ENTRA_CLIENT_ID: 'test-entra-client-id',
    ENTRA_CLIENT_SECRET: 'test-entra-client-secret',
    DOCUMENT_API_SCOPE: 'api://test-api/.default',
  },
}));

jest.mock('./logged-fetch', () => ({
  loggedFetch: jest.fn(),
}));

jest.mock('./logger', () => ({
  logInfo: jest.fn(),
}));

const mockLoggedFetch = loggedFetch as jest.MockedFunction<typeof loggedFetch>;

function tokenResponse(accessToken: string, expiresIn = 3600): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      token_type: 'Bearer',
      expires_in: expiresIn,
      access_token: accessToken,
    }),
    text: jest.fn(),
  } as unknown as Response;
}

describe('client credentials token provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearClientCredentialsTokenCache();
  });

  it('requests a client credentials token with the configured scope', async () => {
    mockLoggedFetch.mockResolvedValue(tokenResponse('s2s-token'));

    const token = await getClientCredentialsToken();

    expect(token.accessToken).toBe('s2s-token');
    expect(mockLoggedFetch).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/test-tenant-id/oauth2/v2.0/token',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );

    const firstCall = mockLoggedFetch.mock.calls[0];
    expect(firstCall).toBeDefined();

    const body = firstCall![1]?.body;
    expect(typeof body).toBe('string');
    const params = new URLSearchParams(body as string);
    expect(params.get('client_id')).toBe('test-entra-client-id');
    expect(params.get('client_secret')).toBe('test-entra-client-secret');
    expect(params.get('grant_type')).toBe('client_credentials');
    expect(params.get('scope')).toBe('api://test-api/.default');
  });

  it('caches the token until shortly before expiry', async () => {
    mockLoggedFetch.mockResolvedValue(tokenResponse('cached-token'));

    const first = await getClientCredentialsToken();
    const second = await getClientCredentialsToken();

    expect(first.accessToken).toBe('cached-token');
    expect(second.accessToken).toBe('cached-token');
    expect(mockLoggedFetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent token requests', async () => {
    mockLoggedFetch.mockResolvedValue(tokenResponse('shared-token'));

    const [first, second] = await Promise.all([
      getClientCredentialsToken(),
      getClientCredentialsToken(),
    ]);

    expect(first.accessToken).toBe('shared-token');
    expect(second.accessToken).toBe('shared-token');
    expect(mockLoggedFetch).toHaveBeenCalledTimes(1);
  });

  it('throws a typed error when token acquisition fails', async () => {
    mockLoggedFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: 'invalid_client' }),
      text: jest.fn(),
    } as unknown as Response);

    await expect(getClientCredentialsToken()).rejects.toMatchObject({
      name: 'ClientCredentialsAuthError',
      code: 'TOKEN_ACQUISITION_FAILED',
      status: 502,
    } satisfies Partial<ClientCredentialsAuthError>);
  });
});
