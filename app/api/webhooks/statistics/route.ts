import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getWebhookStatistics } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * POST /api/webhooks/statistics
 * Retrieve webhook delivery statistics for a date range
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();

    const data = await getWebhookStatistics(session.accessToken!, body);

    return NextResponse.json(data);
  } catch (error: any) {
    logError(error, 'Webhook statistics error');

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
