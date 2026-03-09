-- Create scene_references table for storing reference images per scene
CREATE TABLE public.scene_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT,
  image_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'upload',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scene_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies - using valid user_role enum values (director, producer, department_head, artist, client)
CREATE POLICY "Users can view scene references for their projects"
ON public.scene_references
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa 
    WHERE pa.project_id = scene_references.project_id 
    AND pa.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('director', 'producer')
  )
);

CREATE POLICY "Users can insert scene references for assigned projects"
ON public.scene_references
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa 
    WHERE pa.project_id = scene_references.project_id 
    AND pa.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('director', 'producer')
  )
);

CREATE POLICY "Users can update their own scene references"
ON public.scene_references
FOR UPDATE
USING (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('director', 'producer')
  )
);

CREATE POLICY "Users can delete their own scene references"
ON public.scene_references
FOR DELETE
USING (
  created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('director', 'producer')
  )
);

-- Create indexes
CREATE INDEX idx_scene_references_scene_id ON public.scene_references(scene_id);
CREATE INDEX idx_scene_references_project_id ON public.scene_references(project_id);
CREATE INDEX idx_scene_references_category ON public.scene_references(category);

-- Add trigger for updated_at
CREATE TRIGGER update_scene_references_updated_at
BEFORE UPDATE ON public.scene_references
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();