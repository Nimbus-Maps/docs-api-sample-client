import { z } from 'zod';

/**
 * Environment variable schema
 * Validates all required environment variables at startup
 */
const envSchema = z
  .object({
    // Document API auth mode
    DOCUMENT_API_AUTH_MODE: z.enum(['obo', 'client_credentials']).default('obo'),

    // Azure AD Configuration (Public Client - PKCE flow, no client secret)
    AZURE_TENANT_ID: z.string().min(1, 'AZURE_TENANT_ID is required'),
    AZURE_CLIENT_ID: z.string().optional(),
    AZURE_REDIRECT_URI: z.string().url('AZURE_REDIRECT_URI must be a valid URL').optional(),

    // Entra client credentials configuration (server-to-server flow)
    ENTRA_CLIENT_ID: z.string().optional(),
    ENTRA_CLIENT_SECRET: z.string().optional(),
    DOCUMENT_API_SCOPE: z.string().optional(),

    // Document API Configuration
    DOCUMENT_API_URL: z.string().url('DOCUMENT_API_URL must be a valid URL'),
    DOCUMENT_API_APP_ID: z.string().optional(),

    // Session Configuration
    SESSION_SECRET: z
      .string()
      .min(32, 'SESSION_SECRET must be at least 32 characters')
      .describe('Secret key for encrypting session cookies'),

    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .superRefine((value, ctx) => {
    if (value.DOCUMENT_API_AUTH_MODE === 'obo') {
      if (!value.AZURE_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AZURE_CLIENT_ID'],
          message: 'AZURE_CLIENT_ID is required when DOCUMENT_API_AUTH_MODE=obo',
        });
      }

      if (!value.AZURE_REDIRECT_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AZURE_REDIRECT_URI'],
          message: 'AZURE_REDIRECT_URI is required when DOCUMENT_API_AUTH_MODE=obo',
        });
      }

      if (!value.DOCUMENT_API_APP_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DOCUMENT_API_APP_ID'],
          message: 'DOCUMENT_API_APP_ID is required when DOCUMENT_API_AUTH_MODE=obo',
        });
      }
    }

    if (value.DOCUMENT_API_AUTH_MODE === 'client_credentials') {
      if (!value.ENTRA_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ENTRA_CLIENT_ID'],
          message: 'ENTRA_CLIENT_ID is required when DOCUMENT_API_AUTH_MODE=client_credentials',
        });
      }

      if (!value.ENTRA_CLIENT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ENTRA_CLIENT_SECRET'],
          message: 'ENTRA_CLIENT_SECRET is required when DOCUMENT_API_AUTH_MODE=client_credentials',
        });
      }

      if (!value.DOCUMENT_API_SCOPE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DOCUMENT_API_SCOPE'],
          message: 'DOCUMENT_API_SCOPE is required when DOCUMENT_API_AUTH_MODE=client_credentials',
        });
      }
    }
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
      // eslint-disable-next-line no-console
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

/**
 * Check if the app should use delegated user tokens.
 */
export const isOboAuthMode = env.DOCUMENT_API_AUTH_MODE === 'obo';

/**
 * Check if the app should use Entra client credentials tokens.
 */
export const isClientCredentialsAuthMode = env.DOCUMENT_API_AUTH_MODE === 'client_credentials';
