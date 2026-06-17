import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { env, isProduction } from './env';
import {
  loadSession,
  saveSession as saveSessionToStore,
  deleteSession as deleteSessionFromStore,
  generateSessionId,
  cleanupExpiredSessions,
} from './session-store';

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  idToken?: string;
  pkceVerifier?: string;
  oauthState?: string;
  webhookSecret?: string;
  webhookSubscriptionId?: string;
  isAuthenticated: boolean;
}

/**
 * Cookie session data - only stores the session ID
 */
interface CookieSession {
  sessionId?: string;
}

const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: 'nimbus_docs_session',
  cookieOptions: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

/**
 * Extended session with save and destroy methods
 */
export interface ExtendedSession extends SessionData {
  save(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * Get the current session from cookies and file storage
 */
export async function getSession(): Promise<ExtendedSession> {
  const cookieStore = await cookies();
  const cookieSession = await getIronSession<CookieSession>(cookieStore, sessionOptions);

  // Periodically cleanup old sessions (1% chance on each call)
  if (Math.random() < 0.01) {
    cleanupExpiredSessions().catch(() => {
      // Ignore cleanup errors
    });
  }

  // Load session data from file system or create new session
  let sessionData: SessionData;
  let sessionId = cookieSession.sessionId;

  if (sessionId) {
    const loadedData = await loadSession(sessionId);
    if (loadedData) {
      sessionData = loadedData;
    } else {
      // Session expired or doesn't exist, create new
      sessionId = generateSessionId();
      cookieSession.sessionId = sessionId;
      await cookieSession.save();
      sessionData = { isAuthenticated: false };
    }
  } else {
    // No session ID in cookie, create new
    sessionId = generateSessionId();
    cookieSession.sessionId = sessionId;
    await cookieSession.save();
    sessionData = { isAuthenticated: false };
  }

  // Create extended session with save/destroy methods
  const extendedSession: ExtendedSession = {
    ...sessionData,
    save: async function () {
      await saveSessionToStore(sessionId!, this as SessionData);
    },
    destroy: async function () {
      await deleteSessionFromStore(sessionId!);
      cookieSession.sessionId = undefined;
      await cookieSession.save();
    },
  };

  return extendedSession;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<ExtendedSession & { accessToken: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.accessToken) {
    throw new Error('Unauthorized');
  }

  // Check if token is expired
  if (session.expiresAt && session.expiresAt < Date.now()) {
    throw new Error('Token expired');
  }

  return session as ExtendedSession & { accessToken: string };
}

/**
 * Periodically cleanup old sessions (call this from a cron job or on server start)
 */
export async function cleanupSessions(): Promise<void> {
  await cleanupExpiredSessions();
}
