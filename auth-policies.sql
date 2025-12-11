-- Update RLS policies to require authentication for upload/delete
-- Run this in Supabase SQL Editor

-- Drop old public policies
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON public.image_metadata;
DROP POLICY IF EXISTS "Anyone can upload images" ON public.image_metadata;
DROP POLICY IF EXISTS "Anyone can delete images" ON public.image_metadata;

-- Create new policies
-- Anyone can view images (public access)
CREATE POLICY "Anyone can view images"
  ON public.image_metadata FOR SELECT
  USING (true);

-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload"
  ON public.image_metadata FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete"
  ON public.image_metadata FOR DELETE
  TO authenticated
  USING (true);
