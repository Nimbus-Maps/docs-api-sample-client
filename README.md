# Nimbus Document Purchase API - Sample Client

A full-stack Next.js sample application demonstrating integration with the Nimbus Document Purchase API. This client showcases document availability checking, purchasing, ownership verification, and webhook handling using OAuth 2.0 authentication.

## Features

- **OAuth 2.0 with PKCE**: Secure Azure AD authentication with Proof Key for Code Exchange
- **Document Search**: Check availability of title documents (register, title plans)
- **Document Purchase**: Buy documents with automatic token management
- **Ownership Verification**: Verify if a person is the registered proprietor
- **Webhook Integration**: Receive real-time notifications when documents are delivered
- **Order Tracking**: Monitor purchase status and download completed documents
- **Session Management**: Encrypted cookie-based sessions with iron-session
- **Type Safety**: Full TypeScript integration with auto-generated types from OpenAPI

## Why This Architecture?

### On-Behalf-Of (OBO) Authentication

The Nimbus Document Purchase API requires **On-Behalf-Of (OBO) authentication** to ensure every document purchase is tied to a specific authenticated end user. This isn't just authentication—it's about accountability and authorization:

- ✅ **User accountability**: Every purchase is traceable to a real user
- ✅ **Proper authorization**: Token balances and permissions validated per user
- ✅ **Audit trail**: All actions logged to specific user accounts
- ✅ **Security compliance**: Follows OAuth 2.0 best practices for delegated access

### Backend-for-Frontend (BFF) Pattern

This sample implements a **BFF (Backend-for-Frontend)** pattern where:

1. **Your Next.js server** authenticates users against the Nimbus Azure AD tenant
2. **Users grant consent** for your application to access the Document API on their behalf
3. **Your server proxies API calls** using the user's access token
4. **The Document API validates** the user token and enforces per-user authorization

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐
│ Browser │────────▶│  Next.js BFF │────────▶│  Document    │
│         │  Login  │   (Server)   │  Token  │     API      │
└─────────┘         └──────────────┘         └──────────────┘
                           │
                           ▼
                    User's Access Token
                    with docs.read +
                    docs.purchase scopes
```

### Public Client PKCE Flow

This sample uses **OAuth 2.0 Authorization Code Flow with PKCE** (Proof Key for Code Exchange) **without a client secret**:

- **PKCE** provides security through cryptographic challenges (`code_verifier`, `code_challenge`)
- **No client secret** means simpler configuration and no secret rotation requirements
- **Public client** registration in the Nimbus tenant (apps created by Nimbus)
- **Direct OAuth2 calls** to Azure AD token endpoint (not MSAL library)

### Nimbus Tenant Requirement

Your app must be registered in the **Nimbus Azure AD tenant** (not your own tenant) because:

- OAuth scopes (`api://{app-id}/docs.read`, `api://{app-id}/docs.purchase`) are defined in the Nimbus tenant
- The Document API app registration exists in the Nimbus tenant
- Azure AD only allows scope access within the same tenant
- Nimbus pre-configures your app with delegated permissions and admin consent

Contact Nimbus to request an app registration in their tenant.

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- Access to the Nimbus Document Purchase API
- Azure AD app registration (for OAuth)

## Quick Start

### 1. Install Dependencies

```bash
cd sample-client
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Azure AD OAuth Configuration (provided by Nimbus)
AZURE_TENANT_ID=d2a91423-0dc1-4853-8515-7b7b7d262791
AZURE_CLIENT_ID=your-azure-client-id
AZURE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Document API Configuration
DOCUMENT_API_URL=https://api-preprod.nimbusmaps.xyz/docs/v1
DOCUMENT_API_APP_ID=aaa610c3-9375-4a50-8383-26a0b59f7ea2

# Base URL for OAuth redirects and webhooks
NEXTAUTH_URL=http://localhost:3000

# Session encryption secret (generate a random 32+ character string)
SESSION_SECRET=your-random-32-char-secret
```

### 3. Get Azure AD Credentials from Nimbus

**Important:** Your Azure AD app registration must be created by Nimbus in the **Nimbus tenant** (not your own Azure AD tenant). This is required because the OAuth scopes (`docs.read`, `docs.purchase`) are defined in the Nimbus tenant where the Document API is registered.

