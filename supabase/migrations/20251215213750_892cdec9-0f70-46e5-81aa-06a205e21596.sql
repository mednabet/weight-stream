-- Add decimal_precision column to weight_units table
ALTER TABLE public.weight_units 
ADD COLUMN decimal_precision integer NOT NULL DEFAULT 3;

-- Update default values based on typical precision for each unit type
COMMENT ON COLUMN public.weight_units.decimal_precision IS 'Number of decimal places to display for this unit';