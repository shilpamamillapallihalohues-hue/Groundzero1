-- Fix chat_messages RLS policies to use profile ID instead of auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

-- Create fixed INSERT policy using get_profile_id
CREATE POLICY "Users can send messages to their rooms" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = public.get_profile_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE chat_room_participants.room_id = chat_messages.room_id
      AND chat_room_participants.user_id = public.get_profile_id(auth.uid())
  )
);

-- Create fixed SELECT policy using get_profile_id
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_room_participants
    WHERE chat_room_participants.room_id = chat_messages.room_id
      AND chat_room_participants.user_id = public.get_profile_id(auth.uid())
  )
  OR public.is_super_user(auth.uid())
);