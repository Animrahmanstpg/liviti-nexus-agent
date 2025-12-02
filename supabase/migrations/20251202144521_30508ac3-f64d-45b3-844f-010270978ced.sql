-- Add images array column to properties table for multiple images
ALTER TABLE public.properties 
ADD COLUMN images text[] DEFAULT '{}';

-- Migrate existing image to images array if it exists
UPDATE public.properties 
SET images = ARRAY[image] 
WHERE image IS NOT NULL AND image != '';