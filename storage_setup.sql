-- 1. Crear el bucket 'venues' si no existe
insert into storage.buckets (id, name, public)
values ('venues', 'venues', true)
on conflict (id) do nothing;

-- 2. Eliminar políticas anteriores para evitar conflictos
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Owners Update" on storage.objects;

-- 3. Política: Todo el mundo puede ver las imágenes (Público)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'venues' );

-- 4. Política: Usuarios autenticados pueden subir imágenes
create policy "Authenticated Upload"
on storage.objects for insert
with check (
  bucket_id = 'venues' 
  and auth.role() = 'authenticated'
);

-- 5. Política: Usuarios pueden actualizar/borrar sus propias imágenes (Opcional)
create policy "Owners Update"
on storage.objects for update
using ( bucket_id = 'venues' and auth.uid() = owner );
