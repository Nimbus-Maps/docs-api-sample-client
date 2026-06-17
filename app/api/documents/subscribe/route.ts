import { NextRequest, NextResponse } from 'next/server';
import { requireDocumentApiAuth } from '@/lib/document-api-auth';
import { subscribeWebhook } from '@/lib/api-client';
import { logError } from '@/lib/logger';
import { storeCurrentSubscriptionSecret } from '@/lib/webhook-secrets';

/**
 * POST /api/documents/subscribe
 * Subscribe to webhook notifications
 */
export async function POST(_request: NextRequest) {
  try {
    const auth = await requireDocumentApiAuth();

    // Get the base URL for webhooks
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/documents`;

    const data = await subscribeWebhook(auth.accessToken, {
      webhook_url: webhookUrl,
    });

    if (auth.session) {
      auth.session.webhookSecret = data.secret;
      auth.session.webhookSubscriptionId = data.subscription_id;
      await auth.session.save();
    }

    // Persist the current subscription secret so webhooks for all orders can be verified
    await storeCurrentSubscriptionSecret(data.subscription_id, data.secret);

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Subscribe error');

    if (e.message === 'Unauthorized' || e.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    // Handle subscription conflict (already exists)
    if (e.status === 409) {
      return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: 409 });
    }

    return NextResponse.json(
      { error: { code: e.code || 'INTERNAL_ERROR', message: e.message } },
      { status: e.status || 500 }
    );
  }
}
