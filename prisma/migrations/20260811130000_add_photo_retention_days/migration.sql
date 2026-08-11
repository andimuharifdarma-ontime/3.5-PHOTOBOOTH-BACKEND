-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "photoRetentionDays" INTEGER NOT NULL DEFAULT 7;
