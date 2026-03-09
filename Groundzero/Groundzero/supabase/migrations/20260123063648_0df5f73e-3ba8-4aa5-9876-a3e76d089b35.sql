-- Create chat rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'direct', -- 'direct', 'group', 'department', 'hierarchy'
  description TEXT,
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat room participants table
CREATE TABLE public.chat_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'file', 'system'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message read receipts table
CREATE TABLE public.chat_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies - users can see rooms they're part of
CREATE POLICY "Users can view rooms they participate in"
  ON public.chat_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room admins can update rooms"
  ON public.chat_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants
      WHERE room_id = chat_rooms.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Participants policies
CREATE POLICY "Users can view participants in their rooms"
  ON public.chat_room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants AS p
      WHERE p.room_id = chat_room_participants.room_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Room admins can add participants"
  ON public.chat_room_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants
      WHERE room_id = chat_room_participants.room_id AND user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = chat_room_participants.room_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own participation"
  ON public.chat_room_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their rooms"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_participants
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their rooms"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_room_participants
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
    )
  );

-- Read receipts policies
CREATE POLICY "Users can view read receipts in their rooms"
  ON public.chat_message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.chat_room_participants p ON p.room_id = m.room_id
      WHERE m.id = chat_message_reads.message_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.chat_message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_chat_room_participants_room ON public.chat_room_participants(room_id);
CREATE INDEX idx_chat_room_participants_user ON public.chat_room_participants(user_id);
CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_message_reads_message ON public.chat_message_reads(message_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_participants;

-- Create function to update timestamps
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();