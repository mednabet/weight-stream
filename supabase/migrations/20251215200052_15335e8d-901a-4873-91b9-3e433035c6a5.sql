-- Create production_items table
CREATE TABLE public.production_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.production_tasks(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'underweight', 'overweight')),
  sequence INTEGER NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by task
CREATE INDEX idx_production_items_task_id ON public.production_items(task_id);

-- Enable Row Level Security
ALTER TABLE public.production_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view production items"
ON public.production_items
FOR SELECT
USING (true);

CREATE POLICY "Operators can insert production items"
ON public.production_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.production_tasks 
    WHERE id = task_id AND operator_id = auth.uid()
  )
);

CREATE POLICY "Supervisors and admins can manage production items"
ON public.production_items
FOR ALL
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for production_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_items;