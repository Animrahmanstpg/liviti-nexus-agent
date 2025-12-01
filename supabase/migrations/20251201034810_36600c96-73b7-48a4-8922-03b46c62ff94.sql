-- Create property_favorites table for agents to bookmark properties
CREATE TABLE IF NOT EXISTS public.property_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Enable RLS on property_favorites
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.property_favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
ON public.property_favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.property_favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_property_favorites_user_id ON public.property_favorites(user_id);
CREATE INDEX idx_property_favorites_property_id ON public.property_favorites(property_id);