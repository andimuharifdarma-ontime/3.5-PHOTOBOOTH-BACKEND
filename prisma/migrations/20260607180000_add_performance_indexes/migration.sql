-- Composite indexes for admin stats, reports, and order listing
CREATE INDEX IF NOT EXISTS "PrintOrder_paymentStatus_createdAt_idx" ON "PrintOrder"("paymentStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "PrintOrder_adminUserId_createdAt_idx" ON "PrintOrder"("adminUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "PrintOrder_userName_createdAt_idx" ON "PrintOrder"("userName", "createdAt");
CREATE INDEX IF NOT EXISTS "Frame_themeId_idx" ON "Frame"("themeId");
