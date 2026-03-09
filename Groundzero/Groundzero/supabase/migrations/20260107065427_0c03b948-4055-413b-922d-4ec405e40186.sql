-- =============================================
-- SCENECRAFT PRODUCTION PIPELINE SCHEMA
-- Core Stage Gates & Approval Workflow (INCREMENTAL)
-- =============================================

-- Production Stage Enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_stage') THEN
    CREATE TYPE public.production_stage AS ENUM (
      'pre_production',
      'production', 
      'post_production',
      'completed',
      'archived'
    );
  END IF;
END $$;

-- Asset Workflow Status Enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_workflow_status') THEN
    CREATE TYPE public.asset_workflow_status AS ENUM (
      'not_started',
      'in_progress',
      'internal_review',
      'director_review',
      'approved',
      'locked'
    );
  END IF;
END $$;

-- Approval Type Enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_type') THEN
    CREATE TYPE public.approval_type AS ENUM (
      'script_draft',
      'script_final',
      'script_lock',
      'concept_internal',
      'concept_director',
      'storyboard_internal',
      'storyboard_director',
      'animatic_internal',
      'animatic_director',
      'technical_plan',
      'production_asset',
      'post_review',
      'client_final'
    );
  END IF;
END $$;

-- =============================================
-- PROJECT PIPELINE STATE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_pipeline_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  current_stage production_stage NOT NULL DEFAULT 'pre_production',
  
  script_locked BOOLEAN NOT NULL DEFAULT false,
  script_locked_at TIMESTAMPTZ,
  script_locked_by UUID REFERENCES public.profiles(id),
  
  concept_approved BOOLEAN NOT NULL DEFAULT false,
  concept_approved_at TIMESTAMPTZ,
  
  storyboard_approved BOOLEAN NOT NULL DEFAULT false,
  storyboard_approved_at TIMESTAMPTZ,
  
  animatic_approved BOOLEAN NOT NULL DEFAULT false,
  animatic_approved_at TIMESTAMPTZ,
  
  technical_plan_approved BOOLEAN NOT NULL DEFAULT false,
  technical_plan_approved_at TIMESTAMPTZ,
  
  production_complete BOOLEAN NOT NULL DEFAULT false,
  production_complete_at TIMESTAMPTZ,
  
  post_complete BOOLEAN NOT NULL DEFAULT false,
  post_complete_at TIMESTAMPTZ,
  
  client_approved BOOLEAN NOT NULL DEFAULT false,
  client_approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_id)
);

-- =============================================
-- APPROVAL GATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  
  approval_type approval_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  
  requested_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  notes TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SCENE ASSETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.scene_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('environment', 'character', 'creature', 'prop', 'vehicle', 'fx', 'custom')),
  custom_category_name TEXT,
  description TEXT,
  
  workflow_status asset_workflow_status NOT NULL DEFAULT 'not_started',
  current_sector TEXT,
  
  assigned_artist_id UUID REFERENCES public.profiles(id),
  assigned_vendor_id UUID,
  
  planned_start_date DATE,
  planned_delivery_date DATE,
  actual_start_date DATE,
  actual_delivery_date DATE,
  
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  revision_count INTEGER NOT NULL DEFAULT 0,
  
  concept_art_id UUID REFERENCES public.concept_arts(id),
  concept_approved BOOLEAN NOT NULL DEFAULT false,
  
  production_stage production_stage NOT NULL DEFAULT 'pre_production',
  
  thumbnail_url TEXT,
  file_urls JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SECTOR ROUTING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.sector_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_category TEXT NOT NULL,
  sector_order INTEGER NOT NULL,
  sector_name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  
  is_required BOOLEAN NOT NULL DEFAULT true,
  estimated_days INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(asset_category, sector_order)
);

-- Insert default sector routing (ignore conflicts)
INSERT INTO public.sector_routing (asset_category, sector_order, sector_name) VALUES
  ('environment', 1, 'Modeling'),
  ('environment', 2, 'Texturing'),
  ('environment', 3, 'Lighting'),
  ('character', 1, 'Modeling'),
  ('character', 2, 'Rigging'),
  ('character', 3, 'Animation'),
  ('creature', 1, 'Modeling'),
  ('creature', 2, 'Rigging'),
  ('creature', 3, 'Animation'),
  ('prop', 1, 'Modeling'),
  ('prop', 2, 'Texturing'),
  ('vehicle', 1, 'Modeling'),
  ('vehicle', 2, 'Rigging'),
  ('vehicle', 3, 'FX'),
  ('fx', 1, 'FX'),
  ('fx', 2, 'Simulation'),
  ('fx', 3, 'Lighting')
ON CONFLICT (asset_category, sector_order) DO NOTHING;

-- =============================================
-- TECHNICAL PLANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.technical_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  
  production_type TEXT CHECK (production_type IN ('2d', '3d', 'hybrid', 'live_action')),
  software_stack JSONB DEFAULT '[]'::jsonb,
  
  fx_complexity TEXT CHECK (fx_complexity IN ('none', 'low', 'medium', 'high', 'extreme')),
  motion_capture_required BOOLEAN DEFAULT false,
  simulation_feasibility TEXT,
  render_time_estimate TEXT,
  
  estimated_crew_size INTEGER,
  estimated_duration_days INTEGER,
  
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- STAGE TRANSITION LOG
-- =============================================
CREATE TABLE IF NOT EXISTS public.stage_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  from_stage production_stage,
  to_stage production_stage NOT NULL,
  
  triggered_by UUID REFERENCES public.profiles(id),
  trigger_reason TEXT NOT NULL,
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL NEW TABLES
-- =============================================
ALTER TABLE public.project_pipeline_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_transition_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (Drop existing first if any)
-- =============================================

