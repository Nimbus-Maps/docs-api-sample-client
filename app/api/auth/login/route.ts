import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '@/lib/pkce';
import { env } from '@/lib/env';
import { logError } from '@/lib/logger';

/**
 * GET /api/auth/login
 * Initiates OAuth 2.0 authorization code flow with PKCE
 * Redirects to Azure AD login page
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE verifier and state in session for validation
    session.pkceVerifier = codeVerifier;
    session.oauthState = state;
    session.isAuthenticated = false;
    await session.save();

    // Build Azure AD authorization URL
    const tenantId = env.AZURE_TENANT_ID;
    const clientId = env.AZURE_CLIENT_ID;
    const redirectUri = env.AZURE_REDIRECT_URI;
    const documentApiAppId = env.DOCUMENT_API_APP_ID;

    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);

    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set(
      'scope',
      `openid profile email offline_access api://${documentApiAppId}/docs.read api://${documentApiAppId}/docs.purchase`
    );
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('response_mode', 'query');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logError(error, 'Login error');
    return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 });
  }
}
