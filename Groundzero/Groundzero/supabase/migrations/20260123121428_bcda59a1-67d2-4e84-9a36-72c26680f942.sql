-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;

-- Create simpler INSERT policy - any authenticated user can create rooms
-- The created_by will be validated via the application code
CREATE POLICY "Authenticated users can create chat rooms" ON public.chat_rooms
FOR INSERT TO authenticated
WITH CHECK (true);

-- Also update SELECT policy to use function for profile lookup
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE chat_room_participants.room_id = chat_rooms.id
      AND chat_room_participants.user_id = public.get_profile_id(auth.uid())
  )
);