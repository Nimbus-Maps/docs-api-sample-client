import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getWebhookAudit } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * POST /api/webhooks/audit
 * Retrieve paginated webhook delivery audit log
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json().catch(() => ({}));

    const data = await getWebhookAudit(session.accessToken!, body);

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Webhook audit error');

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
