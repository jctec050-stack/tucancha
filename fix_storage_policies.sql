-- Script para verificar y arreglar configuración del bucket court-images

-- 1. Verificar que el bucket existe
SELECT * FROM storage.buckets WHERE name = 'court-images';

-- 2. Si no existe, crearlo (ejecutar solo si el SELECT anterior no devuelve nada)
INSERT INTO storage.buckets (id, name, public)
VALUES ('court-images', 'court-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. ELIMINAR todas las políticas existentes del bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload court images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to court images" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;

-- 4. Crear políticas CORRECTAS

-- Permitir a usuarios autenticados SUBIR imágenes
CREATE POLICY "Allow authenticated users to upload court images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'court-images');

-- Permitir a usuarios autenticados ACTUALIZAR sus propias imágenes
CREATE POLICY "Allow authenticated users to update court images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'court-images')
WITH CHECK (bucket_id = 'court-images');

-- Permitir a TODOS (público) LEER las imágenes
CREATE POLICY "Allow public read access to court images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'court-images');

-- Permitir a usuarios autenticados ELIMINAR imágenes
CREATE POLICY "Allow authenticated users to delete court images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'court-images');
