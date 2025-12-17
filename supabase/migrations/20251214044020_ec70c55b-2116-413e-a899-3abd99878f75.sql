-- Create weight_units table
CREATE TABLE public.weight_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weight_units ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view weight units" 
ON public.weight_units FOR SELECT USING (true);

CREATE POLICY "Admins can insert weight units" 
ON public.weight_units FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weight units" 
ON public.weight_units FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weight units" 
ON public.weight_units FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_weight_units_updated_at
BEFORE UPDATE ON public.weight_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default weight units
INSERT INTO public.weight_units (code, name, symbol, is_default) VALUES
('kg', 'Kilogramme', 'kg', true),
('g', 'Gramme', 'g', false),
('lb', 'Livre', 'lb', false),
('oz', 'Once', 'oz', false);

-- Add weight_unit_id to products table
ALTER TABLE public.products 
ADD COLUMN weight_unit_id UUID REFERENCES public.weight_units(id);

-- Set default weight unit for existing products
UPDATE public.products 
SET weight_unit_id = (SELECT id FROM public.weight_units WHERE is_default = true LIMIT 1);

-- Add weight_unit_id to production_lines table
ALTER TABLE public.production_lines 
ADD COLUMN weight_unit_id UUID REFERENCES public.weight_units(id);

-- Set default weight unit for existing lines
UPDATE public.production_lines 
SET weight_unit_id = (SELECT id FROM public.weight_units WHERE is_default = true LIMIT 1);