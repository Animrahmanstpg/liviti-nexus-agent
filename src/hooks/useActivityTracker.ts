import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const useActivityTracker = () => {
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pagesViewedRef = useRef<number>(0);

  const startSession = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      
      sessionIdRef.current = data.id;
      startTimeRef.current = Date.now();
      pagesViewedRef.current = 0;
      
      return data.id;
    } catch (error) {
      console.error("Failed to start session:", error);
      return null;
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      await supabase
        .from("user_sessions")
        .update({
          session_end: new Date().toISOString(),
          duration_seconds: durationSeconds,
          pages_viewed: pagesViewedRef.current,
        })
        .eq("id", sessionIdRef.current);

      sessionIdRef.current = null;
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, []);

  const updateHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      await supabase
        .from("user_sessions")
        .update({
          last_activity: new Date().toISOString(),
          duration_seconds: durationSeconds,
          pages_viewed: pagesViewedRef.current,
        })
        .eq("id", sessionIdRef.current);
    } catch (error) {
      console.error("Failed to update heartbeat:", error);
    }
  }, []);

  const trackPageView = useCallback(async (userId: string | null, pagePath: string) => {
    try {
      pagesViewedRef.current += 1;

      await supabase.from("page_views").insert({
        user_id: userId,
        session_id: sessionIdRef.current,
        page_path: pagePath,
        page_title: document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Failed to track page view:", error);
    }
  }, []);

  useEffect(() => {
    let userId: string | null = null;

    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;

      if (userId && !sessionIdRef.current) {
        await startSession(userId);
        
        // Start heartbeat
        heartbeatRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);
      }

      // Track initial page view
      trackPageView(userId, location.pathname);
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        userId = session.user.id;
        if (!sessionIdRef.current) {
          await startSession(userId);
          heartbeatRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);
        }
      } else if (event === "SIGNED_OUT") {
        await endSession();
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        userId = null;
      }
    });

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateHeartbeat();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`,
          JSON.stringify({
            session_end: new Date().toISOString(),
            duration_seconds: durationSeconds,
            pages_viewed: pagesViewedRef.current,
          })
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  // Track page navigation
  useEffect(() => {
    const trackNavigation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      trackPageView(user?.id || null, location.pathname);
    };

    trackNavigation();
  }, [location.pathname, trackPageView]);

  return {
    sessionId: sessionIdRef.current,
    endSession,
  };
};

export default useActivityTracker;
