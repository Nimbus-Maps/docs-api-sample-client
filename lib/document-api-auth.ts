import { getClientCredentialsToken } from './client-credentials-token';
import { env } from './env';
import { requireAuth } from './session';
import type { ExtendedSession } from './session';

export type DocumentApiAuthMode = 'obo' | 'client_credentials';

export interface DocumentApiAuthContext {
  accessToken: string;
  expiresAt?: number;
  mode: DocumentApiAuthMode;
  session?: ExtendedSession;
}

/**
 * Resolve the bearer token that should be used for outbound Document API calls.
 */
export async function requireDocumentApiAuth(): Promise<DocumentApiAuthContext> {
  if (env.DOCUMENT_API_AUTH_MODE === 'client_credentials') {
    const token = await getClientCredentialsToken();

    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      mode: 'client_credentials',
    };
  }

  const session = await requireAuth();

  return {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    mode: 'obo',
    session,
  };
}

export function getDocumentApiAuthMode(): DocumentApiAuthMode {
  return env.DOCUMENT_API_AUTH_MODE;
}

export function isClientCredentialsMode(): boolean {
  return env.DOCUMENT_API_AUTH_MODE === 'client_credentials';
}
