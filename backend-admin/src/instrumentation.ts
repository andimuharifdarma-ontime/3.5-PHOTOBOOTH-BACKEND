export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    const result = validateEnv();
    if (!result.valid && process.env.NODE_ENV === 'production') {
      console.error('[instrumentation] Missing required environment variables. App may fail at runtime.');
    }
  }
}
