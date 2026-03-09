-- Create table for 3D model annotations
CREATE TABLE IF NOT EXISTS public.model_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES public.project_deliverables(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  position_z NUMERIC NOT NULL DEFAULT 0,
  camera_position JSONB,
  annotation_text TEXT NOT NULL,
  annotation_type TEXT DEFAULT 'note', -- 'note', 'issue', 'suggestion', 'approved'
  color TEXT DEFAULT '#FFCC00',
  status TEXT DEFAULT 'pending', -- 'pending', 'addressed', 'approved'
  created_by UUID REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to link uploaded assets/references to project assets
CREATE TABLE IF NOT EXISTS public.asset_reference_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'deliverable', 'reference_image', 'concept_art'
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL, -- 'character', 'prop', 'location', 'costume', 'scene', 'shot'
  target_name TEXT NOT NULL,
  target_id UUID, -- Optional reference to specific asset ID if exists
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_model_annotations_deliverable ON public.model_annotations(deliverable_id);
CREATE INDEX idx_asset_reference_links_source ON public.asset_reference_links(source_type, source_id);
CREATE INDEX idx_asset_reference_links_target ON public.asset_reference_links(target_type, target_name);
CREATE INDEX idx_asset_reference_links_project ON public.asset_reference_links(project_id);

-- Enable RLS
ALTER TABLE public.model_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_reference_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_annotations
CREATE POLICY "model_annotations_select_policy" ON public.model_annotations
FOR SELECT USING (true);

CREATE POLICY "model_annotations_insert_policy" ON public.model_annotations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "model_annotations_update_policy" ON public.model_annotations
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "model_annotations_delete_policy" ON public.model_annotations
FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for asset_reference_links
CREATE POLICY "asset_reference_links_select_policy" ON public.asset_reference_links
FOR SELECT USING (true);

CREATE POLICY "asset_reference_links_insert_policy" ON public.asset_reference_links
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "asset_reference_links_update_policy" ON public.asset_reference_links
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "asset_reference_links_delete_policy" ON public.asset_reference_links
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_model_annotations_updated_at
BEFORE UPDATE ON public.model_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();