import { verifyWebhookSignature } from './webhook';
import crypto from 'crypto';

describe('Webhook Utilities', () => {
  describe('verifyWebhookSignature', () => {
    const secret = 'test-webhook-secret';
    const payload = JSON.stringify({ event: 'order.completed', orderId: '123' });

    function createSignature(payload: string, secret: string): string {
      return crypto.createHmac('sha256', secret).update(payload).digest('base64');
    }

    it('should return true for valid signature', () => {
      const signature = createSignature(payload, secret);
      const result = verifyWebhookSignature(payload, signature, secret);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const signature = 'aW52YWxpZC1oYXNo'; // valid base64 but wrong hash
      const result = verifyWebhookSignature(payload, signature, secret);
      expect(result).toBe(false);
    });

    it('should return false for signature with wrong secret', () => {
      const wrongSecret = 'wrong-secret';
      const signature = createSignature(payload, wrongSecret);
      const result = verifyWebhookSignature(payload, signature, secret);
      expect(result).toBe(false);
    });

    it('should return false for signature with wrong payload', () => {
      const wrongPayload = JSON.stringify({ event: 'different.event' });
      const signature = createSignature(payload, secret);
      const result = verifyWebhookSignature(wrongPayload, signature, secret);
      expect(result).toBe(false);
    });

    it('should return false for a signature that is the wrong length', () => {
      const signature = 'tooshort';
      const result = verifyWebhookSignature(payload, signature, secret);
      expect(result).toBe(false);
    });

    it('should return false for empty signature', () => {
      const result = verifyWebhookSignature(payload, '', secret);
      expect(result).toBe(false);
    });

    it('should handle empty payload', () => {
      const emptyPayload = '';
      const signature = createSignature(emptyPayload, secret);
      const result = verifyWebhookSignature(emptyPayload, signature, secret);
      expect(result).toBe(true);
    });

    it('should use timing-safe comparison', () => {
      const signature = createSignature(payload, secret);

      // Create a signature that differs by one character
      const tampered = signature.slice(0, -1) + (signature.slice(-1) === 'a' ? 'b' : 'a');

      const result = verifyWebhookSignature(payload, tampered, secret);
      expect(result).toBe(false);
    });

    it('should be case-sensitive for hash comparison', () => {
      const signature = createSignature(payload, secret);
      const uppercaseSignature = signature.toUpperCase();

      // Hashes are hex, so uppercase should fail
      const result = verifyWebhookSignature(payload, uppercaseSignature, secret);
      expect(result).toBe(false);
    });

    it('should verify signature for complex JSON payloads', () => {
      const complexPayload = JSON.stringify({
        event: 'order.completed',
        timestamp: '2026-03-11T10:00:00Z',
        data: {
          orderId: 'ORD-2026-001',
          documents: [
            { id: 'doc-1', type: 'OC3', status: 'ready' },
            { id: 'doc-2', type: 'TITLE_PLAN', status: 'ready' },
          ],
          customer: {
            reference: 'CUST-123',
            email: 'test@example.com',
          },
        },
      });

      const signature = createSignature(complexPayload, secret);
      const result = verifyWebhookSignature(complexPayload, signature, secret);
      expect(result).toBe(true);
    });
  });
});
