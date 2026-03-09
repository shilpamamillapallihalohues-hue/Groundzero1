-- Fix RLS policies to allow room creation flow to work properly

-- The issue: when creating a room and then adding self as participant,
-- the is_room_creator check fails because the SELECT policy prevents reading the room

-- Fix 1: Update chat_room_participants INSERT policy to allow self-insertion
DROP POLICY IF EXISTS "Room admins can add participants" ON public.chat_room_participants;
CREATE POLICY "Room admins can add participants" ON public.chat_room_participants
FOR INSERT TO authenticated
WITH CHECK (
  -- Users can always add themselves as participant
  user_id = public.get_profile_id(auth.uid())
  OR
  -- Room creators/admins can add others
  public.is_room_creator(room_id, auth.uid())
  OR
  public.is_room_admin(room_id, auth.uid())
  OR
  -- Super users can add anyone
  public.is_super_user(auth.uid())
);

-- Fix 2: Update chat_rooms SELECT policy to also allow creators to see their rooms
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms
FOR SELECT TO authenticated
USING (
  -- Creator can always see their room
  created_by = public.get_profile_id(auth.uid())
  OR
  -- Participants can see rooms they're in
  EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE chat_room_participants.room_id = chat_rooms.id
      AND chat_room_participants.user_id = public.get_profile_id(auth.uid())
  )
  OR
  -- Super users can see all rooms
  public.is_super_user(auth.uid())
);

-- Fix 3: Update chat_rooms UPDATE policy to use get_profile_id
DROP POLICY IF EXISTS "Room admins can update rooms" ON public.chat_rooms;
CREATE POLICY "Room admins can update rooms" ON public.chat_rooms
FOR UPDATE TO authenticated
USING (
  created_by = public.get_profile_id(auth.uid())
  OR
  EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE chat_room_participants.room_id = chat_rooms.id
      AND chat_room_participants.user_id = public.get_profile_id(auth.uid())
      AND chat_room_participants.role = 'admin'
  )
  OR
  public.is_super_user(auth.uid())
);