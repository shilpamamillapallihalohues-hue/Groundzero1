-- ============================================
-- SceneCraft Production Pipeline Database Schema
-- Complete SQL for Local PostgreSQL Server
-- Generated: 2026-01-29
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TYPE public.approval_type AS ENUM (
  'script_draft', 'script_final', 'script_lock',
  'concept_internal', 'concept_director',
  'storyboard_internal', 'storyboard_director',
  'animatic_internal', 'animatic_director',
  'technical_plan', 'production_asset', 'post_review', 'client_final'
);

CREATE TYPE public.art_style AS ENUM ('sketch', 'painterly', 'photoreal', 'matte', 'mixed');

CREATE TYPE public.asset_category AS ENUM (
  'environment', 'character', 'prop', 'vehicle', 'creature', 'fx_element'
);

CREATE TYPE public.asset_detail_level AS ENUM ('hero', 'mid', 'background', 'proxy');

CREATE TYPE public.asset_pipeline_status AS ENUM (
  'created', 'assigned', 'in_progress', 'hod_review', 'internal_review',
  'director_review', 'client_review', 'approved', 'rework_required', 'completed'
);

CREATE TYPE public.asset_workflow_status AS ENUM (
  'not_started', 'in_progress', 'internal_review', 'director_review', 'approved', 'locked'
);

CREATE TYPE public.concept_art_type AS ENUM (
  'environment', 'character', 'costume', 'prop', 'set_architecture', 'vehicle', 'creature', 'fx_concept'
);

CREATE TYPE public.dispatch_status AS ENUM (
  'pending', 'queued', 'approved', 'dispatched', 'in_progress', 'completed', 'blocked'
);

CREATE TYPE public.export_format AS ENUM ('fbx', 'glb', 'usd', 'bvh');

CREATE TYPE public.library_approval_status AS ENUM (
  'pending', 'internal_review', 'approved', 'rejected', 'archived'
);

CREATE TYPE public.library_asset_type AS ENUM (
  'model_3d', 'texture', 'rig', 'animation', 'fx_preset', 'environment_pack', 'unreal_asset', 'audio', 'misc'
);

CREATE TYPE public.motion_clip_status AS ENUM (
  'draft', 'extracting', 'ready', 'retargeted', 'approved', 'exported'
);

CREATE TYPE public.production_stage AS ENUM (
  'pre_production', 'production', 'post_production', 'completed', 'archived'
);

CREATE TYPE public.proxy_model_status AS ENUM (
  'draft', 'generating', 'ready', 'approved', 'exported'
);

CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE public.user_role AS ENUM (
  'director', 'producer', 'department_head', 'artist', 'client', 'super_user',
  'production_manager', 'hod', 'vendor', 'script_writer', 'script_supervisor',
  'concept_artist', 'art_director', 'storyboard_artist', 'editor', 'previz_artist',
  'technical_director', 'modeling_artist', 'texturing_artist', 'rigging_artist',
  'animation_artist', 'lighting_artist', 'vfx_artist', 'render_artist', 'compositor'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  team_lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (User profiles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role public.user_role DEFAULT 'artist',
  department_id UUID REFERENCES public.departments(id),
  specific_role TEXT,
  phase TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for team_lead after profiles is created
ALTER TABLE public.departments ADD CONSTRAINT departments_team_lead_id_fkey 
  FOREIGN KEY (team_lead_id) REFERENCES public.profiles(id);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- User Specific Roles
CREATE TABLE public.user_specific_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  specific_role TEXT NOT NULL,
  phase TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, specific_role)
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  thumbnail_url TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scenes
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_number TEXT NOT NULL,
  slugline TEXT NOT NULL,
  description TEXT,
  location TEXT,
  time_of_day TEXT,
  characters TEXT[],
  props TEXT[],
  costumes TEXT[],
  camera_directions TEXT[],
  sound_cues TEXT[],
  estimated_duration INTEGER,
  vfx_required BOOLEAN DEFAULT false,
  vfx_complexity TEXT,
  assigned_departments TEXT[],
  status TEXT DEFAULT 'draft',
  review_status TEXT,
  ai_generated BOOLEAN DEFAULT false,
  human_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- AI & MODEL REGISTRY
-- ============================================

CREATE TABLE public.ai_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_type TEXT NOT NULL,
  cost_tier TEXT DEFAULT 'medium',
  speed_tier TEXT DEFAULT 'medium',
  supported_tasks TEXT[],
  strengths TEXT[],
  limitations TEXT[],
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_task_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL UNIQUE,
  task_name TEXT NOT NULL,
  task_category TEXT NOT NULL,
  description TEXT,
  requires_vision BOOLEAN DEFAULT false,
  requires_image_gen BOOLEAN DEFAULT false,
  recommended_model_ids TEXT[],
  alternative_model_ids TEXT[],
  auto_select_criteria JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_task_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL,
  model_id TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID REFERENCES public.profiles(id),
  input_data JSONB,
  output_data JSONB,
  parameters JSONB,
  seed INTEGER,
  model_version TEXT,
  execution_time_ms INTEGER,
  token_usage JSONB,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_visual_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  preferred_styles JSONB,
  rejected_styles JSONB,
  color_preferences JSONB,
  lighting_preferences JSONB,
  composition_rules JSONB,
  reference_movies TEXT[],
  director_notes TEXT,
  generation_history JSONB,
  feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  default_text_model TEXT,
  default_image_model TEXT,
  image_generation_provider TEXT,
  auto_mode BOOLEAN DEFAULT true,
  task_model_overrides JSONB,
  safety_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- STORYBOARDS & CONCEPT ART
-- ============================================

CREATE TABLE public.storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  shot_number TEXT NOT NULL,
  shot_type TEXT,
  camera_angle TEXT,
  lens_type TEXT,
  lens_focal_length TEXT,
  action TEXT,
  mood TEXT,
  lighting TEXT,
  lighting_mood TEXT,
  lighting_setup TEXT,
  image_url TEXT,
  prompt TEXT,
  version INTEGER DEFAULT 1,
  sort_order INTEGER,
  shot_order INTEGER,
  status TEXT DEFAULT 'draft',
  review_status TEXT,
  shot_locked BOOLEAN DEFAULT false,
  ai_generated BOOLEAN DEFAULT false,
  human_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storyboard_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  position_x NUMERIC,
  position_y NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.concept_arts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  title TEXT NOT NULL,
  description TEXT,
  concept_type public.concept_art_type DEFAULT 'environment',
  art_style public.art_style DEFAULT 'painterly',
  image_url TEXT,
  prompt TEXT,
  generated_prompt TEXT,
  seed INTEGER,
  tags TEXT[],
  metadata JSONB,
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES public.concept_arts(id),
  branch_name TEXT,
  status TEXT DEFAULT 'draft',
  review_status TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  concept_lead_approved BOOLEAN DEFAULT false,
  concept_lead_approved_by UUID,
  concept_lead_approved_at TIMESTAMPTZ,
  art_director_approved BOOLEAN DEFAULT false,
  art_director_approved_by UUID,
  art_director_approved_at TIMESTAMPTZ,
  director_approved BOOLEAN DEFAULT false,
  director_approved_by UUID,
  director_approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.camera_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  direction TEXT,
  speed TEXT,
  duration_frames INTEGER,
  start_position JSONB,
  end_position JSONB,
  easing TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ANIMATICS
-- ============================================

CREATE TABLE public.animatics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  title TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  audio_track_url TEXT,
  duration_seconds NUMERIC,
  frame_timings JSONB,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PRODUCTION ASSETS
-- ============================================

CREATE TABLE public.asset_routing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL,
  routing_order JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.production_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category public.asset_category NOT NULL,
  status TEXT DEFAULT 'pending',
  pipeline_status TEXT DEFAULT 'created',
  thumbnail_url TEXT,
  source_concept_id UUID REFERENCES public.concept_arts(id),
  routing_template_id UUID REFERENCES public.asset_routing_templates(id),
  current_department_index INTEGER DEFAULT 0,
  owning_department TEXT,
  scene_usage TEXT[],
  shot_usage TEXT[],
  complexity_score NUMERIC,
  reusability_score NUMERIC,
  created_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  scene_id UUID REFERENCES public.scenes(id),
  version_number INTEGER DEFAULT 1,
  file_url TEXT,
  thumbnail_url TEXT,
  file_size_bytes BIGINT,
  file_hash TEXT,
  upload_notes TEXT,
  metadata JSONB,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_department_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE REFERENCES public.production_assets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  current_department TEXT NOT NULL,
  department_order_index INTEGER DEFAULT 0,
  workflow_status TEXT DEFAULT 'not_started',
  assigned_artist_id UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_routing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  from_department TEXT,
  to_department TEXT NOT NULL,
  from_department_index INTEGER,
  to_department_index INTEGER NOT NULL,
  moved_by TEXT NOT NULL,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.asset_versions(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT,
  parent_comment_id UUID REFERENCES public.asset_comments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- APPROVALS
-- ============================================

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.asset_versions(id),
  department_id UUID REFERENCES public.departments(id),
  approval_level TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  comments TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  approval_type public.approval_type NOT NULL,
  status TEXT DEFAULT 'pending',
  revision_count INTEGER DEFAULT 0,
  notes TEXT,
  requested_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- LIBRARY ASSETS
-- ============================================

CREATE TABLE public.library_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  asset_type public.library_asset_type NOT NULL,
  thumbnail_url TEXT,
  tags TEXT[],
  metadata JSONB,
  source_project_id UUID REFERENCES public.projects(id),
  source_asset_id UUID,
  owning_department_id UUID REFERENCES public.departments(id),
  global_visibility BOOLEAN DEFAULT false,
  pipeline_entry_point TEXT,
  approval_status public.library_approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.library_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_asset_id UUID NOT NULL REFERENCES public.library_assets(id) ON DELETE CASCADE,
  version_number INTEGER DEFAULT 1,
  file_url TEXT,
  file_size_bytes BIGINT,
  file_hash TEXT,
  changelog TEXT,
  metadata JSONB,
  is_current BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_asset_id UUID NOT NULL REFERENCES public.library_assets(id),
  library_version_id UUID REFERENCES public.library_asset_versions(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  scene_id UUID REFERENCES public.scenes(id),
  shot_id UUID,
  instance_name TEXT,
  instance_notes TEXT,
  current_department TEXT,
  department_order_index INTEGER,
  workflow_status TEXT DEFAULT 'not_started',
  assigned_artist_id UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  title TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SCRIPT & VERSIONS
-- ============================================

CREATE TABLE public.script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  changes_summary TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.script_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_language TEXT DEFAULT 'en',
  target_language TEXT NOT NULL,
  original_content TEXT,
  translated_content TEXT,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PIPELINE STATE
-- ============================================

CREATE TABLE public.project_pipeline_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  current_stage public.production_stage DEFAULT 'pre_production',
  script_locked BOOLEAN DEFAULT false,
  script_locked_at TIMESTAMPTZ,
  script_locked_by UUID REFERENCES public.profiles(id),
  concept_approved BOOLEAN DEFAULT false,
  concept_approved_at TIMESTAMPTZ,
  storyboard_approved BOOLEAN DEFAULT false,
  storyboard_approved_at TIMESTAMPTZ,
  animatic_approved BOOLEAN DEFAULT false,
  animatic_approved_at TIMESTAMPTZ,
  technical_plan_approved BOOLEAN DEFAULT false,
  technical_plan_approved_at TIMESTAMPTZ,
  production_complete BOOLEAN DEFAULT false,
  production_complete_at TIMESTAMPTZ,
  post_complete BOOLEAN DEFAULT false,
  post_complete_at TIMESTAMPTZ,
  client_approved BOOLEAN DEFAULT false,
  client_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.preprod_stage_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT DEFAULT 'unlocked',
  locked_by UUID REFERENCES public.profiles(id),
  locked_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CHARACTER & PROXY MODELS
-- ============================================

CREATE TABLE public.character_proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_range TEXT,
  gender TEXT,
  ethnicity_hints TEXT,
  body_build TEXT,
  height_reference TEXT,
  hair_style TEXT,
  hair_density TEXT,
  facial_hair TEXT,
  facial_structure JSONB,
  distinguishing_features TEXT[],
  front_view_url TEXT,
  side_view_url TEXT,
  three_quarter_view_url TEXT,
  neutral_proxy_url TEXT,
  source_concept_ids TEXT[],
  scene_usage JSONB,
  costume_reference_ids TEXT[],
  emotional_tones JSONB,
  lighting_notes TEXT,
  complexity_rating NUMERIC,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.proxy_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  character_proxy_id UUID REFERENCES public.character_proxies(id),
  scene_id UUID REFERENCES public.scenes(id),
  asset_id UUID,
  name TEXT NOT NULL,
  model_type TEXT,
  source_concept_ids TEXT[],
  model_url TEXT,
  thumbnail_url TEXT,
  vertex_count INTEGER,
  geometry_type TEXT,
  scale_reference JSONB,
  pipeline_notes TEXT,
  generation_params JSONB,
  status public.proxy_model_status DEFAULT 'draft',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.motion_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  proxy_model_id UUID REFERENCES public.proxy_models(id),
  name TEXT NOT NULL,
  source_type TEXT,
  source_file_url TEXT,
  extracted_file_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  frame_count INTEGER,
  fps NUMERIC,
  skeleton_type TEXT,
  status public.motion_clip_status DEFAULT 'draft',
  extraction_metadata JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- VENDORS
-- ============================================

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specializations TEXT[],
  rate_card JSONB,
  sla_terms JSONB,
  status TEXT DEFAULT 'active',
  primary_contact_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  asset_id UUID,
  scene_id UUID REFERENCES public.scenes(id),
  assignment_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  delivery_date DATE,
  notes TEXT,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CHAT SYSTEM
-- ============================================

CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT DEFAULT 'group',
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT DEFAULT 'member',
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES public.profiles(id),
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RENDER FARM & INFRASTRUCTURE
-- ============================================

CREATE TABLE public.render_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_name TEXT NOT NULL,
  ip_address TEXT,
  status TEXT DEFAULT 'offline',
  cpu_cores INTEGER,
  gpu_model TEXT,
  ram_gb INTEGER,
  cpu_usage NUMERIC,
  ram_usage NUMERIC,
  gpu_usage NUMERIC,
  os_type TEXT,
  render_software TEXT[],
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  scene_id UUID REFERENCES public.scenes(id),
  job_name TEXT NOT NULL,
  job_type TEXT,
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'queued',
  assigned_node_id UUID REFERENCES public.render_nodes(id),
  frame_start INTEGER,
  frame_end INTEGER,
  frames_completed INTEGER DEFAULT 0,
  render_settings JSONB,
  output_path TEXT,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  submitted_by UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tool_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  executable_path TEXT NOT NULL,
  version TEXT,
  environment_variables JSONB,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storage_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_name TEXT NOT NULL,
  storage_type TEXT NOT NULL,
  protocol TEXT,
  mount_path TEXT,
  base_path TEXT,
  cloud_provider TEXT,
  bucket_name TEXT,
  region TEXT,
  access_key_encrypted TEXT,
  secret_key_encrypted TEXT,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PAGE PERMISSIONS
-- ============================================

CREATE TABLE public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  can_access BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_key)
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_super_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND role = 'super_user'
  ) OR public.is_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, 
  p_type TEXT, 
  p_title TEXT, 
  p_message TEXT DEFAULT NULL, 
  p_entity_type TEXT DEFAULT NULL, 
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storyboards_updated_at
  BEFORE UPDATE ON public.storyboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_concept_arts_updated_at
  BEFORE UPDATE ON public.concept_arts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_production_assets_updated_at
  BEFORE UPDATE ON public.production_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);

CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

CREATE INDEX idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX idx_scenes_scene_number ON public.scenes(scene_number);

CREATE INDEX idx_storyboards_scene_id ON public.storyboards(scene_id);
CREATE INDEX idx_storyboards_sort_order ON public.storyboards(sort_order);

CREATE INDEX idx_concept_arts_project_id ON public.concept_arts(project_id);
CREATE INDEX idx_concept_arts_scene_id ON public.concept_arts(scene_id);
CREATE INDEX idx_concept_arts_concept_type ON public.concept_arts(concept_type);

CREATE INDEX idx_production_assets_project_id ON public.production_assets(project_id);
CREATE INDEX idx_production_assets_category ON public.production_assets(category);

CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);

CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- ============================================
-- END OF SCHEMA
-- ============================================

-- To import this file:
-- psql -h localhost -U your_username -d your_database -f scenecraft_database_schema.sql
