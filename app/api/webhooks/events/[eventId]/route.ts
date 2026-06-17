import { NextRequest, NextResponse } from 'next/server';
import { requireDocumentApiAuth } from '@/lib/document-api-auth';
import { getWebhookEventDetails } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * GET /api/webhooks/events/[eventId]
 * Retrieve all delivery attempts for a specific webhook event
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireDocumentApiAuth();
    const { eventId } = await params;

    const data = await getWebhookEventDetails(auth.accessToken, eventId);

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Webhook event details error');

    if (e.message === 'Unauthorized' || e.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    if (e.status === 404) {
      return NextResponse.json(
        { error: { code: e.code || 'NOT_FOUND', message: e.message } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: { code: e.code || 'INTERNAL_ERROR', message: e.message } },
      { status: e.status || 500 }
    );
  }
}
