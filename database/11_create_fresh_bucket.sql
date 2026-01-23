-- ============================================
-- ARREGLO FINAL: NUEVO BUCKET LIMPIO
-- ============================================
-- Dado que el bucket 'court-images' persiste con error 404,
-- vamos a crear un bucket totalmente nuevo: 'court-photos'.

-- 1. Crear el nuevo bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'court-photos',
    'court-photos',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Asegurar que es público
UPDATE storage.buckets SET public = true WHERE id = 'court-photos';

-- 3. Crear Políticas NUEVAS y LIMPIAS para 'court-photos'

-- Lectura pública (Cualquiera puede ver las fotos)
CREATE POLICY "Public can view court photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'court-photos');

-- Escritura autenticada (Cualquier usuario logueado puede subir)
CREATE POLICY "Authenticated can upload court photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'court-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update court photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'court-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete court photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'court-photos' AND auth.role() = 'authenticated');
