-- Make property-documents bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property-documents';

-- Drop the permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view property documents" ON storage.objects;

-- Create restricted policy for admins and agents only
CREATE POLICY "Admins and agents can view property documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'property-documents' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'agent'::public.app_role)
  )
);

-- Ensure admins and agents can upload documents
DROP POLICY IF EXISTS "Admins can upload property documents" ON storage.objects;
CREATE POLICY "Admins and agents can upload property documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'property-documents' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'agent'::public.app_role)
  )
);

-- Ensure admins can delete documents
DROP POLICY IF EXISTS "Admins can delete property documents" ON storage.objects;
CREATE POLICY "Admins can delete property documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'property-documents' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);