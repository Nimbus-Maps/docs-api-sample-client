import { z } from 'zod';

/**
 * Environment variable schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Azure AD Configuration (Public Client - PKCE flow, no client secret)
  AZURE_TENANT_ID: z.string().min(1, 'AZURE_TENANT_ID is required'),
  AZURE_CLIENT_ID: z.string().min(1, 'AZURE_CLIENT_ID is required'),
  AZURE_REDIRECT_URI: z.string().url('AZURE_REDIRECT_URI must be a valid URL'),

  // Document API Configuration
  DOCUMENT_API_URL: z.string().url('DOCUMENT_API_URL must be a valid URL'),
  DOCUMENT_API_APP_ID: z.string().min(1, 'DOCUMENT_API_APP_ID is required'),

  // Session Configuration
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .describe('Secret key for encrypting session cookies'),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validated and typed environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * @throws {z.ZodError} if validation fails
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`);
      console.error('❌ Environment variable validation failed:\n' + messages.join('\n'));
      throw new Error('Invalid environment configuration. See errors above.');
    }
    throw error;
  }
}

/**
 * Validated environment variables
 * Access via `env.VARIABLE_NAME` instead of `process.env.VARIABLE_NAME!`
 */
export const env = validateEnv();

/**
 * Check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
