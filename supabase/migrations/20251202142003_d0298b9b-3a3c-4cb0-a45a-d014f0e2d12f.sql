-- Create property_documents table
CREATE TABLE public.property_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  document_type text NOT NULL DEFAULT 'other',
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Admins can manage documents
CREATE POLICY "Admins can insert property documents"
ON public.property_documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete property documents"
ON public.property_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins and agents can view documents
CREATE POLICY "Admins and agents can view property documents"
ON public.property_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));

-- Create storage bucket for property documents
INSERT INTO storage.buckets (id, name, public) VALUES ('property-documents', 'property-documents', true);

-- Storage policies for property documents bucket
CREATE POLICY "Admins can upload property documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'property-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete property documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'property-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view property documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-documents');