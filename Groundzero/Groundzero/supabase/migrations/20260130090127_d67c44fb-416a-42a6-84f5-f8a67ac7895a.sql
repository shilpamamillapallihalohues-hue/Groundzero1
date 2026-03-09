-- Create enum for data confidence levels
CREATE TYPE data_confidence AS ENUM ('verified', 'estimated', 'unknown');

-- Create enum for location types
CREATE TYPE location_type AS ENUM ('film_studio', 'backlot', 'permanent_set', 'indoor_stage', 'outdoor_location', 'heritage_zone', 'urban_zone', 'rural_zone');

-- Create table for discovered/aggregated locations
CREATE TABLE public.discovered_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT NOT NULL,
  location_type location_type NOT NULL DEFAULT 'film_studio',
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  address TEXT,
  
  -- Spatial data with confidence
  square_footage NUMERIC,
  square_footage_confidence data_confidence DEFAULT 'unknown',
  ceiling_height_ft NUMERIC,
  ceiling_height_confidence data_confidence DEFAULT 'unknown',
  usable_floor_area NUMERIC,
  floor_area_confidence data_confidence DEFAULT 'unknown',
  
  -- Camera & Production feasibility
  wide_shot_feasible BOOLEAN,
  wide_shot_confidence data_confidence DEFAULT 'unknown',
  crane_dolly_feasible BOOLEAN,
  crane_dolly_confidence data_confidence DEFAULT 'unknown',
  multi_camera_feasible BOOLEAN,
  multi_camera_confidence data_confidence DEFAULT 'unknown',
  drone_allowed BOOLEAN,
  drone_confidence data_confidence DEFAULT 'unknown',
  
  -- Virtual Production suitability
  green_screen_feasible BOOLEAN,
  green_screen_confidence data_confidence DEFAULT 'unknown',
  led_volume_possible BOOLEAN,
  led_volume_confidence data_confidence DEFAULT 'unknown',
  indoor_stage_adaptable BOOLEAN,
  indoor_stage_confidence data_confidence DEFAULT 'unknown',
  vp_readiness_score INTEGER DEFAULT 0, -- 0-100
  
  -- Sound & Control
  sound_control_level TEXT, -- 'high', 'medium', 'low'
  sound_control_confidence data_confidence DEFAULT 'unknown',
  
  -- Source tracking
  data_source TEXT NOT NULL, -- 'website', 'google_maps', 'article', 'wikipedia', 'manual'
  source_url TEXT,
  source_name TEXT,
  
  -- Metadata
  is_indoor BOOLEAN DEFAULT true,
  amenities TEXT[],
  photos TEXT[],
  contact_info JSONB,
  operating_hours TEXT,
  cost_estimate_per_day NUMERIC,
  
  -- Manual override support
  is_manually_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for scene-to-location suggestions
CREATE TABLE public.location_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.discovered_locations(id),
  
  -- Suggestion type
  suggestion_type TEXT NOT NULL, -- 'real_location', 'studio_set', 'hybrid', 'virtual_production'
  
  -- Matching scores
  overall_match_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  space_suitability_score INTEGER DEFAULT 0,
  height_feasibility_score INTEGER DEFAULT 0,
  camera_movement_score INTEGER DEFAULT 0,
  sound_control_score INTEGER DEFAULT 0,
  vp_readiness_score INTEGER DEFAULT 0,
  
  -- Requirements analysis
  scene_requirements JSONB, -- parsed from scene data
  location_capabilities JSONB, -- what the location offers
  gap_analysis JSONB, -- what's missing/needs workaround
  
  -- AI reasoning
  ai_notes TEXT,
  risk_assumptions TEXT[],
  workarounds TEXT[],
  recommendations TEXT[],
  
  -- Status
  status TEXT DEFAULT 'suggested', -- 'suggested', 'shortlisted', 'approved', 'rejected'
  rank INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for manual location uploads (future compatibility)
CREATE TABLE public.manual_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Core info
  location_name TEXT NOT NULL,
  location_type location_type NOT NULL,
  city TEXT,
  state TEXT,
  address TEXT,
  
  -- Verified spatial data
  square_footage NUMERIC,
  ceiling_height_ft NUMERIC,
  usable_floor_area NUMERIC,
  
  -- Verified capabilities
  wide_shot_feasible BOOLEAN,
  crane_dolly_feasible BOOLEAN,
  multi_camera_feasible BOOLEAN,
  drone_allowed BOOLEAN,
  green_screen_feasible BOOLEAN,
  led_volume_possible BOOLEAN,
  sound_control_level TEXT,
  vp_readiness_score INTEGER,
  
  -- Metadata
  is_indoor BOOLEAN DEFAULT true,
  amenities TEXT[],
  photos TEXT[],
  contact_info JSONB,
  cost_per_day NUMERIC,
  notes TEXT,
  
  -- Approval workflow
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'locked'
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  is_locked BOOLEAN DEFAULT false,
  
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discovered_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for discovered_locations (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view discovered locations"
ON public.discovered_locations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage discovered locations"
ON public.discovered_locations FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_super_user(auth.uid()));

-- RLS policies for location_suggestions
CREATE POLICY "Users can view suggestions for their projects"
ON public.location_suggestions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create suggestions"
ON public.location_suggestions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their suggestions"
ON public.location_suggestions FOR UPDATE
TO authenticated
USING (true);

-- RLS policies for manual_locations
CREATE POLICY "Users can view manual locations"
ON public.manual_locations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their manual locations"
ON public.manual_locations FOR ALL
TO authenticated
USING (uploaded_by = public.get_profile_id(auth.uid()) OR public.is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_discovered_locations_updated_at
  BEFORE UPDATE ON public.discovered_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_suggestions_updated_at
  BEFORE UPDATE ON public.location_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manual_locations_updated_at
  BEFORE UPDATE ON public.manual_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_discovered_locations_type ON public.discovered_locations(location_type);
CREATE INDEX idx_discovered_locations_city ON public.discovered_locations(city);
CREATE INDEX idx_location_suggestions_scene ON public.location_suggestions(scene_id);
CREATE INDEX idx_location_suggestions_project ON public.location_suggestions(project_id);
CREATE INDEX idx_manual_locations_project ON public.manual_locations(project_id);