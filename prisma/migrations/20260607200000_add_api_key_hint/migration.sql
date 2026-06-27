-- Store last 8 chars of API key for admin display (full key is HMAC-hashed at rest)
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "apiKeyHint" TEXT;
