import { getSession, SessionData } from './session';
import { logWarn, logInfo } from './logger';

/**
 * Require authentication with proactive token expiry checking
 * Checks if token will expire soon and logs a warning
 */
export async function requireAuthWithRefresh(): Promise<SessionData & { accessToken: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.accessToken) {
    throw new Error('Unauthorized');
  }

  if (!session.expiresAt) {
    // No expiry time set, allow access but log warning
    logWarn('Access token has no expiry time', { sessionId: session.accessToken.substring(0, 10) });
    return session as SessionData & { accessToken: string };
  }

  const now = Date.now();
  const timeRemaining = session.expiresAt - now;

  // Token is expired
  if (timeRemaining <= 0) {
    logWarn('Access token is expired', {
      expiresAt: session.expiresAt,
      expiredSince: -timeRemaining,
    });
    throw new Error('Token expired');
  }

  // Token will expire soon (within 5 minutes)
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  if (timeRemaining < expiryBuffer) {
    logInfo('Access token expiring soon', {
      expiresAt: session.expiresAt,
      timeRemaining,
    });
    // Note: In a production app, you would trigger a silent token refresh here
    // For MSAL with confidential clients, this requires implementing a token cache
    // For now, we let it proceed and the user will be redirected to login when it expires
  }

  return session as SessionData & { accessToken: string };
}

/**
 * Check if the current session token is valid
 * @returns true if authenticated and token is not expired
 */
export function isTokenValid(session: SessionData): boolean {
  if (!session.isAuthenticated || !session.accessToken) {
    return false;
  }

  if (!session.expiresAt) {
    return true; // No expiry set, assume valid
  }

  return session.expiresAt > Date.now();
}

/**
 * Get time remaining until token expiration (in milliseconds)
 * @returns milliseconds until expiration, or null if no expiry is set
 */
export function getTokenTimeRemaining(session: SessionData): number | null {
  if (!session.expiresAt) {
    return null;
  }

  return Math.max(0, session.expiresAt - Date.now());
}
