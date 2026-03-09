-- Fix overly permissive concept_arts RLS policies
DROP POLICY IF EXISTS "Authenticated users can view concept arts" ON public.concept_arts;
DROP POLICY IF EXISTS "Authenticated users can create concept arts" ON public.concept_arts;
DROP POLICY IF EXISTS "Authenticated users can update concept arts" ON public.concept_arts;
DROP POLICY IF EXISTS "Authenticated users can delete concept arts" ON public.concept_arts;

-- Create project-scoped policies
CREATE POLICY "Users can view concept arts from assigned projects"
  ON public.concept_arts FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_assignments WHERE user_id = auth.uid()
    ) OR public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
  );

CREATE POLICY "Users can create concept arts in assigned projects"
  ON public.concept_arts FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_assignments WHERE user_id = auth.uid()
    ) OR public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
  );

CREATE POLICY "Users can update concept arts in assigned projects"
  ON public.concept_arts FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_assignments WHERE user_id = auth.uid()
    ) OR public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
  );

CREATE POLICY "Users can delete concept arts in assigned projects"
  ON public.concept_arts FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_assignments WHERE user_id = auth.uid()
    ) OR public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
  );