-- Update header navigation to include Projects
UPDATE public.site_settings 
SET value = '[
  {"label": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard", "enabled": true, "requiresAuth": false},
  {"label": "Projects", "path": "/projects", "icon": "FolderKanban", "enabled": true, "requiresAuth": false},
  {"label": "Properties", "path": "/properties", "icon": "Building2", "enabled": true, "requiresAuth": false},
  {"label": "Leads", "path": "/leads", "icon": "Users", "enabled": true, "requiresAuth": false},
  {"label": "Favorites", "path": "/favorites", "icon": "Heart", "enabled": true, "requiresAuth": true},
  {"label": "Submissions", "path": "/my-submissions", "icon": "FileText", "enabled": true, "requiresAuth": true}
]'::jsonb
WHERE key = 'header_nav';