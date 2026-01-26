-- ============================================
-- EMERGENCY FIX: DISABLE ALL RLS & FIX STORAGE
-- ============================================

-- 1. DISABLE ROW LEVEL SECURITY ON ALL TABLES
-- This ensures no operation hangs due to policy checks
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE disabled_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. ENSURE BUCKETS EXIST AND ARE PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('venue-images', 'venue-images', true),
    ('court-images', 'court-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. RESET STORAGE POLICIES TO BE FULLY PUBLIC
-- Drop all existing policies that might be conflicting
DROP POLICY IF EXISTS "Public can view venue images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update venue images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete venue images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update venue images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete venue images" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Access venue-images" ON storage.objects;

-- Create single PERMISSIVE policy for venue-images
CREATE POLICY "Emergency Full Access venue-images"
ON storage.objects FOR ALL
USING (bucket_id = 'venue-images')
WITH CHECK (bucket_id = 'venue-images');

-- Same for court-images
DROP POLICY IF EXISTS "Public can view court images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload court images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update court images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete court images" ON storage.objects;

CREATE POLICY "Emergency Full Access court-images"
ON storage.objects FOR ALL
USING (bucket_id = 'court-images')
WITH CHECK (bucket_id = 'court-images');

-- 4. GRANT PERMISSIONS TO AUTHENTICATED AND ANON ROLES
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. VERIFY
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
