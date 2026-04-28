import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/webhook';
import { WebhookPayload, WebhookEvent } from '@/lib/types';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logDebug, logError, logInfo, logWarn } from '@/lib/logger';
import crypto from 'crypto';
import { getCurrentSubscriptionSecret } from '@/lib/webhook-secrets';

// Store webhook events in a JSON file for demo purposes
// In production, use a database
const EVENTS_FILE = join(process.cwd(), 'webhook-events.json');

/**
 * Load webhook events from file
 */
async function loadEvents(): Promise<WebhookEvent[]> {
  try {
    if (!existsSync(EVENTS_FILE)) {
      return [];
    }
    const data = await readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logError(error, 'Error loading webhook events');
    return [];
  }
}

/**
 * Save webhook events to file
 */
async function saveEvents(events: WebhookEvent[]): Promise<void> {
  try {
    await writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (error) {
    logError(error, 'Error saving webhook events');
  }
}

/**
 * POST /api/webhooks/documents
 * Receives webhook notifications from Document API
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const eventHeader = request.headers.get('x-webhook-event');
    const idHeader = request.headers.get('x-webhook-id');

    logDebug('Webhook delivery received', {
      xWebhookEvent: eventHeader,
      xWebhookId: idHeader,
      xWebhookSignature: signature,
      rawBodyLength: rawBody.length,
      rawBody,
    });

    if (!signature) {
      logWarn('Missing webhook signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Parse payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logWarn('Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Retrieve the subscription secret to verify the HMAC signature.
    // All webhooks from a subscription are signed with the same secret.
    const webhookSecret = await getCurrentSubscriptionSecret();

    if (!webhookSecret) {
      logError(
        new Error('No subscription secret found'),
        'Cannot verify webhook signature - subscribe first'
      );
      return NextResponse.json({ error: 'Unable to verify webhook signature' }, { status: 500 });
    }

    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('base64');
      logError(new Error('Webhook signature verification failed'), 'Invalid webhook signature', {
        xWebhookSignature: signature,
        expectedSignature,
        rawBody,
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Store the webhook event
    const event: WebhookEvent = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      payload,
      signature,
      verified: true,
    };

    const events = await loadEvents();
    events.unshift(event); // Add to beginning of array

    // Keep only the last 50 events
    if (events.length > 50) {
      events.splice(50);
    }

    await saveEvents(events);

    logInfo('Webhook received and verified', {
      eventId: payload.EventId,
      eventType: payload.EventType,
      reference: payload.Data?.Reference,
      titleNumber: payload.Data?.TitleNumber,
      status: payload.Data?.StatusDescription,
      newStatus: payload.Data?.NewStatus,
      previousStatus: payload.Data?.PreviousStatus,
      downloadUrl: payload.Data?.DownloadUrl,
      message: payload.Data?.Message,
      documentDescription: payload.Data?.DocumentDescription,
    });

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    logError(error, 'Webhook processing error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/documents
 * Returns recent webhook events (for UI display)
 */
export async function GET(_request: NextRequest) {
  try {
    const events = await loadEvents();
    return NextResponse.json({ events });
  } catch (error) {
    logError(error, 'Error fetching webhook events');
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
