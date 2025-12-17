-- Create terminals table for kiosk devices
CREATE TABLE public.terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uid text NOT NULL UNIQUE,
  name text NOT NULL,
  line_id uuid REFERENCES public.production_lines(id) ON DELETE SET NULL UNIQUE,
  last_ping timestamp with time zone,
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view terminals"
ON public.terminals
FOR SELECT
USING (true);

CREATE POLICY "Supervisors and admins can insert terminals"
ON public.terminals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors and admins can update terminals"
ON public.terminals
FOR UPDATE
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors and admins can delete terminals"
ON public.terminals
FOR DELETE
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_terminals_updated_at
BEFORE UPDATE ON public.terminals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();