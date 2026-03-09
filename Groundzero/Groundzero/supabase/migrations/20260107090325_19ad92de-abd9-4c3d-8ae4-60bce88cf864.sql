-- Library Asset Type Enum
CREATE TYPE public.library_asset_type AS ENUM (
  'model_3d',
  'texture',
  'rig',
  'animation',
  'fx_preset',
  'environment_pack',
  'unreal_asset',
  'audio',
  'misc'
);

-- Library Asset Approval Status
CREATE TYPE public.library_approval_status AS ENUM (
  'pending',
  'internal_review',
  'approved',
  'rejected',
  'archived'
);

-- Library Assets Table
CREATE TABLE public.library_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  asset_type public.library_asset_type NOT NULL,
  owning_department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  approval_status public.library_approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  global_visibility BOOLEAN DEFAULT true,
  tags TEXT[],
  thumbnail_url TEXT,
  pipeline_entry_point TEXT, -- Department name where this asset enters pipeline
  source_project_id UUID REFERENCES public.projects(id), -- If promoted from project
  source_asset_id UUID, -- Original asset ID if promoted
  usage_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library Asset Versions
CREATE TABLE public.library_asset_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_asset_id UUID NOT NULL REFERENCES public.library_assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  preview_url TEXT,
  file_size_bytes BIGINT,
  file_format TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(library_asset_id, version_number)
);

-- Library Usage Log (Audit Trail)
CREATE TABLE public.library_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_asset_id UUID NOT NULL REFERENCES public.library_assets(id),
  library_version_id UUID REFERENCES public.library_asset_versions(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  scene_id UUID REFERENCES public.scenes(id),
  shot_id UUID,
  asset_instance_id UUID,
  used_by UUID REFERENCES public.profiles(id),
  action TEXT DEFAULT 'added', -- added, removed, updated
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Asset Instances (Project-specific copies of library assets)
CREATE TABLE public.asset_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  library_asset_id UUID NOT NULL REFERENCES public.library_assets(id),
  library_version_id UUID REFERENCES public.library_asset_versions(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  scene_id UUID REFERENCES public.scenes(id),
  shot_id UUID,
  current_department TEXT,
  department_order_index INTEGER DEFAULT 0,
  workflow_status TEXT DEFAULT 'not_started',
  assigned_artist_id UUID REFERENCES public.profiles(id),
  instance_name TEXT, -- Can override library name for project context
  instance_notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Library Promotion Requests (for promoting project assets to library)
CREATE TABLE public.library_promotion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_asset_id UUID NOT NULL,
  source_project_id UUID NOT NULL REFERENCES public.projects(id),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  proposed_name TEXT NOT NULL,
  proposed_type public.library_asset_type NOT NULL,
  proposed_department_id UUID REFERENCES public.departments(id),
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_library_asset_id UUID REFERENCES public.library_assets(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_promotion_requests ENABLE ROW LEVEL SECURITY;

-- Library Assets Policies
CREATE POLICY "Users can view approved library assets"
  ON public.library_assets FOR SELECT
  USING (approval_status = 'approved' OR created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin')));

CREATE POLICY "Super users and producers can insert library assets"
  ON public.library_assets FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_user', 'producer', 'hod', 'department_head'))
  );

CREATE POLICY "Super users and producers can update library assets"
  ON public.library_assets FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_user', 'producer', 'director'))
  );

-- Library Versions Policies
CREATE POLICY "Users can view library versions"
  ON public.library_asset_versions FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can insert versions"
  ON public.library_asset_versions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_user', 'producer', 'hod', 'department_head'))
  );

-- Usage Log Policies
CREATE POLICY "Users can view usage logs"
  ON public.library_usage_log FOR SELECT
  USING (true);

CREATE POLICY "Users can insert usage logs"
  ON public.library_usage_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Asset Instances Policies
CREATE POLICY "Users can view asset instances in their projects"
  ON public.asset_instances FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can insert asset instances"
  ON public.asset_instances FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can update asset instances"
  ON public.asset_instances FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Promotion Requests Policies
CREATE POLICY "Users can view promotion requests"
  ON public.library_promotion_requests FOR SELECT
  USING (true);

CREATE POLICY "HODs can create promotion requests"
  ON public.library_promotion_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_user', 'producer', 'hod', 'department_head'))
  );

CREATE POLICY "Directors can update promotion requests"
  ON public.library_promotion_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_user', 'producer', 'director'))
  );

-- Triggers for updated_at
CREATE TRIGGER update_library_assets_updated_at
  BEFORE UPDATE ON public.library_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_instances_updated_at
  BEFORE UPDATE ON public.asset_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_library_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.library_assets
  SET usage_count = usage_count + 1
  WHERE id = NEW.library_asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_library_usage
  AFTER INSERT ON public.library_usage_log
  FOR EACH ROW
  WHEN (NEW.action = 'added')
  EXECUTE FUNCTION public.increment_library_usage();

-- Pipeline entry point mapping
COMMENT ON COLUMN public.library_assets.pipeline_entry_point IS 'Entry point mapping: model_3d->Texturing, rig->Animation, animation->Animation, fx_preset->FX, environment_pack->Lighting, unreal_asset->Lighting';