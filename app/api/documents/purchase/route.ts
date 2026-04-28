import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSession } from '@/lib/session';
import { purchaseDocuments, subscribeWebhook } from '@/lib/api-client';
import { PurchaseRequest } from '@/lib/types';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { storeCurrentSubscriptionSecret } from '@/lib/webhook-secrets';

/**
 * POST /api/documents/purchase
 * Purchase documents for a title
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body: PurchaseRequest = await request.json();

    // Validate request body
    if (!body.title_number || !body.documents || body.documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'title_number and documents are required' } },
        { status: 400 }
      );
    }

    const data = await purchaseDocuments(session.accessToken!, body);

    // Ensure there is a webhook subscription. Auto-subscribe if one is not already
    // recorded in the session so that every purchase produces a verifiable webhook.
    if (!session.webhookSecret || !session.webhookSubscriptionId) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const webhookUrl = `${baseUrl}/api/webhooks/documents`;
        const subscription = await subscribeWebhook(session.accessToken!, { webhook_url: webhookUrl });
        const updatedSession = await getSession();
        updatedSession.webhookSecret = subscription.secret;
        updatedSession.webhookSubscriptionId = subscription.subscription_id;
        await updatedSession.save();
        // Update the in-memory reference so storeWebhookSecretForOrder below uses the new values
        session.webhookSecret = subscription.secret;
        session.webhookSubscriptionId = subscription.subscription_id;
        // Persist as current subscription secret for fallback verification
        await storeCurrentSubscriptionSecret(subscription.subscription_id, subscription.secret);
        logInfo('Auto-subscribed to webhooks during purchase', { subscriptionId: subscription.subscription_id });
      } catch (subError: any) {
        if (subError.status === 409) {
          // Already subscribed on the API side but secret is missing from session.
          // The user can re-subscribe manually from the Webhooks page to restore the mapping.
          logWarn('Auto-subscribe skipped: subscription already exists but secret is not in session', {
            hint: 'User should re-subscribe from the Webhooks page',
          });
        } else {
          logWarn('Auto-subscribe failed; webhook signature verification may not work for this order', {
            error: subError.message,
          });
        }
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logError(error, 'Purchase error');

    if (error.message === 'Unauthorized' || error.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: error.code || 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
