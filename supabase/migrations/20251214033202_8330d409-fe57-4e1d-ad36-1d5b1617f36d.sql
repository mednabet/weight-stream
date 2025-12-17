-- Add ip_address column to terminals table
ALTER TABLE public.terminals ADD COLUMN ip_address text;

-- Add a comment for clarity
COMMENT ON COLUMN public.terminals.device_uid IS 'Computer name or unique identifier';
COMMENT ON COLUMN public.terminals.ip_address IS 'IP address of the terminal';