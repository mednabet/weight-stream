-- Add scale and photocell URLs to production lines
ALTER TABLE public.production_lines 
ADD COLUMN scale_url text,
ADD COLUMN photocell_url text;