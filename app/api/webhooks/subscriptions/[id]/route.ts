import { NextRequest, NextResponse } from 'next/server';
import { requireDocumentApiAuth } from '@/lib/document-api-auth';
import { unsubscribeWebhook } from '@/lib/api-client';
import { logError } from '@/lib/logger';
import { clearCurrentSubscriptionSecret } from '@/lib/webhook-secrets';

/**
 * DELETE /api/webhooks/subscriptions/[id]
 * Cancel a webhook subscription
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDocumentApiAuth();
    const { id } = await params;

    try {
      await unsubscribeWebhook(auth.accessToken, id);
    } catch (error) {
      // 404 means the subscription no longer exists — treat as success
      if ((error as { status?: number }).status !== 404) {
        throw error;
      }
    }

    if (auth.session) {
      auth.session.webhookSecret = undefined;
      auth.session.webhookSubscriptionId = undefined;
      await auth.session.save();
    }

    await clearCurrentSubscriptionSecret(id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Unsubscribe error');

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
