import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

interface AdUnitProps {
  placement: string;
  className?: string;
  fallback?: React.ReactNode;
}

interface AdCreative {
  id: string;
  image_url: string;
  click_url: string;
  headline: string | null;
  alt_text: string | null;
  ad_placements: {
    width: number;
    height: number;
  };
}

const AdUnit = ({ placement, className = "", fallback }: AdUnitProps) => {
  const location = useLocation();
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem("ad_session_id");
    if (stored) return stored;
    const newId = crypto.randomUUID();
    sessionStorage.setItem("ad_session_id", newId);
    return newId;
  });

  const { data: creative, isLoading } = useQuery({
    queryKey: ["ad-creative", placement],
    queryFn: async () => {
      // First get the placement
      const { data: placementData, error: placementError } = await supabase
        .from("ad_placements")
        .select("id, width, height")
        .eq("name", placement)
        .eq("is_active", true)
        .single();

      if (placementError || !placementData) return null;

      // Then get an active creative for this placement from an active campaign
      const now = new Date().toISOString().split('T')[0];
      const { data: creativeData, error: creativeError } = await supabase
        .from("ad_creatives")
        .select(`
          id,
          image_url,
          click_url,
          headline,
          alt_text,
          priority,
          ad_campaigns!inner(status, start_date, end_date)
        `)
        .eq("placement_id", placementData.id)
        .eq("is_active", true)
        .eq("ad_campaigns.status", "active")
        .lte("ad_campaigns.start_date", now)
        .gte("ad_campaigns.end_date", now)
        .order("priority", { ascending: false })
        .limit(1)
        .single();

      if (creativeError || !creativeData) return null;

      return {
        ...creativeData,
        ad_placements: {
          width: placementData.width,
          height: placementData.height,
        },
      } as AdCreative;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Record impression
  const recordImpression = useCallback(async () => {
    if (!creative || impressionRecorded) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("ad_impressions").insert({
        creative_id: creative.id,
        user_id: user?.id || null,
        session_id: sessionId,
        page_path: location.pathname,
        user_agent: navigator.userAgent,
      });
      
      setImpressionRecorded(true);
    } catch (error) {
      console.error("Failed to record impression:", error);
    }
  }, [creative, impressionRecorded, sessionId, location.pathname]);

  useEffect(() => {
    recordImpression();
  }, [recordImpression]);

  // Reset impression tracking when creative changes
  useEffect(() => {
    setImpressionRecorded(false);
  }, [creative?.id]);

  // Record click
  const handleClick = async () => {
    if (!creative) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("ad_clicks").insert({
        creative_id: creative.id,
        user_id: user?.id || null,
        session_id: sessionId,
      });
    } catch (error) {
      console.error("Failed to record click:", error);
    }
  };

  if (isLoading) {
    return null; // Don't show loading state for ads
  }

  if (!creative) {
    return fallback || null;
  }

  const { width, height } = creative.ad_placements;

  return (
    <div 
      className={`ad-unit ${className}`}
      style={{
        maxWidth: width > 0 ? width : "100%",
      }}
    >
      <a
        href={creative.click_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block overflow-hidden rounded-lg border border-border/50 hover:border-border transition-colors"
      >
        <img
          src={creative.image_url}
          alt={creative.alt_text || "Advertisement"}
          width={width > 0 ? width : undefined}
          height={height > 0 ? height : undefined}
          className="w-full h-auto"
          loading="lazy"
        />
      </a>
      <span className="text-[10px] text-muted-foreground/50 block text-right mt-0.5">Ad</span>
    </div>
  );
};

export default AdUnit;
