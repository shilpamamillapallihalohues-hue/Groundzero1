-- Create enum for proxy model status
CREATE TYPE proxy_model_status AS ENUM ('draft', 'generating', 'ready', 'approved', 'exported');

-- Create enum for motion clip status
CREATE TYPE motion_clip_status AS ENUM ('draft', 'extracting', 'ready', 'retargeted', 'approved', 'exported');

-- Create enum for export format
CREATE TYPE export_format AS ENUM ('fbx', 'glb', 'usd', 'bvh');

-- Table for 3D Proxy Models
CREATE TABLE public.proxy_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  character_proxy_id UUID REFERENCES public.character_proxies(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.production_assets(id) ON DELETE SET NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  status proxy_model_status NOT NULL DEFAULT 'draft',
  
  -- Source references
  source_concept_ids UUID[] DEFAULT '{}'::uuid[],
  source_image_urls TEXT[] DEFAULT '{}'::text[],
  orthographic_views JSONB DEFAULT '{}'::jsonb, -- front, side, back, top views
  
  -- Model properties
  pose_type TEXT DEFAULT 'a_pose', -- a_pose, t_pose, neutral
  poly_count INTEGER,
  has_clean_topology BOOLEAN DEFAULT false,
  scale_reference JSONB DEFAULT '{}'::jsonb, -- height, unit system
  
  -- Materials
  placeholder_materials JSONB DEFAULT '[]'::jsonb, -- material slots with basic colors
  
  -- Export info
  exported_formats export_format[] DEFAULT '{}'::export_format[],
  model_file_urls JSONB DEFAULT '{}'::jsonb, -- format -> url mapping
  thumbnail_url TEXT,
  
  -- AI metadata
  ai_model_used TEXT,
  generation_params JSONB DEFAULT '{}'::jsonb,
  topology_notes TEXT,
  known_limitations TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id)
);

-- Table for Motion Clips (extracted from reference videos)
CREATE TABLE public.motion_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  proxy_model_id UUID REFERENCES public.proxy_models(id) ON DELETE SET NULL,
  character_proxy_id UUID REFERENCES public.character_proxies(id) ON DELETE SET NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  status motion_clip_status NOT NULL DEFAULT 'draft',
  
  -- Source reference
  reference_video_url TEXT,
  reference_video_thumbnail TEXT,
  video_frame_range JSONB DEFAULT '{}'::jsonb, -- start_frame, end_frame, fps
  
  -- Scene/shot linkage
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  storyboard_id UUID REFERENCES public.storyboards(id) ON DELETE SET NULL,
  
  -- Motion properties
  motion_type TEXT DEFAULT 'body', -- body, facial, full
  has_facial_animation BOOLEAN DEFAULT false,
  skeleton_type TEXT, -- humanoid, quadruped, custom
  frame_count INTEGER,
  duration_seconds NUMERIC,
  
  -- Export info
  exported_formats export_format[] DEFAULT '{}'::export_format[],
  animation_file_urls JSONB DEFAULT '{}'::jsonb, -- format -> url mapping
  
  -- AI metadata
  ai_model_used TEXT,
  extraction_params JSONB DEFAULT '{}'::jsonb,
  retarget_settings JSONB DEFAULT '{}'::jsonb,
  known_limitations TEXT[],
  
  -- Compliance
  is_actor_likeness BOOLEAN DEFAULT false,
  likeness_cleared BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id)
);

-- Table for Animation Handoff Packs (combines proxy + motion for artist handoff)
CREATE TABLE public.animation_handoff_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Pack info
  pack_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, ready, exported, handed_off
  
  -- Linked assets
  proxy_model_id UUID REFERENCES public.proxy_models(id) ON DELETE SET NULL,
  motion_clip_ids UUID[] DEFAULT '{}'::uuid[],
  reference_image_ids UUID[] DEFAULT '{}'::uuid[],
  concept_art_ids UUID[] DEFAULT '{}'::uuid[],
  
  -- Scene context
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  shot_ids UUID[] DEFAULT '{}'::uuid[],
  
  -- Artist notes
  modeling_notes TEXT,
  animation_notes TEXT,
  rigging_requirements JSONB DEFAULT '{}'::jsonb,
  known_limitations TEXT[],
  
  -- Export
  exported_at TIMESTAMP WITH TIME ZONE,
  export_bundle_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.proxy_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motion_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animation_handoff_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proxy_models
CREATE POLICY "Authenticated users can view proxy models" ON public.proxy_models
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create proxy models" ON public.proxy_models
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update proxy models" ON public.proxy_models
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete proxy models" ON public.proxy_models
  FOR DELETE USING (true);

-- RLS Policies for motion_clips
CREATE POLICY "Authenticated users can view motion clips" ON public.motion_clips
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create motion clips" ON public.motion_clips
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update motion clips" ON public.motion_clips
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete motion clips" ON public.motion_clips
  FOR DELETE USING (true);

-- RLS Policies for animation_handoff_packs
CREATE POLICY "Authenticated users can view animation handoff packs" ON public.animation_handoff_packs
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create animation handoff packs" ON public.animation_handoff_packs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update animation handoff packs" ON public.animation_handoff_packs
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete animation handoff packs" ON public.animation_handoff_packs
  FOR DELETE USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_proxy_models_updated_at
  BEFORE UPDATE ON public.proxy_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_motion_clips_updated_at
  BEFORE UPDATE ON public.motion_clips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_animation_handoff_packs_updated_at
  BEFORE UPDATE ON public.animation_handoff_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for 3D assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proxy-assets', 'proxy-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for proxy-assets bucket
CREATE POLICY "Public can view proxy assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'proxy-assets');
CREATE POLICY "Authenticated users can upload proxy assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'proxy-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update proxy assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'proxy-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete proxy assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'proxy-assets' AND auth.role() = 'authenticated');