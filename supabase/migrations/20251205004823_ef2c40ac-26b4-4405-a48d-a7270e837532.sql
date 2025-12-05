-- Allow authenticated users to create campaigns for themselves (external advertisers)
CREATE POLICY "Users can create their own campaigns" ON public.ad_campaigns
FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow users to view their own campaigns
CREATE POLICY "Users can view their own campaigns" ON public.ad_campaigns
FOR SELECT USING (auth.uid() = created_by);