import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSession } from '@/lib/session';
import { subscribeWebhook } from '@/lib/api-client';
import { logError } from '@/lib/logger';
import { storeCurrentSubscriptionSecret } from '@/lib/webhook-secrets';

/**
 * POST /api/documents/subscribe
 * Subscribe to webhook notifications
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get the base URL for webhooks
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/documents`;

    const data = await subscribeWebhook(session.accessToken!, {
      webhook_url: webhookUrl,
    });

    // Store webhook secret and subscription ID in session
    const updatedSession = await getSession();
    updatedSession.webhookSecret = data.secret;
    updatedSession.webhookSubscriptionId = data.subscription_id;
    await updatedSession.save();

    // Persist the current subscription secret so webhooks for all orders can be verified
    await storeCurrentSubscriptionSecret(data.subscription_id, data.secret);

    return NextResponse.json(data);
  } catch (error: any) {
    logError(error, 'Subscribe error');

    if (error.message === 'Unauthorized' || error.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    // Handle subscription conflict (already exists)
    if (error.status === 409) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: { code: error.code || 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
