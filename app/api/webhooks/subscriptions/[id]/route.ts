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
    } catch (error) {
      // 404 means the subscription no longer exists — treat as success
      if ((error as { status?: number }).status !== 404) {
        throw error;
      }
    }

    // Clear webhook fields from session so the dashboard reflects the change
    const currentSession = await getSession();
    currentSession.webhookSecret = undefined;
    currentSession.webhookSubscriptionId = undefined;
    await currentSession.save();

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
