
-- Restrict sensitive tables to authenticated role only
DROP POLICY IF EXISTS "Admins and agents can view all leads" ON public.leads;
CREATE POLICY "Admins and agents can view all leads" ON public.leads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'agent'::app_role));

DROP POLICY IF EXISTS "Admins can view all eoi purchasers" ON public.eoi_purchasers;
CREATE POLICY "Admins can view all eoi purchasers" ON public.eoi_purchasers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Agents can view purchasers for their EOIs" ON public.eoi_purchasers;
CREATE POLICY "Agents can view purchasers for their EOIs" ON public.eoi_purchasers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM eoi_submissions WHERE eoi_submissions.id = eoi_purchasers.eoi_id AND eoi_submissions.agent_id = auth.uid()));

DROP POLICY IF EXISTS "Agents can insert purchasers for their EOIs" ON public.eoi_purchasers;
CREATE POLICY "Agents can insert purchasers for their EOIs" ON public.eoi_purchasers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM eoi_submissions WHERE eoi_submissions.id = eoi_purchasers.eoi_id AND eoi_submissions.agent_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can delete eoi purchasers" ON public.eoi_purchasers;
CREATE POLICY "Admins can delete eoi purchasers" ON public.eoi_purchasers
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- Tighten analytics inserts: must match user's own id (or be null only for unauthenticated, which is now disallowed)
DROP POLICY IF EXISTS "Authenticated users can insert property views" ON public.property_views;
CREATE POLICY "Authenticated users can insert property views" ON public.property_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert page views" ON public.page_views;
CREATE POLICY "Authenticated users can insert page views" ON public.page_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert impressions" ON public.ad_impressions;
CREATE POLICY "Authenticated users can insert impressions" ON public.ad_impressions
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert clicks" ON public.ad_clicks;
CREATE POLICY "Authenticated users can insert clicks" ON public.ad_clicks
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