-- Project Pipeline State
DROP POLICY IF EXISTS "Admins full access to pipeline state" ON public.project_pipeline_state;
DROP POLICY IF EXISTS "Users read assigned project pipeline state" ON public.project_pipeline_state;

CREATE POLICY "Admins full access to pipeline state"
  ON public.project_pipeline_state FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read assigned project pipeline state"
  ON public.project_pipeline_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      INNER JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pa.project_id = project_pipeline_state.project_id
        AND pa.user_id = p.user_id
    )
  );

-- Approval Gates
DROP POLICY IF EXISTS "Admins full access to approval gates" ON public.approval_gates;
DROP POLICY IF EXISTS "Users read assigned project approvals" ON public.approval_gates;

CREATE POLICY "Admins full access to approval gates"
  ON public.approval_gates FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read assigned project approvals"
  ON public.approval_gates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      INNER JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pa.project_id = approval_gates.project_id
        AND pa.user_id = p.user_id
    )
  );

-- Scene Assets
DROP POLICY IF EXISTS "Admins full access to scene assets" ON public.scene_assets;
DROP POLICY IF EXISTS "Users read assigned project scene assets" ON public.scene_assets;
DROP POLICY IF EXISTS "Assigned artists can update their assets" ON public.scene_assets;

CREATE POLICY "Admins full access to scene assets"
  ON public.scene_assets FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read assigned project scene assets"
  ON public.scene_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      INNER JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pa.project_id = scene_assets.project_id
        AND pa.user_id = p.user_id
    )
  );

CREATE POLICY "Assigned artists can update their assets"
  ON public.scene_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.id = scene_assets.assigned_artist_id
    )
  );

-- Sector Routing
DROP POLICY IF EXISTS "Authenticated users read sector routing" ON public.sector_routing;
DROP POLICY IF EXISTS "Admins manage sector routing" ON public.sector_routing;

CREATE POLICY "Authenticated users read sector routing"
  ON public.sector_routing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage sector routing"
  ON public.sector_routing FOR ALL
  USING (public.is_admin(auth.uid()));

-- Technical Plans
DROP POLICY IF EXISTS "Admins full access to technical plans" ON public.technical_plans;
DROP POLICY IF EXISTS "Users read assigned project technical plans" ON public.technical_plans;

CREATE POLICY "Admins full access to technical plans"
  ON public.technical_plans FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read assigned project technical plans"
  ON public.technical_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      INNER JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pa.project_id = technical_plans.project_id
        AND pa.user_id = p.user_id
    )
  );

-- Stage Transition Log
DROP POLICY IF EXISTS "Admins full access to transition log" ON public.stage_transition_log;
DROP POLICY IF EXISTS "Users read assigned project transitions" ON public.stage_transition_log;

CREATE POLICY "Admins full access to transition log"
  ON public.stage_transition_log FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read assigned project transitions"
  ON public.stage_transition_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_assignments pa
      INNER JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE pa.project_id = stage_transition_log.project_id
        AND pa.user_id = p.user_id
    )
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
DROP TRIGGER IF EXISTS update_project_pipeline_state_updated_at ON public.project_pipeline_state;
DROP TRIGGER IF EXISTS update_approval_gates_updated_at ON public.approval_gates;
DROP TRIGGER IF EXISTS update_scene_assets_updated_at ON public.scene_assets;
DROP TRIGGER IF EXISTS update_technical_plans_updated_at ON public.technical_plans;

CREATE TRIGGER update_project_pipeline_state_updated_at
  BEFORE UPDATE ON public.project_pipeline_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_gates_updated_at
  BEFORE UPDATE ON public.approval_gates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scene_assets_updated_at
  BEFORE UPDATE ON public.scene_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technical_plans_updated_at
  BEFORE UPDATE ON public.technical_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Auto-create pipeline state for new projects
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_create_pipeline_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_pipeline_state (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_pipeline_state_on_project ON public.projects;
CREATE TRIGGER create_pipeline_state_on_project
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_pipeline_state();

-- =============================================
-- FUNCTION: Check if stage transition is allowed
-- =============================================
CREATE OR REPLACE FUNCTION public.can_transition_stage(
  _project_id UUID,
  _target_stage production_stage
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pipeline_state RECORD;
BEGIN
  SELECT * INTO pipeline_state
  FROM public.project_pipeline_state
  WHERE project_id = _project_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  CASE _target_stage
    WHEN 'production' THEN
      RETURN pipeline_state.script_locked 
         AND pipeline_state.concept_approved 
         AND pipeline_state.storyboard_approved 
         AND pipeline_state.animatic_approved 
         AND pipeline_state.technical_plan_approved;
    
    WHEN 'post_production' THEN
      RETURN pipeline_state.production_complete;
    
    WHEN 'completed' THEN
      RETURN pipeline_state.post_complete AND pipeline_state.client_approved;
    
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;

-- Create pipeline state for existing projects
INSERT INTO public.project_pipeline_state (project_id)
SELECT id FROM public.projects
ON CONFLICT (project_id) DO NOTHING;