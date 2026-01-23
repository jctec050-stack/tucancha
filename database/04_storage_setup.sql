-- ============================================
-- PASO 4: CONFIGURACIÓN DE STORAGE
-- ============================================
-- Este script configura los buckets de almacenamiento y sus políticas.

-- NOTA: Algunos comandos deben ejecutarse desde la UI de Supabase o usando el cliente JavaScript.
-- Este archivo documenta la configuración necesaria.

-- ============================================
-- CREAR BUCKETS
-- ============================================

-- Bucket para imágenes de venues
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'venue-images',
    'venue-images',
    true,
    5242880, -- 5MB en bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Bucket para imágenes de courts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'court-images',
    'court-images',
    true,
    5242880, -- 5MB en bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- POLÍTICAS DE STORAGE: venue-images
-- ============================================

-- Todos pueden ver las imágenes de venues (público)
CREATE POLICY "Public can view venue images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'venue-images');

-- Los dueños pueden subir imágenes para sus venues
CREATE POLICY "Owners can upload venue images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'venue-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- Los dueños pueden actualizar imágenes de sus venues
CREATE POLICY "Owners can update venue images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'venue-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- Los dueños pueden eliminar imágenes de sus venues
CREATE POLICY "Owners can delete venue images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'venue-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- ============================================
-- POLÍTICAS DE STORAGE: court-images
-- ============================================

-- Todos pueden ver las imágenes de courts (público)
CREATE POLICY "Public can view court images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'court-images');

-- Los dueños pueden subir imágenes para sus courts
CREATE POLICY "Owners can upload court images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'court-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- Los dueños pueden actualizar imágenes de sus courts
CREATE POLICY "Owners can update court images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'court-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- Los dueños pueden eliminar imágenes de sus courts
CREATE POLICY "Owners can delete court images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'court-images' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id IN ('venue-images', 'court-images');

-- Este query debe mostrar los dos buckets creados
