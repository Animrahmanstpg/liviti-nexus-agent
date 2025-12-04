-- Drop the existing check constraint and recreate with 'price' included
ALTER TABLE public.custom_fields DROP CONSTRAINT IF EXISTS custom_fields_field_type_check;

ALTER TABLE public.custom_fields ADD CONSTRAINT custom_fields_field_type_check 
CHECK (field_type IN ('text', 'number', 'price', 'url', 'email', 'tel', 'date', 'dropdown', 'textarea', 'checkbox'));