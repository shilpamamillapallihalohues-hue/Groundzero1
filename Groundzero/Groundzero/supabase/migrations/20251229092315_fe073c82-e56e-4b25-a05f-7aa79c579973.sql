-- Create storyboard comments table for team collaboration
CREATE TABLE public.storyboard_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position_x NUMERIC,
  position_y NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storyboard_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view comments"
ON public.storyboard_comments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.storyboard_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.storyboard_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.storyboard_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_storyboard_comments_updated_at
BEFORE UPDATE ON public.storyboard_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add sort_order column to storyboards for drag-and-drop reordering
ALTER TABLE public.storyboards ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.storyboard_comments;