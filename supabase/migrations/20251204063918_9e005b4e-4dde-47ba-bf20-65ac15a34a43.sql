-- Create table for site settings including navigation and branding
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage site settings
CREATE POLICY "Admins can view site settings"
ON public.site_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete site settings"
ON public.site_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Public read policy for navigation items (needed for layout)
CREATE POLICY "Anyone can view navigation settings"
ON public.site_settings
FOR SELECT
USING (key IN ('header_nav', 'footer_nav', 'site_logo'));

-- Create trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default navigation settings
INSERT INTO public.site_settings (key, value) VALUES
('header_nav', '[
  {"label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard", "enabled": true, "requiresAuth": false},
  {"label": "Properties", "path": "/properties", "icon": "Building2", "enabled": true, "requiresAuth": false},
  {"label": "Leads", "path": "/leads", "icon": "Users", "enabled": true, "requiresAuth": false},
  {"label": "Favorites", "path": "/favorites", "icon": "Heart", "enabled": true, "requiresAuth": true},
  {"label": "Submissions", "path": "/my-submissions", "icon": "FileText", "enabled": true, "requiresAuth": true}
]'::jsonb),
('footer_nav', '[]'::jsonb),
('site_logo', '{"url": "", "alt": "ST Trinity"}'::jsonb);