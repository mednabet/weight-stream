-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  target_weight NUMERIC(10,2) NOT NULL,
  tolerance_min NUMERIC(10,2) NOT NULL,
  tolerance_max NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create production_lines table
CREATE TABLE public.production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create production_tasks table
CREATE TABLE public.production_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_quantity INTEGER NOT NULL,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;

-- Products policies (supervisors and admins can manage)
CREATE POLICY "Authenticated users can view products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors and admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Supervisors and admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors and admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- Production lines policies
CREATE POLICY "Authenticated users can view production lines"
ON public.production_lines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors and admins can insert production lines"
ON public.production_lines FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Supervisors and admins can update production lines"
ON public.production_lines FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors and admins can delete production lines"
ON public.production_lines FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- Production tasks policies
CREATE POLICY "Authenticated users can view production tasks"
ON public.production_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisors and admins can insert production tasks"
ON public.production_tasks FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Supervisors and admins can update production tasks"
ON public.production_tasks FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors and admins can delete production tasks"
ON public.production_tasks FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_production_lines_updated_at
  BEFORE UPDATE ON public.production_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_production_tasks_updated_at
  BEFORE UPDATE ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();