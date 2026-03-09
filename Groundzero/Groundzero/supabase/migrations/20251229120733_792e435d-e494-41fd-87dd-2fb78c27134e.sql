-- Enum for asset categories
CREATE TYPE public.asset_category AS ENUM (
  'environment', 'character', 'prop', 'vehicle', 'creature', 'fx_element'
);

-- Enum for asset detail level
CREATE TYPE public.asset_detail_level AS ENUM (
  'hero', 'mid', 'background', 'proxy'
);

-- Enum for dispatch status
CREATE TYPE public.dispatch_status AS ENUM (
  'pending', 'queued', 'approved', 'dispatched', 'in_progress', 'completed', 'blocked'
);

-- Look Lock Profiles - Visual DNA extracted from approved concept art
CREATE TABLE public.look_lock_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_palette JSONB DEFAULT '[]'::jsonb,
  lighting_logic JSONB DEFAULT '{}'::jsonb,
  material_behavior JSONB DEFAULT '{}'::jsonb,
  scale_proportions JSONB DEFAULT '{}'::jsonb,
  camera_contrast JSONB DEFAULT '{}'::jsonb,
  source_concept_ids UUID[] DEFAULT '{}',
  is_locked BOOLEAN DEFAULT false,
  locked_by UUID REFERENCES public.profiles(id),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Production Assets - Master asset list
CREATE TABLE public.production_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category asset_category NOT NULL,
  description TEXT,
  source_concept_id UUID REFERENCES public.concept_arts(id),
  scene_usage UUID[] DEFAULT '{}',
  shot_usage UUID[] DEFAULT '{}',
  reusability_score INTEGER DEFAULT 0 CHECK (reusability_score >= 0 AND reusability_score <= 100),
  complexity_score INTEGER DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 100),
  owning_department TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'identified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Model Plans - AI-generated modeling specifications
CREATE TABLE public.model_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  detail_level asset_detail_level NOT NULL DEFAULT 'mid',
  poly_density_guidance TEXT,
  texture_resolution TEXT,
  rigging_needs JSONB DEFAULT '{}'::jsonb,
  topology_suggestions TEXT[],
  scale_reference JSONB DEFAULT '{}'::jsonb,
  geometry_groups JSONB DEFAULT '[]'::jsonb,
  material_slots TEXT[],
  texture_sets TEXT[],
  rig_layers TEXT[],
  fx_attachment_points JSONB DEFAULT '[]'::jsonb,
  lod_hierarchy JSONB DEFAULT '[]'::jsonb,
  ai_generated_proxy_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shot Assets - Links assets to specific shots
CREATE TABLE public.shot_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  look_lock_profile_id UUID REFERENCES public.look_lock_profiles(id),
  fx_notes TEXT,
  lighting_notes TEXT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(storyboard_id, asset_id)
);

-- Shot Readiness - Calculated readiness scores per shot
CREATE TABLE public.shot_readiness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL UNIQUE REFERENCES public.storyboards(id) ON DELETE CASCADE,
  asset_readiness_pct INTEGER DEFAULT 0,
  fx_complexity_score INTEGER DEFAULT 0,
  animation_difficulty_score INTEGER DEFAULT 0,
  lighting_cost_score INTEGER DEFAULT 0,
  overall_status TEXT DEFAULT 'blocked',
  missing_assets UUID[] DEFAULT '{}',
  risk_flags TEXT[] DEFAULT '{}',
  ai_recommendations TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Department Dispatch Queue - Approval-gated handoffs
CREATE TABLE public.department_dispatches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  status dispatch_status NOT NULL DEFAULT 'pending',
  context_pack JSONB DEFAULT '{}'::jsonb,
  assets_included UUID[] DEFAULT '{}',
  visual_references TEXT[] DEFAULT '{}',
  constraints JSONB DEFAULT '{}'::jsonb,
  queued_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.look_lock_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_dispatches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for look_lock_profiles
CREATE POLICY "Authenticated users can view look lock profiles" ON public.look_lock_profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create look lock profiles" ON public.look_lock_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update look lock profiles" ON public.look_lock_profiles FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete look lock profiles" ON public.look_lock_profiles FOR DELETE USING (true);

-- RLS Policies for production_assets
CREATE POLICY "Authenticated users can view production assets" ON public.production_assets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create production assets" ON public.production_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update production assets" ON public.production_assets FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete production assets" ON public.production_assets FOR DELETE USING (true);

-- RLS Policies for model_plans
CREATE POLICY "Authenticated users can view model plans" ON public.model_plans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create model plans" ON public.model_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update model plans" ON public.model_plans FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete model plans" ON public.model_plans FOR DELETE USING (true);

-- RLS Policies for shot_assets
CREATE POLICY "Authenticated users can view shot assets" ON public.shot_assets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create shot assets" ON public.shot_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update shot assets" ON public.shot_assets FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete shot assets" ON public.shot_assets FOR DELETE USING (true);

-- RLS Policies for shot_readiness
CREATE POLICY "Authenticated users can view shot readiness" ON public.shot_readiness FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage shot readiness" ON public.shot_readiness FOR ALL USING (true);

-- RLS Policies for department_dispatches
CREATE POLICY "Authenticated users can view dispatches" ON public.department_dispatches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create dispatches" ON public.department_dispatches FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update dispatches" ON public.department_dispatches FOR UPDATE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_look_lock_profiles_updated_at BEFORE UPDATE ON public.look_lock_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_assets_updated_at BEFORE UPDATE ON public.production_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_model_plans_updated_at BEFORE UPDATE ON public.model_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shot_readiness_updated_at BEFORE UPDATE ON public.shot_readiness FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_department_dispatches_updated_at BEFORE UPDATE ON public.department_dispatches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();