**To get started:**

1. Contact Nimbus and provide:
   - Your organization name
   - Application name
   - Redirect URI: `http://localhost:3000/api/auth/callback`
   - Environment: pre-production or production

2. Nimbus will create your app registration as a **public client** (PKCE flow, no client secret required)

3. Nimbus will provide you with:
   - **Client ID** - Your application's unique identifier
   - **Tenant ID** - Fixed: `d2a91423-0dc1-4853-8515-7b7b7d262791` (Nimbus tenant)
   - **Document API App ID** - For scopes (pre-prod or production)

4. The app will be pre-configured with:
   - ✅ Delegated permissions: `docs.read`, `docs.purchase`
   - ✅ Admin consent granted (users won't be prompted)
   - ✅ Public client flow enabled (PKCE without client secret)

5. Update your `.env.local` with the Client ID provided by Nimbus

**Why PKCE without client secret?**
This sample uses OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange), which provides security through cryptographic challenges rather than client secrets. This is the recommended approach for server-side applications acting as a Backend-for-Frontend (BFF) proxy.

### 5. Subscribe to Webhooks (Important!)

Before making your first purchase, subscribe to webhooks via the UI:

1. Navigate to the Dashboard
2. Click "Subscribe to Webhooks" button
3. The app will:
   - Call the Document API's `/subscribe` endpoint with your webhook URL
   - Receive a unique `subscription_id` and `secret` for your subscription
   - Store the secret in your session and in `webhook-secrets.json` under the `_current_subscription` key

**Important:** All incoming webhook events are signed with the **subscription secret**, not a per-order secret. You do not need to re-subscribe between purchases. If you restart the backend and re-subscribe, the new secret is automatically stored and used for all future (and existing) orders.

**Implementation:** See [lib/webhook-secrets.ts](lib/webhook-secrets.ts) for the file-based storage (demo). In production, use a database.

### 6. Run the Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.7
- **Authentication**: OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- **Session Management**: iron-session (encrypted cookies) + file-based token storage
- **State Management**: @tanstack/react-query
- **UI Framework**: Tailwind CSS + shadcn/ui (Radix UI)
- **HTTP Client**: Axios
- **Validation**: Zod
- **Notifications**: Sonner (toast notifications)

### Project Structure

```
sample-client/
├── app/                          # Next.js App Router
│   ├── (authenticated)/          # Protected routes group
│   │   ├── layout.tsx            # Auth layout with navigation
│   │   ├── dashboard/page.tsx    # Document search & purchase
│   │   ├── orders/page.tsx       # Order tracking
│   │   ├── webhooks/page.tsx     # Webhook event viewer
│   │   └── verify/page.tsx       # Ownership verification
│   ├── api/                      # API routes (backend)
│   │   ├── auth/                 # OAuth flow handlers
│   │   ├── documents/            # Document API proxies
│   │   ├── orders/               # Order status
│   │   ├── download/             # Document download
│   │   ├── verify-ownership/     # Ownership verification
│   │   └── webhooks/             # Webhook receiver
│   ├── login/page.tsx            # Login page
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # React Query provider
├── components/ui/                # UI components (shadcn)
├── lib/                          # Shared utilities
│   ├── api-client.ts             # Document API client
│   ├── session.ts                # Session management (hybrid cookie + file)
│   ├── session-store.ts          # File-based session storage
│   ├── pkce.ts                   # PKCE utilities
│   ├── webhook.ts                # Webhook signature verification
│   ├── types.ts                  # TypeScript types
│   └── utils.ts                  # Helper functions
├── scripts/                      # Utility scripts
│   └── cleanup-sessions.ts       # Clean up expired sessions
└── public/                       # Static assets
```

### Authentication Flow

1. **Login**: User clicks "Sign in with Microsoft" → redirects to Azure AD
2. **PKCE Generation**: App generates code_verifier and code_challenge
3. **Authorization**: Azure AD authenticates user and returns authorization code
4. **Token Exchange**: App exchanges code for access/refresh tokens using code_verifier
5. **Session Storage**: Session ID stored in encrypted cookie, tokens stored server-side in `.sessions/` directory
6. **API Calls**: Access token included in Authorization header for API requests
7. **Token Refresh**: Refresh token used to obtain new access token before expiry

