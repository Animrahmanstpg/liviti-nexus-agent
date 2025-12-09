-- Update the handle_new_user function to assign 'agent' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Assign 'agent' role by default to all new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');
  
  RETURN NEW;
END;
$$;

-- Add a stage column to eoi_submissions for tracking EOI progress
ALTER TABLE public.eoi_submissions 
ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'offer_submitted';

-- Update existing records to have a stage based on their status
UPDATE public.eoi_submissions 
SET stage = CASE 
  WHEN status = 'approved' THEN 'offer_accepted'
  ELSE 'offer_submitted'
END
WHERE stage = 'offer_submitted' OR stage IS NULL;