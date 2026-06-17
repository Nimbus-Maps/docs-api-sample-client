import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { SessionInfo } from '@/lib/types';
import { logError } from '@/lib/logger';
import { getCurrentWebhookSubscription } from '@/lib/webhook-secrets';
import { getDocumentApiAuthMode, isClientCredentialsMode } from '@/lib/document-api-auth';

/**
 * GET /api/auth/session
 * Returns current session information
 */
export async function GET(_request: NextRequest) {
  try {
    const authMode = getDocumentApiAuthMode();
    const currentSubscription = await getCurrentWebhookSubscription();

    if (isClientCredentialsMode()) {
      const sessionInfo: SessionInfo = {
        authMode,
        isAuthenticated: true,
        hasWebhookSubscription: !!currentSubscription,
        webhookSubscriptionId: currentSubscription?.subscriptionId,
      };

      return NextResponse.json(sessionInfo);
    }

    const session = await getSession();
    const webhookSubscriptionId =
      session.webhookSubscriptionId || currentSubscription?.subscriptionId;

    const sessionInfo: SessionInfo = {
      authMode,
      isAuthenticated: session.isAuthenticated || false,
      expiresAt: session.expiresAt,
      hasWebhookSubscription: !!webhookSubscriptionId,
      webhookSubscriptionId,
    };

    return NextResponse.json(sessionInfo);
  } catch (error) {
    logError(error, 'Session check error');
    return NextResponse.json(
      {
        authMode: getDocumentApiAuthMode(),
        isAuthenticated: false,
        hasWebhookSubscription: false,
      } as SessionInfo,
      { status: 200 }
    );
  }
}
