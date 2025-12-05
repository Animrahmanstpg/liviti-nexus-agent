-- Create ad_placements table for defining available ad spots
CREATE TABLE public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  width integer NOT NULL,
  height integer NOT NULL,
  location text NOT NULL,
  price_per_day numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create ad_campaigns table for campaign management
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  advertiser_name text NOT NULL,
  advertiser_email text,
  advertiser_type text NOT NULL DEFAULT 'internal', -- 'internal' or 'external'
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create ad_creatives table for actual ads
CREATE TABLE public.ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  placement_id uuid REFERENCES public.ad_placements(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  click_url text NOT NULL,
  headline text,
  description text,
  alt_text text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create ad_impressions table for tracking views
CREATE TABLE public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid REFERENCES public.ad_creatives(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  session_id uuid,
  page_path text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create ad_clicks table for tracking clicks
CREATE TABLE public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid REFERENCES public.ad_creatives(id) ON DELETE CASCADE NOT NULL,
  impression_id uuid REFERENCES public.ad_impressions(id) ON DELETE SET NULL,
  user_id uuid,
  session_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- Ad Placements policies (admin only for management, public read for active)
CREATE POLICY "Admins can manage ad placements" ON public.ad_placements
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active placements" ON public.ad_placements
FOR SELECT USING (is_active = true);

-- Ad Campaigns policies (admin only)
CREATE POLICY "Admins can manage ad campaigns" ON public.ad_campaigns
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Ad Creatives policies (admin management, public read for active)
CREATE POLICY "Admins can manage ad creatives" ON public.ad_creatives
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active creatives" ON public.ad_creatives
FOR SELECT USING (is_active = true);

-- Ad Impressions policies (public insert, admin read)
CREATE POLICY "Anyone can insert impressions" ON public.ad_impressions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view impressions" ON public.ad_impressions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Ad Clicks policies (public insert, admin read)
CREATE POLICY "Anyone can insert clicks" ON public.ad_clicks
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view clicks" ON public.ad_clicks
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true);

-- Storage policies for ad-creatives bucket
CREATE POLICY "Anyone can view ad creatives" ON storage.objects
FOR SELECT USING (bucket_id = 'ad-creatives');

CREATE POLICY "Admins can upload ad creatives" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'ad-creatives' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ad creatives" ON storage.objects
FOR UPDATE USING (bucket_id = 'ad-creatives' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ad creatives" ON storage.objects
FOR DELETE USING (bucket_id = 'ad-creatives' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default ad placements
INSERT INTO public.ad_placements (name, label, width, height, location, price_per_day) VALUES
('mrec_sidebar', 'MREC Sidebar', 300, 250, 'Sidebar sections', 50),
('mrec_content', 'MREC In-Content', 300, 250, 'Within content areas', 40),
('leaderboard_top', 'Leaderboard Top', 728, 90, 'Page header', 100),
('leaderboard_bottom', 'Leaderboard Bottom', 728, 90, 'Page footer', 60),
('wide_skyscraper', 'Wide Skyscraper', 160, 600, 'Sidebar tall', 70),
('half_page', 'Half Page', 300, 600, 'Sidebar large', 80),
('billboard', 'Billboard', 970, 250, 'Top of page', 150),
('native_feed', 'Native Feed', 0, 0, 'In-feed listings', 30);

-- Create updated_at trigger for tables
CREATE TRIGGER update_ad_placements_updated_at
BEFORE UPDATE ON public.ad_placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_campaigns_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_creatives_updated_at
BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();