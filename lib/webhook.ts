import crypto from 'crypto';
import { logError } from './logger';

/**
 * Verify HMAC-SHA256 webhook signature
 * @param payload - The webhook payload (as string)
 * @param signature - The signature from X-Webhook-Signature header
 * @param secret - The webhook secret
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature) {
      return false;
    }

    // Compute expected signature: HMAC-SHA256, Base64-encoded (no prefix)
    const expectedHash = crypto.createHmac('sha256', secret).update(payload).digest('base64');

    const expectedBuffer = Buffer.from(expectedHash);
    const providedBuffer = Buffer.from(signature);

    // Lengths must match before timingSafeEqual to avoid throwing
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    logError(error, 'Signature verification error');
    return false;
  }
}
