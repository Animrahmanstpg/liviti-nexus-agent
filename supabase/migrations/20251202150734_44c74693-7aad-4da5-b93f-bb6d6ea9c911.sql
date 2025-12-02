-- Create eoi_purchasers table for storing purchaser details
CREATE TABLE public.eoi_purchasers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eoi_id UUID NOT NULL REFERENCES public.eoi_submissions(id) ON DELETE CASCADE,
  purchaser_number INTEGER NOT NULL CHECK (purchaser_number IN (1, 2)),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  is_smsf BOOLEAN NOT NULL DEFAULT false,
  street_address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eoi_solicitors table for solicitor information
CREATE TABLE public.eoi_solicitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eoi_id UUID NOT NULL REFERENCES public.eoi_submissions(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  service_address TEXT,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to eoi_submissions table
ALTER TABLE public.eoi_submissions 
  ADD COLUMN deposit_percent NUMERIC DEFAULT 10,
  ADD COLUMN firb_status TEXT DEFAULT 'na',
  ADD COLUMN holding_deposit NUMERIC,
  ADD COLUMN special_condition TEXT,
  ADD COLUMN holding_deposit_receipt_path TEXT,
  ADD COLUMN purchaser_1_id_path TEXT,
  ADD COLUMN purchaser_2_id_path TEXT;

-- Enable RLS on new tables
ALTER TABLE public.eoi_purchasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eoi_solicitors ENABLE ROW LEVEL SECURITY;

-- RLS policies for eoi_purchasers
CREATE POLICY "Admins can view all eoi purchasers"
  ON public.eoi_purchasers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view purchasers for their EOIs"
  ON public.eoi_purchasers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eoi_submissions 
    WHERE eoi_submissions.id = eoi_purchasers.eoi_id 
    AND eoi_submissions.agent_id = auth.uid()
  ));

CREATE POLICY "Agents can insert purchasers for their EOIs"
  ON public.eoi_purchasers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.eoi_submissions 
    WHERE eoi_submissions.id = eoi_purchasers.eoi_id 
    AND eoi_submissions.agent_id = auth.uid()
  ));

CREATE POLICY "Admins can delete eoi purchasers"
  ON public.eoi_purchasers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for eoi_solicitors
CREATE POLICY "Admins can view all eoi solicitors"
  ON public.eoi_solicitors FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view solicitors for their EOIs"
  ON public.eoi_solicitors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eoi_submissions 
    WHERE eoi_submissions.id = eoi_solicitors.eoi_id 
    AND eoi_submissions.agent_id = auth.uid()
  ));

CREATE POLICY "Agents can insert solicitors for their EOIs"
  ON public.eoi_solicitors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.eoi_submissions 
    WHERE eoi_submissions.id = eoi_solicitors.eoi_id 
    AND eoi_submissions.agent_id = auth.uid()
  ));

CREATE POLICY "Admins can delete eoi solicitors"
  ON public.eoi_solicitors FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for EOI documents
INSERT INTO storage.buckets (id, name, public) VALUES ('eoi-documents', 'eoi-documents', false);

-- Storage policies for eoi-documents bucket
CREATE POLICY "Admins can view all EOI documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'eoi-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view their own EOI documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'eoi-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Agents can upload EOI documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'eoi-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete EOI documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'eoi-documents' AND has_role(auth.uid(), 'admin'::app_role));