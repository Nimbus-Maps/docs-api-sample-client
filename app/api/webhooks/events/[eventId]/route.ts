import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getWebhookEventDetails } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * GET /api/webhooks/events/[eventId]
 * Retrieve all delivery attempts for a specific webhook event
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await requireAuth();

    const data = await getWebhookEventDetails(session.accessToken!, params.eventId);

    return NextResponse.json(data);
  } catch (error: any) {
    logError(error, 'Webhook event details error');

    if (error.message === 'Unauthorized' || error.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    if (error.status === 404) {
      return NextResponse.json(
        { error: { code: error.code || 'NOT_FOUND', message: error.message } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: { code: error.code || 'INTERNAL_ERROR', message: error.message } },
      { status: error.status || 500 }
    );
  }
}
