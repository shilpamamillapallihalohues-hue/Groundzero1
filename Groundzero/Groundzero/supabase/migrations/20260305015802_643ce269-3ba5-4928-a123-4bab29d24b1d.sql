
-- Concept art notes table
CREATE TABLE public.concept_art_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_art_id UUID NOT NULL REFERENCES public.concept_arts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.concept_art_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view concept art notes" 
  ON public.concept_art_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create concept art notes"
  ON public.concept_art_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update own concept art notes"
  ON public.concept_art_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete own concept art notes"
  ON public.concept_art_notes FOR DELETE TO authenticated USING (true);

-- Shot notes table
CREATE TABLE public.shot_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shot_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shot notes"
  ON public.shot_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create shot notes"
  ON public.shot_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shot notes"
  ON public.shot_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete shot notes"
  ON public.shot_notes FOR DELETE TO authenticated USING (true);
