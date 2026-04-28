import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { SessionInfo } from '@/lib/types';
import { logError } from '@/lib/logger';

/**
 * GET /api/auth/session
 * Returns current session information
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();

    const sessionInfo: SessionInfo = {
      isAuthenticated: session.isAuthenticated || false,
      expiresAt: session.expiresAt,
      hasWebhookSubscription: !!session.webhookSubscriptionId,
      webhookSubscriptionId: session.webhookSubscriptionId,
    };

    return NextResponse.json(sessionInfo);
  } catch (error) {
    logError(error, 'Session check error');
    return NextResponse.json(
      {
        isAuthenticated: false,
        hasWebhookSubscription: false,
      } as SessionInfo,
      { status: 200 }
    );
  }
}
