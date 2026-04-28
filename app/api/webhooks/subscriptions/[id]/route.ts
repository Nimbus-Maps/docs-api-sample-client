import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSession } from '@/lib/session';
import { unsubscribeWebhook } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * DELETE /api/webhooks/subscriptions/[id]
 * Cancel a webhook subscription
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    try {
      await unsubscribeWebhook(session.accessToken!, params.id);
    } catch (error: any) {
      // 404 means the subscription no longer exists — treat as success
      if (error.status !== 404) {
        throw error;
      }
    }

    // Clear webhook fields from session so the dashboard reflects the change
    const currentSession = await getSession();
    currentSession.webhookSecret = undefined;
    currentSession.webhookSubscriptionId = undefined;
    await currentSession.save();

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    logError(error, 'Unsubscribe error');

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
