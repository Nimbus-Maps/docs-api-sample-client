import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { SessionData } from './session';

/**
 * File-based session storage
 * Stores session data in .sessions directory to avoid cookie size limits
 */

const SESSIONS_DIR = join(process.cwd(), '.sessions');
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Ensure sessions directory exists
 */
async function ensureSessionsDir(): Promise<void> {
  try {
    await mkdir(SESSIONS_DIR, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
}

/**
 * Generate a secure random session ID
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get session file path for a session ID
 */
function getSessionPath(sessionId: string): string {
  // Sanitize session ID to prevent directory traversal
  const sanitized = sessionId.replace(/[^a-zA-Z0-9]/g, '');
  return join(SESSIONS_DIR, `${sanitized}.json`);
}

/**
 * Load session data from file system
 */
export async function loadSession(sessionId: string): Promise<SessionData | null> {
  if (!sessionId) {
    return null;
  }

  try {
    const sessionPath = getSessionPath(sessionId);
    const data = await readFile(sessionPath, 'utf-8');
    const sessionData = JSON.parse(data);

    // Check if session has expired
    if (sessionData._expiresAt && sessionData._expiresAt < Date.now()) {
      await deleteSession(sessionId);
      return null;
    }

    return sessionData;
  } catch (error) {
    // Session file doesn't exist or is invalid
    return null;
  }
}

/**
 * Save session data to file system
 */
export async function saveSession(sessionId: string, data: SessionData): Promise<void> {
  await ensureSessionsDir();

  const sessionPath = getSessionPath(sessionId);
  const sessionData = {
    ...data,
    _expiresAt: Date.now() + SESSION_MAX_AGE,
  };

  await writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
}

/**
 * Delete session data from file system
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    return;
  }

  try {
    const sessionPath = getSessionPath(sessionId);
    await unlink(sessionPath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await ensureSessionsDir();
    const files = await readdir(SESSIONS_DIR);
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = join(SESSIONS_DIR, file);
      try {
        const data = await readFile(filePath, 'utf-8');
        const sessionData = JSON.parse(data);

        if (sessionData._expiresAt && sessionData._expiresAt < now) {
          await unlink(filePath);
        }
      } catch (error) {
        // If we can't read/parse the file, delete it
        try {
          await unlink(filePath);
        } catch {
          // Ignore deletion errors
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}
