-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;

-- Create a helper function to get profile id from auth uid
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create new INSERT policy that checks against profile id
CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
FOR INSERT
WITH CHECK (created_by = public.get_profile_id(auth.uid()));