-- 1. Crear el bucket (Forzado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('venues', 'venues', true);

-- 2. Política de lectura pública
CREATE POLICY "Public Access Venues"
ON storage.objects FOR SELECT
USING ( bucket_id = 'venues' );

-- 3. Política de subida autenticada
CREATE POLICY "Auth Upload Venues"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'venues' AND auth.role() = 'authenticated' );
