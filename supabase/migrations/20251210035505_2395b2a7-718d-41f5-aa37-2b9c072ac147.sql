-- Drop existing permissive INSERT policies on analytics tables
DROP POLICY IF EXISTS "Anyone can insert impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.ad_clicks;
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
DROP POLICY IF EXISTS "Anyone can insert property views" ON public.property_views;

-- Create new policies that require authentication
CREATE POLICY "Authenticated users can insert impressions" 
ON public.ad_impressions 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert clicks" 
ON public.ad_clicks 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert page views" 
ON public.page_views 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert property views" 
ON public.property_views 
FOR INSERT 
TO authenticated
WITH CHECK (true);