### Session Management

To avoid browser cookie size limits (4KB), this sample uses a **hybrid session approach**:

- **Cookie**: Stores only an encrypted session ID (small, ~100 bytes)
- **File System**: Stores actual session data (tokens, user state) in `.sessions/` directory
- **Security**: Session files are encrypted and automatically cleaned up after 7 days
- **Cleanup**: Old sessions are periodically removed (1% chance per request + manual script)

**Manual session cleanup:**

```bash
npx tsx scripts/cleanup-sessions.ts
```

**Production Note:** For production deployments, replace file-based storage with Redis, database, or another distributed session store to support multiple server instances.

### API Proxy Pattern

All Document API calls go through Next.js API routes (`/api/*`) rather than directly from the browser:

- ✅ **Secure**: Access tokens never exposed to browser
- ✅ **Centralized**: Single point for error handling and logging
- ✅ **Type-safe**: TypeScript types validated on both client and server
- ✅ **CORS-free**: No cross-origin issues

### Webhook Implementation

1. **Subscription**: App subscribes to webhooks via `/api/documents/subscribe`
2. **Receiver**: Webhook endpoint at `/api/webhooks/documents` receives POST requests
3. **Verification**: HMAC-SHA256 signature validated using webhook secret
4. **Storage**: Events stored in `webhook-events.json` (last 50 events)
5. **Display**: Frontend polls `/api/webhooks/documents` (GET) to display events

## Usage Guide

### 1. Login

1. Navigate to http://localhost:3000
2. Click "Sign in with Microsoft"
3. Authenticate with your Azure AD credentials
4. You'll be redirected to the dashboard

### 2. Check Document Availability

1. Enter a title number (e.g., `BK126329`)
2. Click "Check Availability"
3. View available documents and your token balance

### 3. Purchase Documents

1. Select documents using checkboxes (register, title plan)
2. Optionally add a customer reference
3. View estimated cost
4. Click "Purchase Documents"
5. Order ID will be displayed on success

### 4. Track Orders

1. Go to "Orders" page
2. Enter an order ID
3. View order status and download completed documents
4. Processing orders auto-refresh every 5 seconds

### 5. View Webhook Events

1. Go to "Webhooks" page
2. Events auto-refresh every 5 seconds
3. View delivery status and document details
4. Signature verification shown for each event

### 6. Verify Ownership

1. Go to "Verify Ownership" page
2. Enter title number and person's name
3. Click "Verify Ownership"
4. View match results and property details

## Testing Webhooks Locally

The Document API sends webhook notifications to a **publicly accessible HTTPS URL**. When running locally, `localhost:3000` is not reachable from the internet, so you need to expose it via a tunnelling tool such as ngrok.

### Step 1: Expose localhost with ngrok

1. Install ngrok from https://ngrok.com/download (macOS: `brew install ngrok`)

2. Create a free account at https://ngrok.com and add your auth token:

   ```bash
   ngrok config add-authtoken <your-token>
   ```

3. Start a tunnel on port 3000:

   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS forwarding URL from the ngrok output, e.g. `https://abc123.ngrok-free.app`

5. Update `NEXTAUTH_URL` in `.env.local`:

   ```bash
   NEXTAUTH_URL=https://abc123.ngrok-free.app
   ```

6. Restart the dev server (`npm run dev`) so the new URL is picked up

Your webhook receiver is now publicly reachable at:
`https://abc123.ngrok-free.app/api/webhooks/documents`

> **Note:** On the free ngrok tier the URL changes every time you restart the tunnel. When it changes, update `NEXTAUTH_URL`, restart the dev server, and **re-subscribe to webhooks** so the Document API has your new URL.

