-- Create function to check if user is team lead
CREATE OR REPLACE FUNCTION public.is_team_lead(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    INNER JOIN public.profiles p ON p.id = d.team_lead_id
    WHERE p.user_id = _user_id
  )
$$;

-- Create function to get department id for a team lead
CREATE OR REPLACE FUNCTION public.get_team_lead_department(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id
  FROM public.departments d
  INNER JOIN public.profiles p ON p.id = d.team_lead_id
  WHERE p.user_id = _user_id
  LIMIT 1
$$;

-- Drop existing work_tasks policies and recreate with team lead access
DROP POLICY IF EXISTS "Users with work tracking access can manage tasks" ON public.work_tasks;

CREATE POLICY "Work tracking users and team leads can view tasks"
ON public.work_tasks FOR SELECT
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users and team leads can create tasks"
ON public.work_tasks FOR INSERT
TO authenticated
WITH CHECK (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users and team leads can update tasks"
ON public.work_tasks FOR UPDATE
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users can delete tasks"
ON public.work_tasks FOR DELETE
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid())
);

-- Drop existing work_progress_reports policies and recreate
DROP POLICY IF EXISTS "Users with work tracking access can manage reports" ON public.work_progress_reports;

CREATE POLICY "Work tracking users and team leads can view reports"
ON public.work_progress_reports FOR SELECT
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users and team leads can create reports"
ON public.work_progress_reports FOR INSERT
TO authenticated
WITH CHECK (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users and team leads can update reports"
ON public.work_progress_reports FOR UPDATE
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

-- Drop existing work_employees policies and recreate
DROP POLICY IF EXISTS "Users with work tracking access can manage employees" ON public.work_employees;

CREATE POLICY "Work tracking users and team leads can view employees"
ON public.work_employees FOR SELECT
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users and team leads can create employees"
ON public.work_employees FOR INSERT
TO authenticated
WITH CHECK (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users and team leads can update employees"
ON public.work_employees FOR UPDATE
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid()) OR 
  public.is_team_lead(auth.uid())
);

CREATE POLICY "Work tracking users can delete employees"
ON public.work_employees FOR DELETE
TO authenticated
USING (
  public.has_work_tracking_access(auth.uid())
);