-- 1. Add image_url column to courts table
ALTER TABLE public.courts 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create Storage Bucket 'court-images'
-- Note: This might fail if bucket exists, so we wrap in a block or just ignore error in manual execution
INSERT INTO storage.buckets (id, name, public)
VALUES ('court-images', 'court-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
-- Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'court-images' );

-- Allow authenticated users (Owners) to upload images
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'court-images' );

-- Allow authenticated users to update/delete their images (optional but good)
-- Simplified policy: If you are authenticated, you can manage objects in this bucket
-- Ideally, we'd check if the user owns the court, but storage doesn't easy link to courts table
-- For now, authenticated is enough for MVP.
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'court-images' );

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'court-images' );
