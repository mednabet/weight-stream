-- Add scale URL to production lines (photocell_url removed - manual weighing)
ALTER TABLE public.production_lines 
ADD COLUMN scale_url text;

-- Drop photocell_url if it exists from a previous migration
ALTER TABLE public.production_lines DROP COLUMN IF EXISTS photocell_url;