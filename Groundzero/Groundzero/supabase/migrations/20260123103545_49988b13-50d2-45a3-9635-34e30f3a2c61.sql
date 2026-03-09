-- Fix the chat_room_participants INSERT policy that has a bug (self-referencing room_id)
-- The policy incorrectly had: chat_room_participants_1.room_id = chat_room_participants_1.room_id
-- It should check if the current user is admin of the room they're adding participants to

DROP POLICY IF EXISTS "Room admins can add participants" ON public.chat_room_participants;

CREATE POLICY "Room admins can add participants" 
ON public.chat_room_participants 
FOR INSERT 
WITH CHECK (
  -- Room creator can add participants
  EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE chat_rooms.id = chat_room_participants.room_id
    AND chat_rooms.created_by = auth.uid()
  )
  OR
  -- Existing admin can add participants  
  EXISTS (
    SELECT 1 FROM chat_room_participants existing
    WHERE existing.room_id = chat_room_participants.room_id
    AND existing.user_id = auth.uid()
    AND existing.role = 'admin'
  )
);