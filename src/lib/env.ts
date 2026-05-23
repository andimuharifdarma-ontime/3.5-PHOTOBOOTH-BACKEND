/**
 * Runtime Environment Variable Validation
 * 
 * Validates that all critical environment variables are present.
 * Import this early (e.g., in layout.tsx or API routes) to get
 * clear error messages when env vars are missing.
 */

const requiredServerEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

const requiredPublicEnvVars = [
  'NEXT_PUBLIC_BASE_URL',
] as const;

const optionalServerEnvVars = [
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_REFRESH_TOKEN',
  'GOOGLE_DRIVE_FOLDER_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'DOKU_CLIENT_ID',
  'DOKU_SECRET_KEY',
  'DOKU_IS_PRODUCTION',
  'DOKU_PUBLIC_KEY',
  'SMTP_EMAIL',
  'SMTP_PASSWORD',
] as const;

/**
 * Validates critical env vars at runtime.
 * Call this during app initialization to fail fast with clear errors.
 */
export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required server-side env vars
  for (const envVar of requiredServerEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check required public env vars
  for (const envVar of requiredPublicEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Warn about missing optional vars that affect features
  for (const envVar of optionalServerEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error(
      `\n❌ Missing REQUIRED environment variables:\n` +
      missing.map(v => `   - ${v}`).join('\n') +
      `\n\n   Copy .env.example to .env.local and fill in the values.\n`
    );
  }

  if (warnings.length > 0) {
    console.warn(
      `\n⚠️  Missing optional environment variables (some features may not work):\n` +
      warnings.map(v => `   - ${v}`).join('\n') + '\n'
    );
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Helper to safely get a required env var with type safety.
 * Throws descriptive error if not found.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Check .env.example for the required format.`
    );
  }
  return value;
}
