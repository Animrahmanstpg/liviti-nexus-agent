-- Create EOI submissions table
CREATE TABLE public.eoi_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Offer submissions table
CREATE TABLE public.offer_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  terms TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eoi_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_submissions ENABLE ROW LEVEL SECURITY;

-- EOI Submissions RLS Policies
CREATE POLICY "Agents can view their own EOI submissions"
ON public.eoi_submissions FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Admins can view all EOI submissions"
ON public.eoi_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can insert EOI submissions"
ON public.eoi_submissions FOR INSERT
WITH CHECK (auth.uid() = agent_id AND (has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update EOI submissions"
ON public.eoi_submissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete EOI submissions"
ON public.eoi_submissions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Offer Submissions RLS Policies
CREATE POLICY "Agents can view their own offer submissions"
ON public.offer_submissions FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Admins can view all offer submissions"
ON public.offer_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can insert offer submissions"
ON public.offer_submissions FOR INSERT
WITH CHECK (auth.uid() = agent_id AND (has_role(auth.uid(), 'agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can update offer submissions"
ON public.offer_submissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete offer submissions"
ON public.offer_submissions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_eoi_submissions_updated_at
BEFORE UPDATE ON public.eoi_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offer_submissions_updated_at
BEFORE UPDATE ON public.offer_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();