import { NextRequest, NextResponse } from 'next/server';
import { requireDocumentApiAuth } from '@/lib/document-api-auth';
import { purchaseDocuments, subscribeWebhook } from '@/lib/api-client';
import { PurchaseRequest } from '@/lib/types';
import { logError, logInfo, logWarn } from '@/lib/logger';
import {
  getCurrentWebhookSubscription,
  storeCurrentSubscriptionSecret,
} from '@/lib/webhook-secrets';

/**
 * POST /api/documents/purchase
 * Purchase documents for a title
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireDocumentApiAuth();

    const body: PurchaseRequest = await request.json();

    // Validate request body
    const hasDocuments = body.documents && body.documents.length > 0;
    const hasReferredDocuments = body.referred_documents && body.referred_documents.length > 0;
    if (!body.title_number || (!hasDocuments && !hasReferredDocuments)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'title_number and at least one of documents or referred_documents are required',
          },
        },
        { status: 400 }
      );
    }

    const data = await purchaseDocuments(auth.accessToken, body);

    let currentSubscription = await getCurrentWebhookSubscription();
    if (!currentSubscription && auth.session?.webhookSecret && auth.session.webhookSubscriptionId) {
      await storeCurrentSubscriptionSecret(
        auth.session.webhookSubscriptionId,
        auth.session.webhookSecret
      );
      currentSubscription = {
        subscriptionId: auth.session.webhookSubscriptionId,
        createdAt: new Date().toISOString(),
      };
    }

    const hasSessionSubscription =
      !!auth.session?.webhookSecret && !!auth.session.webhookSubscriptionId;
    const shouldSubscribe =
      auth.mode === 'client_credentials' ? !currentSubscription : !hasSessionSubscription;

    // Ensure there is a webhook subscription. Auto-subscribe if one is not already
    // recorded for the current auth context so that purchases produce verifiable webhooks.
    if (shouldSubscribe) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const webhookUrl = `${baseUrl}/api/webhooks/documents`;
        const subscription = await subscribeWebhook(auth.accessToken, {
          webhook_url: webhookUrl,
        });

        if (auth.session) {
          auth.session.webhookSecret = subscription.secret;
          auth.session.webhookSubscriptionId = subscription.subscription_id;
          await auth.session.save();
        }

        // Persist as current subscription secret for fallback verification
        await storeCurrentSubscriptionSecret(subscription.subscription_id, subscription.secret);
        logInfo('Auto-subscribed to webhooks during purchase', {
          subscriptionId: subscription.subscription_id,
        });
      } catch (subError) {
        const s = subError as { status?: number; message?: string };
        if (s.status === 409) {
          // Already subscribed on the API side but the local secret mapping is missing.
          // Re-subscribe manually from the Webhooks page to restore the mapping.
          logWarn(
            'Auto-subscribe skipped: subscription already exists but secret is not stored locally',
            {
              hint: 'Re-subscribe from the Webhooks page',
            }
          );
        } else {
          logWarn(
            'Auto-subscribe failed; webhook signature verification may not work for this order',
            {
              error: s.message,
            }
          );
        }
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Purchase error');

    if (e.message === 'Unauthorized' || e.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: e.code || 'INTERNAL_ERROR', message: e.message } },
      { status: e.status || 500 }
    );
  }
}
