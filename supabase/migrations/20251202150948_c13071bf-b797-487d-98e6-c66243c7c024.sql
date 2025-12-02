-- Make lead_id nullable in eoi_submissions since we now capture purchaser details directly
ALTER TABLE public.eoi_submissions ALTER COLUMN lead_id DROP NOT NULL;