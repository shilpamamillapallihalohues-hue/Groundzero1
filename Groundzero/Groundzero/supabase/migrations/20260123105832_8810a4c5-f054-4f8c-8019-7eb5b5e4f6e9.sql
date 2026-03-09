-- Create a security definer function to check if user is a room admin
CREATE OR REPLACE FUNCTION public.is_room_admin(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Create a security definer function to check if user is room creator
CREATE OR REPLACE FUNCTION public.is_room_creator(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_rooms
    WHERE id = _room_id
      AND created_by = _user_id
  )
$$;

-- Create a security definer function to check if user is a room participant
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE room_id = _room_id
      AND user_id = _user_id
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Room admins can add participants" ON public.chat_room_participants;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_room_participants;

-- Create new policies using security definer functions
CREATE POLICY "Room admins can add participants" 
ON public.chat_room_participants 
FOR INSERT 
WITH CHECK (
  public.is_room_creator(room_id, auth.uid()) 
  OR public.is_room_admin(room_id, auth.uid())
  OR user_id = auth.uid()  -- Allow users to add themselves (for joining rooms)
);

CREATE POLICY "Users can view participants in their rooms" 
ON public.chat_room_participants 
FOR SELECT 
USING (
  public.is_room_participant(room_id, auth.uid())
);

-- Also fix delete policy if needed
DROP POLICY IF EXISTS "Room admins can remove participants" ON public.chat_room_participants;
CREATE POLICY "Room admins can remove participants" 
ON public.chat_room_participants 
FOR DELETE 
USING (
  public.is_room_creator(room_id, auth.uid()) 
  OR public.is_room_admin(room_id, auth.uid())
  OR user_id = auth.uid()  -- Users can remove themselves
);