> **Alternatives to ngrok:** [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) (no account required: `npx cloudflare tunnel --url http://localhost:3000`), [localtunnel](https://github.com/localtunnel/localtunnel) (`npx localtunnel --port 3000`), or VS Code's built-in port forwarding (right-click port 3000 in the Ports panel → Visibility: Public).

### Step 2: Subscribe to Webhooks

1. Log in and navigate to the Dashboard
2. Click **Subscribe to Webhooks**
3. The app calls `POST /api/documents/subscribe` with your public webhook URL
4. The Document API returns a unique `secret` and `subscription_id`, which are stored in your session and in `webhook-secrets.json` under `_current_subscription`

You only need to subscribe once. All events — regardless of which order they belong to — are signed with the subscription secret.

### Step 3: Make a Purchase and Receive a Webhook

After subscribing, make a document purchase on the Dashboard. The Document API processes the order and—typically within seconds—sends a signed `POST` to your webhook URL for each document in the order.

Each event contains:

- A JSON payload describing the document status change
- An `X-Webhook-Signature` header: HMAC-SHA256 of the raw body, base64-encoded, using your subscription secret

The app verifies the signature using the `_current_subscription` secret from `webhook-secrets.json`, saves the event to `webhook-events.json`, and returns `200 OK`. Navigate to the **Webhooks** page to see the received event.

**Example webhook payload:**

```json
{
  "eventId": "88867097-4322-436e-ac1a-435e1bd17a15",
  "eventType": "document.status_changed",
  "timestamp": "2026-04-25T14:34:52Z",
  "data": {
    "reference": "11edd5d5-3615-4c59-9539-01bd7bb2cfe0",
    "titleNumber": "BK126329",
    "documentDescription": "Official Copy of Title Register",
    "previousStatus": 1,
    "newStatus": 2,
    "statusDescription": "Completed",
    "message": null,
    "downloadUrl": "/Lookup/DownloadDocument?userDocumentReference=11edd5d5-3615-4c59-9539-01bd7bb2cfe0"
  }
}
```

**Key fields:**

- `data.reference` — `UserDocument` GUID; pass this to `GET /download/{reference}` to download the file
- `data.titleNumber` — Land Registry title number
- `data.statusDescription` — human-readable status (e.g. `"Completed"`)

> **Note:** Webhooks are per-document, not per-order. A purchase of two documents will produce two separate webhook events.

### Step 4: Simulate a Webhook with curl

You can send a test webhook at any time — no real purchase needed. Subscribe first (Step 2) so `webhook-secrets.json` contains `_current_subscription`, then run:

```bash
# Read the secret from webhook-secrets.json
SECRET=$(node -e "const f=require('./webhook-secrets.json'); console.log(f._current_subscription.secret)")

PAYLOAD=$(cat <<EOF
{
  "eventId": "$(uuidgen || cat /proc/sys/kernel/random/uuid)",
  "eventType": "document.status_changed",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "data": {
    "reference": "11edd5d5-3615-4c59-9539-01bd7bb2cfe0",
    "titleNumber": "BK126329",
    "documentDescription": "Official Copy of Title Register",
    "previousStatus": 1,
    "newStatus": 2,
    "statusDescription": "Completed",
    "message": null,
    "downloadUrl": "/Lookup/DownloadDocument?userDocumentReference=11edd5d5-3615-4c59-9539-01bd7bb2cfe0"
  }
}
EOF
)

# Compute HMAC-SHA256 signature (Base64-encoded, no prefix)
SIGNATURE="$(printf '%s' "${PAYLOAD}" | openssl dgst -sha256 -hmac "${SECRET}" -binary | base64)"

curl -X POST http://localhost:3000/api/webhooks/documents \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: ${SIGNATURE}" \
  --data-raw "${PAYLOAD}"
```

A `200 OK` response confirms the signature was verified and the event was stored. It should now appear on the **Webhooks** page.

### Where to Find Webhook Data

| File                   | Contents                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `webhook-events.json`  | Last 50 received events (created automatically on first delivery)                    |
| `webhook-secrets.json` | Subscription secret stored under `_current_subscription`; written when you subscribe |

The **Webhooks** page (`/webhooks`) auto-refreshes every 5 seconds and shows each event's payload, received timestamp, and whether its signature was verified.

## API Client Reference

The Document API client (`lib/api-client.ts`) provides the following methods:

```typescript
import { createDocumentApiClient } from '@/lib/api-client';

const api = createDocumentApiClient(accessToken);

// Check if documents are available for a title
const availability = await api.checkAvailability('BK126329');

// Purchase documents
const purchase = await api.purchaseDocuments({
  title_number: 'BK126329',
  documents: ['register', 'title_plan'],
  customer_reference: 'ref-123',
});

// Get order status
const order = await api.getOrderStatus(orderId);

// Download a document
const documentBlob = await api.downloadDocument(documentId);

// Subscribe to webhooks
const subscription = await api.subscribeWebhook(webhookUrl);

// Verify ownership
const verification = await api.verifyOwnership({
  title_number: 'BK126329',
  first_forename: 'John',
  surname: 'Smith',
});
```

## Session Management

Sessions are managed using iron-session with encrypted cookies:

```typescript
import { getSession, requireAuth } from '@/lib/session';

// Get session (may be empty)
const session = await getSession();

// Require authentication (throws if not authenticated)
const session = await requireAuth();

// Session data structure
interface SessionData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  webhookSecret?: string;
  webhookSubscriptionId?: string;
}
```

## Troubleshooting

### OAuth Errors

**Error: `AADSTS50011: The reply URL specified in the request does not match`**

- Ensure the redirect URI in Azure AD matches `AZURE_REDIRECT_URI` in `.env.local`

**Error: `AADSTS700016: Application not found`**

- Verify `AZURE_CLIENT_ID` in `.env.local` matches the client ID provided by Nimbus

### API Errors

**Error: `401 Unauthorized`**

- Access token may have expired (check session)
- Try logging out and logging back in

**Error: `402 Payment Required`**

- Insufficient tokens in your account
- Check your balance on the dashboard

**Error: `404 Not Found`**

- Title number may not exist
- Verify the title number is correct

### Webhook Issues

**Webhooks not being received**

- `NEXTAUTH_URL` must point to a publicly accessible HTTPS URL — `http://localhost:3000` will not work. Use ngrok or an equivalent tunnel (see [Testing Webhooks Locally](#testing-webhooks-locally))
- After changing `NEXTAUTH_URL`, restart the dev server and **re-subscribe to webhooks** so the Document API has the updated URL
- Check the terminal running `npm run dev` for incoming `POST /api/webhooks/documents` requests
- Confirm no firewall or VPN is blocking inbound connections to the tunnel

**`500` — "Unable to verify webhook signature"**

- No subscription secret is stored in `webhook-secrets.json`
- Subscribe via the Dashboard to create the `_current_subscription` entry

**`401` — "Invalid signature"**

- The `X-Webhook-Signature` header does not match the computed HMAC
- This usually means the backend was restarted and you re-subscribed, so the secret changed, but `webhook-secrets.json` still has the old `_current_subscription` entry
- Fix: re-subscribe via the Dashboard to update `_current_subscription` with the new secret
- When testing with curl, ensure the signature uses Base64 encoding with no prefix — use `openssl dgst -sha256 -hmac <secret> -binary | base64`

**Signature verification failed (in server logs)**

- Re-subscribe via the Dashboard and the new secret will be stored automatically

### HTTP Request/Response Logging

For debugging API integration issues, the sample client includes comprehensive HTTP logging that captures full requests and responses including Authorization headers.

**⚠️ WARNING:** HTTP logging exposes sensitive credentials (access tokens, OAuth tokens) in your logs. **ONLY enable in development environments** and never in production.

#### Enable HTTP Logging

Add these environment variables to your `.env.local`:

```bash
# Enable HTTP request/response logging (WARNING: logs sensitive data)
ENABLE_HTTP_LOGGING=true

# Set HTTP log level (debug, info, warn, error)
HTTP_LOG_LEVEL=debug
```

#### What Gets Logged

When enabled, all HTTP requests and responses will be logged with:

✅ **Request Details:**

- HTTP method (GET, POST, etc.)
- Full URL with query parameters
- All headers (including `Authorization: Bearer <token>`)
- Request body (JSON, form data, etc.)
- Request timestamp

✅ **Response Details:**

- HTTP status code and status text
- All response headers
- Response body (parsed JSON or text)
- Request duration in milliseconds

✅ **Error Details:**

- Error messages and stack traces
- Failed request details
- HTTP error responses (4xx, 5xx)

#### Log Output Example

```json
{
  "level": 30,
  "time": 1679846400000,
  "type": "http_request",
  "method": "POST",
  "url": "https://api-preprod.nimbusmaps.xyz/docs/v1/purchase",
  "headers": {
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc...",
    "Content-Type": "application/json"
  },
  "body": {
    "title_number": "BK126329",
    "documents": ["register", "title_plan"]
  },
  "msg": "HTTP Request: POST https://api-preprod.nimbusmaps.xyz/docs/v1/purchase"
}

{
  "level": 30,
  "time": 1679846401234,
  "type": "http_response",
  "method": "POST",
  "url": "https://api-preprod.nimbusmaps.xyz/docs/v1/purchase",
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "x-request-id": "abc123..."
  },
  "data": {
    "order_id": "ord_12345",
    "status": "processing"
  },
  "duration": 1234,
  "msg": "HTTP Response: POST https://api-preprod.nimbusmaps.xyz/docs/v1/purchase - 200 OK (1234ms)"
}
```

#### Where Logging is Applied

- **Axios requests** (Document API calls): Automatic via axios interceptors in `lib/api-client.ts`
- **Fetch requests** (OAuth token exchange): Wrapped via `loggedFetch()` in `lib/logged-fetch.ts`

#### Disable Logging

To disable HTTP logging:

```bash
# In .env.local, set to false or remove the variable
ENABLE_HTTP_LOGGING=false
```

HTTP logging is automatically disabled in test environments and when `NODE_ENV=production`.

#### Production Safety

The HTTP logger is separate from the main application logger:

- Main logger (`lib/logger.ts`): **Always redacts** authorization headers and tokens
- HTTP logger: **Never redacts** (only for debugging)
- Production safety: HTTP logging disabled by default and requires explicit `ENABLE_HTTP_LOGGING=true`

**Best Practice:** Only enable HTTP logging temporarily when debugging specific issues, then disable it immediately.

## Production Deployment

### Environment Variables

Ensure all environment variables are set in your production environment:

```bash
AZURE_TENANT_ID=d2a91423-0dc1-4853-8515-7b7b7d262791
AZURE_CLIENT_ID=prod-client-id
AZURE_REDIRECT_URI=https://yourdomain.com/api/auth/callback
DOCUMENT_API_URL=https://api.nimbusmaps.co.uk/docs/v1
DOCUMENT_API_APP_ID=d5ddd66b-0c00-4c46-bb81-672727b71aa5
NEXTAUTH_URL=https://yourdomain.com
SESSION_SECRET=secure-random-secret-at-least-32-chars
```

### Build and Start

```bash
npm run build
npm start
```

### Security Considerations

- ✅ Use HTTPS in production (required for OAuth)
- ✅ Set `SESSION_SECRET` to a cryptographically secure random value
- ✅ Enable `httpOnly` and `secure` flags on session cookies (already configured)
- ✅ Validate all user inputs (Zod validation included)
- ✅ Verify webhook signatures (HMAC-SHA256 verification included)
- ✅ Use environment variables for all secrets (never commit to git)

### Scaling

For high-traffic scenarios:

- **Session Storage**: Consider Redis instead of cookies for session storage
- **Webhook Storage**: Replace file-based storage with a database
- **Rate Limiting**: Add rate limiting to API routes
- **Caching**: Implement response caching for availability checks
- **Monitoring**: Add application monitoring (e.g., Application Insights)

## Development Scripts

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## Testing

### Manual Testing

Start the development server and exercise the UI flows manually:

1. Log in and check document availability for a known title number
2. Make a test purchase and confirm the order appears on the Orders page
3. Subscribe to webhooks and simulate a delivery with the curl snippet in [Testing Webhooks Locally](#testing-webhooks-locally)

## Contributing

This is a sample application. For production use, consider:

- Adding comprehensive error boundaries
- Implementing retry logic for failed API calls
- Adding loading skeletons for better UX
- Implementing proper logging and monitoring
- Adding unit and integration tests
- Implementing proper database for webhook events
- Adding user management and multi-tenancy

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For issues related to:

- **This sample client**: Check the troubleshooting section above
- **Document Purchase API**: Contact Nimbus for API documentation
- **Azure AD**: See [Microsoft Identity Platform docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [iron-session Documentation](https://github.com/vvo/iron-session)
- [React Query Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
