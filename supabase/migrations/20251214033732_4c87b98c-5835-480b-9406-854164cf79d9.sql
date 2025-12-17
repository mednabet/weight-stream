-- Function to deactivate production line when terminal is unassigned
CREATE OR REPLACE FUNCTION public.deactivate_line_on_terminal_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When terminal is deleted or line_id is changed/removed
  IF TG_OP = 'DELETE' THEN
    -- Deactivate the line that was assigned to this terminal
    IF OLD.line_id IS NOT NULL THEN
      UPDATE public.production_lines
      SET is_active = false
      WHERE id = OLD.line_id AND is_active = true;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If line_id changed (terminal reassigned or unassigned)
    IF OLD.line_id IS DISTINCT FROM NEW.line_id THEN
      -- Deactivate the OLD line that lost its terminal
      IF OLD.line_id IS NOT NULL THEN
        UPDATE public.production_lines
        SET is_active = false
        WHERE id = OLD.line_id AND is_active = true;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on terminals table
CREATE TRIGGER deactivate_line_on_terminal_change_trigger
AFTER UPDATE OR DELETE ON public.terminals
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_line_on_terminal_change();