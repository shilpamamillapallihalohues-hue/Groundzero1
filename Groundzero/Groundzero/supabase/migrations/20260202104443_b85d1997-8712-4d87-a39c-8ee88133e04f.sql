-- Personal Director Notepad (different from scene-specific notes)
CREATE TABLE public.director_personal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  color TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.director_personal_notes ENABLE ROW LEVEL SECURITY;

-- Directors can only see their own notes
CREATE POLICY "Users can manage their own personal notes"
ON public.director_personal_notes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_director_personal_notes_updated_at
BEFORE UPDATE ON public.director_personal_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();