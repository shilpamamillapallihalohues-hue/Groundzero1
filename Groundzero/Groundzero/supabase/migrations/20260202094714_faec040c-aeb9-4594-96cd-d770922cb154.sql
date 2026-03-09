-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Art Directors can insert creative context" ON public.creative_context_documents;

-- Create new INSERT policy that includes script_supervisor
CREATE POLICY "Authorized roles can insert creative context"
ON public.creative_context_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('art_director', 'director', 'super_user', 'producer', 'script_supervisor')
  )
);

-- Also update the management policy to include script_supervisor for UPDATE/DELETE
DROP POLICY IF EXISTS "Directors and Admins can manage creative context" ON public.creative_context_documents;

CREATE POLICY "Authorized roles can manage creative context"
ON public.creative_context_documents
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('director', 'super_user', 'producer', 'art_director', 'script_supervisor')
  )
);