-- Add is_active column to products table
ALTER TABLE public.products 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add index for faster filtering
CREATE INDEX idx_products_is_active ON public.products(is_active) WHERE is_active = true;