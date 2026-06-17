import { getSession, requireAuth, SessionData } from './session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { loadSession } from './session-store';

// Mock iron-session, next/headers, and the file-backed session store
jest.mock('iron-session');
jest.mock('next/headers');
jest.mock('./session-store');

const mockGetIronSession = getIronSession as jest.MockedFunction<typeof getIronSession>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockLoadSession = loadSession as jest.MockedFunction<typeof loadSession>;

describe('Session Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue({} as unknown as Awaited<ReturnType<typeof cookies>>);
    // Cookie session only holds a sessionId; save() is called internally
    mockGetIronSession.mockResolvedValue({
      sessionId: 'test-session-id',
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as Awaited<ReturnType<typeof getIronSession>>);
    // Default: session data not found in store
    mockLoadSession.mockResolvedValue(null);
  });

  describe('getSession', () => {
    it('should call getIronSession with correct parameters', async () => {
      const mockSessionData: SessionData = {
        isAuthenticated: false,
      };

      mockLoadSession.mockResolvedValue(mockSessionData);

      const session = await getSession();

      expect(mockCookies).toHaveBeenCalled();
      expect(mockGetIronSession).toHaveBeenCalled();
      expect(session).toMatchObject(mockSessionData);
    });

    it('should use correct session options', async () => {
      mockLoadSession.mockResolvedValue({ isAuthenticated: true, accessToken: 'test-token' });

      await getSession();

      const callArgs = mockGetIronSession.mock.calls[0];
      expect(callArgs).toBeDefined();
      const sessionOptions = callArgs![1] as unknown as Record<string, unknown>;

      expect(sessionOptions).toHaveProperty('cookieName', 'nimbus_docs_session');
      expect(sessionOptions).toHaveProperty('cookieOptions');
      expect(sessionOptions.cookieOptions).toHaveProperty('httpOnly', true);
      expect(sessionOptions.cookieOptions).toHaveProperty('sameSite', 'lax');
      expect(sessionOptions.cookieOptions).toHaveProperty('path', '/');
    });
  });

  describe('requireAuth', () => {
    it('should return session data when authenticated with valid token', async () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const mockSessionData: SessionData = {
        isAuthenticated: true,
        accessToken: 'valid-token',
        expiresAt: futureTime,
      };

      mockLoadSession.mockResolvedValue(mockSessionData);

      const result = await requireAuth();

      expect(result).toMatchObject(mockSessionData);
      expect(result.accessToken).toBe('valid-token');
    });

    it('should throw error when not authenticated', async () => {
      mockLoadSession.mockResolvedValue({ isAuthenticated: false });

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when access token is missing', async () => {
      mockLoadSession.mockResolvedValue({ isAuthenticated: true });

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when token is expired', async () => {
      const pastTime = Date.now() - 3600000; // 1 hour ago
      mockLoadSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'expired-token',
        expiresAt: pastTime,
      });

      await expect(requireAuth()).rejects.toThrow('Token expired');
    });

    it('should not throw error when expiresAt is undefined', async () => {
      mockLoadSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'valid-token',
        // expiresAt is undefined
      });

      const result = await requireAuth();
      expect(result.accessToken).toBe('valid-token');
    });

    it('should allow token that expires exactly now', async () => {
      const now = Date.now();
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      mockLoadSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'valid-token',
        expiresAt: now,
      });

      try {
        // Token expired if expiresAt < Date.now(), so equal should pass
        const result = await requireAuth();
        expect(result.accessToken).toBe('valid-token');
      } finally {
        dateNowSpy.mockRestore();
      }
    });
  });

  describe('Session data structure', () => {
    it('should support all session fields', async () => {
      const completeSession: SessionData = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
        idToken: 'id-token-789',
        pkceVerifier: 'verifier-abc',
        webhookSecret: 'webhook-secret-xyz',
        webhookSubscriptionId: 'sub-123',
        isAuthenticated: true,
      };

      mockLoadSession.mockResolvedValue(completeSession);

      const session = await getSession();

      expect(session).toMatchObject(completeSession);
      expect(session.accessToken).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
      expect(session.pkceVerifier).toBeTruthy();
    });
  });
});
