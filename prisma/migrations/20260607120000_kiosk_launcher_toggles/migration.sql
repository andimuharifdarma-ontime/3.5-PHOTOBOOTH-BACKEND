-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "kioskShowBrandSubtitle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "kioskBrandSubtitle" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "kioskShowLogo" BOOLEAN NOT NULL DEFAULT true;
