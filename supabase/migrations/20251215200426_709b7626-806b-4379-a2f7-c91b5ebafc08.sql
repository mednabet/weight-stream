-- Allow operators to insert production tasks for themselves
CREATE POLICY "Operators can insert their own production tasks"
ON public.production_tasks
FOR INSERT
WITH CHECK (
  auth.uid() = operator_id
);

-- Allow operators to update their own tasks (for pause/resume/stop)
CREATE POLICY "Operators can update their own production tasks"
ON public.production_tasks
FOR UPDATE
USING (auth.uid() = operator_id)
WITH CHECK (auth.uid() = operator_id);