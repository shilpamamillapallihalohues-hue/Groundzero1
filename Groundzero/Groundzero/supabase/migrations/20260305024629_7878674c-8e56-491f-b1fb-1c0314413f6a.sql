
-- Reference region selections (sub-references)
CREATE TABLE public.reference_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES public.scene_references(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  region_data JSONB NOT NULL, -- {x, y, width, height} as percentages
  image_url TEXT, -- cropped region image URL
  category TEXT DEFAULT 'general',
  asset_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reference_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reference regions" ON public.reference_regions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert reference regions" ON public.reference_regions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update reference regions" ON public.reference_regions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete reference regions" ON public.reference_regions
  FOR DELETE TO authenticated USING (true);

-- Reference collections
CREATE TABLE public.reference_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  collection_type TEXT DEFAULT 'custom', -- character, costume, architecture, lighting, custom
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reference_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collections" ON public.reference_collections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage collections" ON public.reference_collections
  FOR ALL TO authenticated USING (true);

-- Junction table for collection members
CREATE TABLE public.reference_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.reference_collections(id) ON DELETE CASCADE,
  reference_id UUID NOT NULL REFERENCES public.scene_references(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  sort_order INT DEFAULT 0,
  UNIQUE(collection_id, reference_id)
);

ALTER TABLE public.reference_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collection items" ON public.reference_collection_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage collection items" ON public.reference_collection_items
  FOR ALL TO authenticated USING (true);

-- Add collection_id to scene_references for quick filtering (optional)
ALTER TABLE public.scene_references ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.reference_collections(id) ON DELETE SET NULL;
