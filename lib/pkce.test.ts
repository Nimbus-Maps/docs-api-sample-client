import crypto from 'crypto';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';

describe('PKCE Utilities', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a string of correct length', () => {
      const verifier = generateCodeVerifier();
      // Base64URL encoded 32 bytes should be 43 characters (without padding)
      expect(verifier).toHaveLength(43);
    });

    it('should generate unique values on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should only contain URL-safe base64 characters', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should not contain padding characters', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).not.toContain('=');
    });

    it('should not contain + or / characters', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).not.toContain('+');
      expect(verifier).not.toContain('/');
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate SHA256 hash of verifier', () => {
      const verifier = 'test-verifier';
      const challenge = generateCodeChallenge(verifier);

      // Manually compute expected hash
      const expectedHash = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(challenge).toBe(expectedHash);
    });

    it('should be deterministic for the same verifier', () => {
      const verifier = 'test-verifier';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should produce different challenges for different verifiers', () => {
      const challenge1 = generateCodeChallenge('verifier-1');
      const challenge2 = generateCodeChallenge('verifier-2');
      expect(challenge1).not.toBe(challenge2);
    });

    it('should only contain URL-safe base64 characters', () => {
      const challenge = generateCodeChallenge('test-verifier');
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should handle empty string verifier', () => {
      const challenge = generateCodeChallenge('');
      expect(challenge).toBeTruthy();
      expect(typeof challenge).toBe('string');
    });

    it('should handle special characters in verifier', () => {
      const challenge = generateCodeChallenge('verifier@with!special#chars');
      expect(challenge).toBeTruthy();
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('generateState', () => {
    it('should generate a string of correct length', () => {
      const state = generateState();
      // Base64URL encoded 32 bytes should be 43 characters (without padding)
      expect(state).toHaveLength(43);
    });

    it('should generate unique values on each call', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });

    it('should only contain URL-safe base64 characters', () => {
      const state = generateState();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should not contain padding characters', () => {
      const state = generateState();
      expect(state).not.toContain('=');
    });
  });

  describe('Integration: PKCE flow', () => {
    it('should generate valid verifier and challenge pair', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      // Verify challenge is not the same as verifier
      expect(challenge).not.toBe(verifier);

      // Verify challenge can be reproduced from verifier
      const challengeAgain = generateCodeChallenge(verifier);
      expect(challenge).toBe(challengeAgain);
    });

    it('should generate state independently from PKCE values', () => {
      const state = generateState();
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);

      // All three should be different
      expect(state).not.toBe(verifier);
      expect(state).not.toBe(challenge);
      expect(verifier).not.toBe(challenge);
    });
  });
});
