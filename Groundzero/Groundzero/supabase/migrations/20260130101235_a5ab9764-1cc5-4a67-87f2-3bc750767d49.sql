-- Add VFX breakdown fields to scenes table
ALTER TABLE public.scenes
ADD COLUMN IF NOT EXISTS vfx_notes text,
ADD COLUMN IF NOT EXISTS vfx_elements text[],
ADD COLUMN IF NOT EXISTS production_method text DEFAULT 'live_action',
ADD COLUMN IF NOT EXISTS animation_cost_estimate numeric,
ADD COLUMN IF NOT EXISTS live_action_cost_estimate numeric,
ADD COLUMN IF NOT EXISTS recommended_method text,
ADD COLUMN IF NOT EXISTS vfx_breakdown jsonb DEFAULT '{}';

-- Add VFX fields to storyboards/shots table
ALTER TABLE public.storyboards
ADD COLUMN IF NOT EXISTS vfx_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vfx_elements text[],
ADD COLUMN IF NOT EXISTS vfx_notes text,
ADD COLUMN IF NOT EXISTS production_method text DEFAULT 'live_action',
ADD COLUMN IF NOT EXISTS animation_cost_estimate numeric,
ADD COLUMN IF NOT EXISTS live_action_cost_estimate numeric,
ADD COLUMN IF NOT EXISTS recommended_method text,
ADD COLUMN IF NOT EXISTS vfx_complexity text DEFAULT 'low';

-- Create VFX breakdown analysis table for detailed tracking
CREATE TABLE IF NOT EXISTS public.vfx_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  scene_id uuid REFERENCES public.scenes(id) ON DELETE CASCADE,
  shot_id uuid REFERENCES public.storyboards(id) ON DELETE CASCADE,
  element_name text NOT NULL,
  element_type text NOT NULL, -- 'cgi', 'compositing', 'cleanup', 'matte_painting', 'motion_capture', 'simulation'
  complexity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'extreme'
  animation_hours_estimate numeric,
  live_action_hours_estimate numeric,
  animation_cost_estimate numeric,
  live_action_cost_estimate numeric,
  recommended_method text, -- 'animation', 'live_action', 'hybrid'
  recommendation_reason text,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'in_progress', 'completed'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vfx_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view VFX analysis"
ON public.vfx_analysis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create VFX analysis"
ON public.vfx_analysis FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update VFX analysis"
ON public.vfx_analysis FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete VFX analysis"
ON public.vfx_analysis FOR DELETE TO authenticated USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vfx_analysis_project ON public.vfx_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_vfx_analysis_scene ON public.vfx_analysis(scene_id);

-- Update trigger
CREATE TRIGGER update_vfx_analysis_updated_at
BEFORE UPDATE ON public.vfx_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();