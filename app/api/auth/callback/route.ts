import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { env } from '@/lib/env';
import { logError, logInfo } from '@/lib/logger';
import { loggedFetch } from '@/lib/logged-fetch';

/**
 * OAuth 2.0 Token Response from Azure AD
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * GET /api/auth/callback
 * Handles OAuth callback from Azure AD
 * Exchanges authorization code for access token using PKCE (public client flow)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      logError(new Error(errorDescription || error), 'OAuth error', { error, errorDescription });
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    // Validate authorization code and state
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/login?error=Missing authorization code or state', request.url)
      );
    }

    const session = await getSession();

    // Validate OAuth state to prevent CSRF attacks
    const sessionState = session.oauthState;
    if (!sessionState || sessionState !== state) {
      logError(new Error('CSRF attack detected'), 'OAuth state mismatch - potential CSRF attack', {
        expectedState: sessionState,
        receivedState: state,
      });
      return NextResponse.redirect(new URL('/login?error=Invalid state parameter', request.url));
    }

    // Retrieve PKCE verifier from session
    const codeVerifier = session.pkceVerifier;
    if (!codeVerifier) {
      return NextResponse.redirect(new URL('/login?error=Invalid session state', request.url));
    }

    // Prepare OAuth2 token exchange parameters
    const tenantId = env.AZURE_TENANT_ID;
    const clientId = env.AZURE_CLIENT_ID;
    const redirectUri = env.AZURE_REDIRECT_URI;
    const documentApiAppId = env.DOCUMENT_API_APP_ID;

    // Build scopes: OIDC + Document API permissions
    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      `${documentApiAppId}/docs.read`,
      `${documentApiAppId}/docs.purchase`,
    ].join(' ');

    // Exchange authorization code for tokens using direct OAuth2 call
    // This implements the public client PKCE flow as specified in the S2S guide
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const tokenRequestBody = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    logInfo('Exchanging authorization code for tokens', {
      endpoint: tokenEndpoint,
      scopes: scopes.split(' '),
    });

    const tokenResponse = await loggedFetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logError(
        new Error('Token exchange failed'),
        'Failed to exchange authorization code for tokens',
        {
          status: tokenResponse.status,
          error: errorData,
        }
      );
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(errorData.error_description || 'Token exchange failed')}`,
          request.url
        )
      );
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Calculate token expiration time
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Store tokens in session
    // Note: We don't store idToken in the session to reduce cookie size
    // The idToken is only needed for initial verification, which happens above
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = expiresAt;
    session.isAuthenticated = true;
    session.pkceVerifier = undefined; // Clear PKCE verifier
    session.oauthState = undefined; // Clear OAuth state

    await session.save();

    logInfo('User authenticated successfully', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: new Date(expiresAt).toISOString(),
      scopes: tokens.scope.split(' '),
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    logError(error, 'Callback error');
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
