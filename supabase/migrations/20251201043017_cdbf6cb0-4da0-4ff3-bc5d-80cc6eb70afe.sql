-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Admins can view all projects"
  ON public.projects
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and agents can view all projects"
  ON public.projects
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Admins can insert projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update projects"
  ON public.projects
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete projects"
  ON public.projects
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add project_id column to properties table
ALTER TABLE public.properties
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_properties_project_id ON public.properties(project_id);

-- Add updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();