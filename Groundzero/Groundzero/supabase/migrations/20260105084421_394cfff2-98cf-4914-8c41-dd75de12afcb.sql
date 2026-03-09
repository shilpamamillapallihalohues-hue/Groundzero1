-- Script Versions for comparison
CREATE TABLE public.script_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  changes_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Script Translations
CREATE TABLE public.script_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL,
  original_content TEXT,
  translated_content TEXT,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scene Duration Estimates
CREATE TABLE public.scene_duration_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  ai_estimated_seconds INTEGER,
  manual_estimated_seconds INTEGER,
  dialogue_word_count INTEGER,
  action_complexity_score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Animatics
CREATE TABLE public.animatics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  frame_timings JSONB DEFAULT '[]',
  audio_track_url TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Camera Movements
CREATE TABLE public.camera_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  direction TEXT,
  speed TEXT DEFAULT 'medium',
  start_position JSONB,
  end_position JSONB,
  duration_frames INTEGER,
  easing TEXT DEFAULT 'linear',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shot Lists
CREATE TABLE public.shot_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  exported_at TIMESTAMP WITH TIME ZONE,
  export_format TEXT,
  export_url TEXT,
  shots_data JSONB DEFAULT '[]',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Character Costumes per Scene
CREATE TABLE public.character_costumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  costume_name TEXT NOT NULL,
  description TEXT,
  reference_image_url TEXT,
  color_palette JSONB,
  accessories TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prop Continuity
CREATE TABLE public.prop_continuity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prop_name TEXT NOT NULL,
  description TEXT,
  reference_image_url TEXT,
  scene_appearances UUID[] DEFAULT '{}',
  continuity_notes TEXT,
  issues JSONB DEFAULT '[]',
  status TEXT DEFAULT 'tracking',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Location Scouting
CREATE TABLE public.location_scouting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  address TEXT,
  coordinates JSONB,
  real_photos TEXT[] DEFAULT '{}',
  concept_art_ids UUID[] DEFAULT '{}',
  match_score INTEGER,
  pros TEXT[],
  cons TEXT[],
  cost_estimate NUMERIC,
  availability_notes TEXT,
  status TEXT DEFAULT 'scouting',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Director's Notes Timeline
CREATE TABLE public.director_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  storyboard_id UUID REFERENCES public.storyboards(id) ON DELETE SET NULL,
  note_type TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  timestamp_marker NUMERIC,
  attachments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Department Reviews
CREATE TABLE public.department_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.profiles(id),
  feedback TEXT,
  approval_chain JSONB DEFAULT '[]',
  requested_changes TEXT[],
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget Impact Analysis
CREATE TABLE public.budget_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC,
  vfx_complexity_multiplier NUMERIC DEFAULT 1,
  location_cost NUMERIC DEFAULT 0,
  crew_cost NUMERIC DEFAULT 0,
  equipment_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shooting Schedule
CREATE TABLE public.shooting_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  schedule_data JSONB DEFAULT '[]',
  optimization_notes TEXT,
  ai_suggestions JSONB,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shooting Days
CREATE TABLE public.shooting_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.shooting_schedules(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  shoot_date DATE,
  location TEXT,
  scene_ids UUID[] DEFAULT '{}',
  call_time TIME,
  wrap_time TIME,
  cast_required TEXT[],
  crew_notes TEXT,
  weather_backup_plan TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weather/Lighting Planner
CREATE TABLE public.lighting_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  shooting_day_id UUID REFERENCES public.shooting_days(id) ON DELETE SET NULL,
  target_time_of_day TEXT,
  golden_hour_start TIME,
  golden_hour_end TIME,
  weather_preference TEXT,
  backup_lighting_setup TEXT,
  equipment_needed TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Style Transfer Presets
CREATE TABLE public.style_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference_movie TEXT,
  style_parameters JSONB DEFAULT '{}',
  color_grading JSONB,
  lighting_style TEXT,
  camera_style TEXT,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Continuity Checks
CREATE TABLE public.continuity_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  source_storyboard_id UUID REFERENCES public.storyboards(id),
  target_storyboard_id UUID REFERENCES public.storyboards(id),
  issues_found JSONB DEFAULT '[]',
  severity TEXT DEFAULT 'warning',
  ai_analysis TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Voice Recordings for Voice-to-Storyboard
CREATE TABLE public.voice_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  generated_storyboard_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'processing',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Collaboration Presence (for live editing)
CREATE TABLE public.collaboration_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  asset_id UUID,
  cursor_position JSONB,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, page_key)
);

-- Enable RLS on all tables
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_duration_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animatics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_continuity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_scouting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shooting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shooting_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.continuity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables (authenticated users can access)
CREATE POLICY "Authenticated users can manage script_versions" ON public.script_versions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage script_translations" ON public.script_translations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage scene_duration_estimates" ON public.scene_duration_estimates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage animatics" ON public.animatics FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage camera_movements" ON public.camera_movements FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage shot_lists" ON public.shot_lists FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage character_costumes" ON public.character_costumes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage prop_continuity" ON public.prop_continuity FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage location_scouting" ON public.location_scouting FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage director_notes" ON public.director_notes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage department_reviews" ON public.department_reviews FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage budget_analysis" ON public.budget_analysis FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage shooting_schedules" ON public.shooting_schedules FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage shooting_days" ON public.shooting_days FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage lighting_plans" ON public.lighting_plans FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage style_presets" ON public.style_presets FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage continuity_checks" ON public.continuity_checks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage voice_recordings" ON public.voice_recordings FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage collaboration_presence" ON public.collaboration_presence FOR ALL USING (auth.uid() IS NOT NULL);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.director_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.department_reviews;