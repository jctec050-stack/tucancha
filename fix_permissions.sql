-- 1. NO intentamos crear el bucket (ya existe)

-- 2. Limpiamos cualquier política vieja que pueda dar problemas
DROP POLICY IF EXISTS "Public Access Venues" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Venues" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

-- 3. Creamos las políticas de nuevo (Permisos)

-- Todo el mundo puede ver las fotos
CREATE POLICY "Public Access Venues"
ON storage.objects FOR SELECT
USING ( bucket_id = 'venues' );

-- Solo usuarios logueados pueden subir
CREATE POLICY "Auth Upload Venues"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'venues' AND auth.role() = 'authenticated' );
