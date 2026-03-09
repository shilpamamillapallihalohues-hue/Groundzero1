-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for chat_rooms table if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  END IF;
END $$;