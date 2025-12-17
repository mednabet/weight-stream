-- Allow supervisors to view operator roles (needed to manage operators)
CREATE POLICY "Supervisors can view operator roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND role = 'operator'::app_role
);