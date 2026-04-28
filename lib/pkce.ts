import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 * @returns Base64 URL-encoded random string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Generate PKCE code challenge from code verifier
 * @param verifier - The code verifier
 * @returns Base64 URL-encoded SHA256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

/**
 * Base64 URL encode (without padding)
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  return base64URLEncode(crypto.randomBytes(32));
}
