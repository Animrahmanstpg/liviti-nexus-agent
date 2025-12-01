-- Create custom_field_groups table
CREATE TABLE public.custom_field_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  is_collapsed BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_field_groups ENABLE ROW LEVEL SECURITY;

-- Admins can manage custom field groups
CREATE POLICY "Admins can view custom field groups"
  ON public.custom_field_groups
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert custom field groups"
  ON public.custom_field_groups
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update custom field groups"
  ON public.custom_field_groups
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete custom field groups"
  ON public.custom_field_groups
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add group_id to custom_fields table
ALTER TABLE public.custom_fields 
ADD COLUMN group_id UUID REFERENCES public.custom_field_groups(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_custom_field_groups_updated_at
  BEFORE UPDATE ON public.custom_field_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_custom_field_groups_display_order ON public.custom_field_groups(display_order);
CREATE INDEX idx_custom_fields_group_id ON public.custom_fields(group_id);