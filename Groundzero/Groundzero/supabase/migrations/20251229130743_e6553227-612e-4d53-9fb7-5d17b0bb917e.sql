-- Create table for character proxies
CREATE TABLE public.character_proxies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_range TEXT,
  facial_structure JSONB DEFAULT '{}'::jsonb,
  hair_style TEXT,
  hair_density TEXT,
  facial_hair TEXT,
  body_build TEXT,
  ethnicity_hints TEXT,
  gender TEXT,
  height_reference TEXT,
  distinguishing_features TEXT[],
  front_view_url TEXT,
  side_view_url TEXT,
  three_quarter_view_url TEXT,
  neutral_proxy_url TEXT,
  source_concept_ids UUID[] DEFAULT '{}'::uuid[],
  scene_usage JSONB DEFAULT '[]'::jsonb,
  costume_reference_ids UUID[] DEFAULT '{}'::uuid[],
  emotional_tones JSONB DEFAULT '{}'::jsonb,
  lighting_notes TEXT,
  complexity_rating INTEGER DEFAULT 50,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for reference searches
CREATE TABLE public.reference_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.production_assets(id) ON DELETE SET NULL,
  character_proxy_id UUID REFERENCES public.character_proxies(id) ON DELETE SET NULL,
  search_query TEXT,
  search_type TEXT NOT NULL DEFAULT 'reference',
  source_type TEXT NOT NULL DEFAULT 'web',
  results JSONB DEFAULT '[]'::jsonb,
  selected_references JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for modeling handoff packs
CREATE TABLE public.modeling_handoff_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.production_assets(id) ON DELETE SET NULL,
  character_proxy_id UUID REFERENCES public.character_proxies(id) ON DELETE SET NULL,
  pack_name TEXT NOT NULL,
  pack_type TEXT NOT NULL DEFAULT 'asset',
  concept_art_ids UUID[] DEFAULT '{}'::uuid[],
  reference_image_ids UUID[] DEFAULT '{}'::uuid[],
  proxy_model_data JSONB DEFAULT '{}'::jsonb,
  scale_notes TEXT,
  complexity_rating INTEGER DEFAULT 50,
  topology_guidance JSONB DEFAULT '{}'::jsonb,
  material_hints JSONB DEFAULT '{}'::jsonb,
  mesh_groups JSONB DEFAULT '[]'::jsonb,
  modeling_brief TEXT,
  status TEXT DEFAULT 'draft',
  exported_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.character_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modeling_handoff_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies for character_proxies
CREATE POLICY "Authenticated users can view character proxies"
  ON public.character_proxies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create character proxies"
  ON public.character_proxies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update character proxies"
  ON public.character_proxies FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete character proxies"
  ON public.character_proxies FOR DELETE
  USING (true);

-- RLS policies for reference_searches
CREATE POLICY "Authenticated users can view reference searches"
  ON public.reference_searches FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reference searches"
  ON public.reference_searches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reference searches"
  ON public.reference_searches FOR DELETE
  USING (true);

-- RLS policies for modeling_handoff_packs
CREATE POLICY "Authenticated users can view handoff packs"
  ON public.modeling_handoff_packs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create handoff packs"
  ON public.modeling_handoff_packs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update handoff packs"
  ON public.modeling_handoff_packs FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete handoff packs"
  ON public.modeling_handoff_packs FOR DELETE
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_character_proxies_updated_at
  BEFORE UPDATE ON public.character_proxies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modeling_handoff_packs_updated_at
  BEFORE UPDATE ON public.modeling_handoff_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();