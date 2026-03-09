-- Update is_room_creator to compare against profile id
CREATE OR REPLACE FUNCTION public.is_room_creator(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_rooms
    WHERE id = _room_id
      AND created_by = public.get_profile_id(_user_id)
  )
$$;

-- Update is_room_admin to compare against profile id
CREATE OR REPLACE FUNCTION public.is_room_admin(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE room_id = _room_id
      AND user_id = public.get_profile_id(_user_id)
      AND role = 'admin'
  )
$$;

-- Update is_room_participant to compare against profile id
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE room_id = _room_id
      AND user_id = public.get_profile_id(_user_id)
  )
$$;

-- Update chat_room_participants INSERT policy to use profile id
DROP POLICY IF EXISTS "Room admins can add participants" ON public.chat_room_participants;
CREATE POLICY "Room admins can add participants" ON public.chat_room_participants
FOR INSERT
WITH CHECK (
  is_room_creator(room_id, auth.uid()) 
  OR is_room_admin(room_id, auth.uid()) 
  OR (user_id = public.get_profile_id(auth.uid()))
);

-- Update chat_room_participants DELETE policy to use profile id
DROP POLICY IF EXISTS "Room admins can remove participants" ON public.chat_room_participants;
CREATE POLICY "Room admins can remove participants" ON public.chat_room_participants
FOR DELETE
USING (
  is_room_creator(room_id, auth.uid()) 
  OR is_room_admin(room_id, auth.uid()) 
  OR (user_id = public.get_profile_id(auth.uid()))
);

-- Update chat_room_participants UPDATE policy to use profile id
DROP POLICY IF EXISTS "Users can update their own participation" ON public.chat_room_participants;
CREATE POLICY "Users can update their own participation" ON public.chat_room_participants
FOR UPDATE
USING (user_id = public.get_profile_id(auth.uid()));