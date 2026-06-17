import { env } from './env';
import { loggedFetch } from './logged-fetch';
import { logInfo } from './logger';

interface ClientCredentialsTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
}

export interface CachedClientCredentialsToken {
  accessToken: string;
  expiresAt: number;
}

export class ClientCredentialsAuthError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = 'TOKEN_ACQUISITION_FAILED', status = 502, details?: unknown) {
    super(message);
    this.name = 'ClientCredentialsAuthError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

let cachedToken: CachedClientCredentialsToken | null = null;
let inFlightTokenRequest: Promise<CachedClientCredentialsToken> | null = null;

/**
 * Clear the in-memory S2S token cache. Primarily useful for tests.
 */
export function clearClientCredentialsTokenCache(): void {
  cachedToken = null;
  inFlightTokenRequest = null;
}

/**
 * Get a bearer token for Document API server-to-server calls.
 */
export async function getClientCredentialsToken(): Promise<CachedClientCredentialsToken> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken;
  }

  if (inFlightTokenRequest) {
    return inFlightTokenRequest;
  }

  inFlightTokenRequest = acquireClientCredentialsToken().finally(() => {
    inFlightTokenRequest = null;
  });

  return inFlightTokenRequest;
}

async function acquireClientCredentialsToken(): Promise<CachedClientCredentialsToken> {
  const clientId = env.ENTRA_CLIENT_ID;
  const clientSecret = env.ENTRA_CLIENT_SECRET;
  const scope = env.DOCUMENT_API_SCOPE;

  if (!clientId || !clientSecret || !scope) {
    throw new ClientCredentialsAuthError(
      'Client credentials auth is not fully configured',
      'AUTH_CONFIGURATION_ERROR',
      500
    );
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const tokenRequestBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope,
  });

  logInfo('Acquiring Document API client credentials token', {
    endpoint: tokenEndpoint,
    scope,
  });

  const response = await loggedFetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenRequestBody.toString(),
  });

  if (!response.ok) {
    const errorData = await parseTokenError(response);
    throw new ClientCredentialsAuthError(
      `Token acquisition failed: ${response.status}`,
      'TOKEN_ACQUISITION_FAILED',
      502,
      errorData
    );
  }

  const tokenResponse = (await response.json()) as Partial<ClientCredentialsTokenResponse>;
  if (!tokenResponse.access_token || typeof tokenResponse.expires_in !== 'number') {
    throw new ClientCredentialsAuthError(
      'Token acquisition response did not include an access token and expiry',
      'TOKEN_RESPONSE_INVALID',
      502
    );
  }

  const expiresInMs = tokenResponse.expires_in * 1000;
  const usableLifetimeMs = Math.max(0, expiresInMs - TOKEN_REFRESH_BUFFER_MS);

  cachedToken = {
    accessToken: tokenResponse.access_token,
    expiresAt: Date.now() + usableLifetimeMs,
  };

  return cachedToken;
}

async function parseTokenError(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return undefined;
    }
  }
}
