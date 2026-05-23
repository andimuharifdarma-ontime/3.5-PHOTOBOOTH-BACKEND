-- ============================================
-- Row Level Security (RLS) Setup untuk Supabase/PostgreSQL
-- ============================================
-- Jalankan query ini di Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- PENTING: Backup database sebelum menjalankan RLS!

-- ============================================
-- 1. AKTIFKAN RLS pada tabel-tabel sensitif
-- ============================================

ALTER TABLE "PrintOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLICY: PrintOrder
-- User hanya bisa melihat/edit order milik mereka sendiri
-- ============================================

-- SELECT: User hanya bisa melihat order milik adminUserId mereka
CREATE POLICY "Users can view own orders"
ON "PrintOrder"
FOR SELECT
USING ("adminUserId" = auth.uid()::text);

-- INSERT: User bisa membuat order baru (filter melalui aplikasi)
CREATE POLICY "Users can create orders"
ON "PrintOrder"
FOR INSERT
WITH CHECK ("adminUserId" = auth.uid()::text);

-- UPDATE: User hanya bisa mengupdate order mereka sendiri
CREATE POLICY "Users can update own orders"
ON "PrintOrder"
FOR UPDATE
USING ("adminUserId" = auth.uid()::text);

-- ============================================
-- 3. POLICY: SystemSetting
-- User hanya bisa melihat/edit setting milik mereka
-- ============================================

CREATE POLICY "Users can view own settings"
ON "SystemSetting"
FOR SELECT
USING ("adminUserId" = auth.uid()::text);

CREATE POLICY "Users can update own settings"
ON "SystemSetting"
FOR UPDATE
USING ("adminUserId" = auth.uid()::text);

-- ============================================
-- 4. POLICY: AuditLog
-- Hanya ADMIN yang bisa melihat audit log
-- ============================================

CREATE POLICY "Only admins can view audit logs"
ON "AuditLog"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "AdminUser"
        WHERE id = auth.uid()::text
        AND role = 'ADMIN'
    )
);

-- ============================================
-- 5. BYPASS untuk Service Role
-- Prisma menggunakan service_role key, jadi perlu bypass
-- ============================================

-- CATATAN: Jika Prisma terhubung via service_role key (bukan anon key),
-- RLS otomatis di-bypass. Ini sudah benar karena backend kita
-- yang mengontrol akses, bukan client langsung.
--
-- RLS di atas berfungsi sebagai lapisan keamanan tambahan
-- jika di kemudian hari ada akses langsung dari client ke Supabase.

-- ============================================
-- ROLLBACK (jika ada masalah)
-- ============================================
-- ALTER TABLE "PrintOrder" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "SystemSetting" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
