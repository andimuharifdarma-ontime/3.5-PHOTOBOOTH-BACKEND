-- Toggle visibility for launcher welcome message and payment hint
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "kioskShowWelcomeMessage" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "kioskShowPaymentHint" BOOLEAN NOT NULL DEFAULT true;
