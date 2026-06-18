import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logError, logInfo } from './logger';

/**
 * File-based storage for order_id → webhook_secret mapping
 *
 * DEMO IMPLEMENTATION: Uses a JSON file to map order IDs to webhook secrets.
 * This allows proper per-user webhook signature verification.
 *
 * PRODUCTION: Replace with database storage (e.g., PostgreSQL, Redis)
 */

const SECRETS_FILE = join(process.cwd(), 'webhook-secrets.json');

interface WebhookSecretMapping {
  [orderId: string]: {
    secret: string;
    subscriptionId: string;
    createdAt: string;
  };
}

/**
 * Load webhook secrets mapping from file
 */
async function loadSecrets(): Promise<WebhookSecretMapping> {
  try {
    if (!existsSync(SECRETS_FILE)) {
      return {};
    }
    const data = await readFile(SECRETS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logError(error, 'Error loading webhook secrets');
    return {};
  }
}

/**
 * Save webhook secrets mapping to file
 */
async function saveSecrets(secrets: WebhookSecretMapping): Promise<void> {
  try {
    await writeFile(SECRETS_FILE, JSON.stringify(secrets, null, 2));
  } catch (error) {
    logError(error, 'Error saving webhook secrets');
  }
}

// Reserved key for the currently active subscription's secret
const CURRENT_SUBSCRIPTION_KEY = '_current_subscription';

export interface CurrentWebhookSubscription {
  subscriptionId: string;
  createdAt: string;
}

/**
 * Store the current subscription's secret.
 * Call this whenever a new subscription is created so that webhooks for any
 * order can be verified even if they were placed before this subscription.
 */
export async function storeCurrentSubscriptionSecret(
  subscriptionId: string,
  webhookSecret: string
): Promise<void> {
  const secrets = await loadSecrets();
  secrets[CURRENT_SUBSCRIPTION_KEY] = {
    secret: webhookSecret,
    subscriptionId,
    createdAt: new Date().toISOString(),
  };
  await saveSecrets(secrets);
  logInfo('Stored current subscription secret', { subscriptionId });
}

/**
 * Retrieve the current app-level subscription without exposing its secret.
 */
export async function getCurrentWebhookSubscription(): Promise<CurrentWebhookSubscription | null> {
  const secrets = await loadSecrets();
  const current = secrets[CURRENT_SUBSCRIPTION_KEY];

  if (!current) {
    return null;
  }

  return {
    subscriptionId: current.subscriptionId,
    createdAt: current.createdAt,
  };
}

/**
 * Clear the current subscription secret after unsubscribing.
 */
export async function clearCurrentSubscriptionSecret(subscriptionId?: string): Promise<void> {
  const secrets = await loadSecrets();
  const current = secrets[CURRENT_SUBSCRIPTION_KEY];

  if (!current) {
    return;
  }

  if (subscriptionId && current.subscriptionId !== subscriptionId) {
    return;
  }

  delete secrets[CURRENT_SUBSCRIPTION_KEY];
  await saveSecrets(secrets);
  logInfo('Cleared current subscription secret', { subscriptionId: current.subscriptionId });
}

/**
 * Store webhook secret for an order
 * Called when a purchase is made to map the order_id to the user's webhook secret
 */
export async function storeWebhookSecretForOrder(
  orderId: string,
  webhookSecret: string,
  subscriptionId: string
): Promise<void> {
  const secrets = await loadSecrets();
  secrets[orderId] = {
    secret: webhookSecret,
    subscriptionId,
    createdAt: new Date().toISOString(),
  };
  await saveSecrets(secrets);
  logInfo('Stored webhook secret for order', { orderId, subscriptionId });
}

/**
 * Retrieve the current subscription secret for verifying webhook signatures.
 */
export async function getCurrentSubscriptionSecret(): Promise<string | null> {
  const secrets = await loadSecrets();
  const current = secrets[CURRENT_SUBSCRIPTION_KEY];
  if (!current) {
    logError(new Error('No current subscription secret found'), 'Cannot verify webhook signature');
    return null;
  }
  return current.secret;
}

/**
 * Clean up old webhook secrets (optional maintenance)
 * Removes secrets for orders older than 30 days
 */
export async function cleanupOldWebhookSecrets(): Promise<void> {
  const secrets = await loadSecrets();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let cleaned = 0;
  for (const [orderId, mapping] of Object.entries(secrets)) {
    const createdAt = new Date(mapping.createdAt).getTime();
    if (createdAt < thirtyDaysAgo) {
      delete secrets[orderId];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    await saveSecrets(secrets);
    logInfo('Cleaned up old webhook secrets', { count: cleaned });
  }
}
