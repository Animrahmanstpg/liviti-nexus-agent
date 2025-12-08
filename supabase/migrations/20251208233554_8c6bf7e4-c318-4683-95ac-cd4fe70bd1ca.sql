-- Add public read policy for projects (similar to properties)
CREATE POLICY "Public can view active projects"
ON public.projects
FOR SELECT
USING (status = 'active');