-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Allow admins to upload property images
CREATE POLICY "Admins can upload property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Allow admins to update property images
CREATE POLICY "Admins can update property images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Allow admins to delete property images
CREATE POLICY "Admins can delete property images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Allow everyone to view property images (public bucket)
CREATE POLICY "Anyone can view property images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'property-images');