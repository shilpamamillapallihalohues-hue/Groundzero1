-- Create workflow_presets table for saving ComfyUI workflow configurations
CREATE TABLE public.workflow_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_presets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view global presets and project presets"
ON public.workflow_presets
FOR SELECT
USING (is_global = true OR project_id IS NOT NULL);

CREATE POLICY "Authenticated users can create presets"
ON public.workflow_presets
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own presets"
ON public.workflow_presets
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own presets"
ON public.workflow_presets
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_presets_updated_at
BEFORE UPDATE ON public.workflow_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default presets
INSERT INTO public.workflow_presets (name, description, config, is_global, is_default) VALUES
(
  'SDXL High Quality',
  'High quality SDXL generation with optimal settings',
  '{
    "checkpoint": "dreamshaperXL",
    "vae": "automatic",
    "sampler": "dpmpp_2m_sde",
    "scheduler": "karras",
    "steps": 40,
    "cfgScale": 7.5,
    "width": 1024,
    "height": 1024,
    "clipSkip": 2,
    "denoise": 1.0,
    "loras": [],
    "controlNets": []
  }'::jsonb,
  true,
  true
),
(
  'Fast Draft',
  'Quick generation for concept exploration',
  '{
    "checkpoint": "dreamshaperXL",
    "vae": "automatic",
    "sampler": "euler_ancestral",
    "scheduler": "normal",
    "steps": 20,
    "cfgScale": 7,
    "width": 768,
    "height": 768,
    "clipSkip": 2,
    "denoise": 1.0,
    "loras": [],
    "controlNets": []
  }'::jsonb,
  true,
  false
),
(
  'Cinematic Wide',
  'Cinematic 21:9 aspect ratio for establishing shots',
  '{
    "checkpoint": "juggernautXL",
    "vae": "automatic",
    "sampler": "dpmpp_2m_sde",
    "scheduler": "karras",
    "steps": 35,
    "cfgScale": 7,
    "width": 1536,
    "height": 640,
    "clipSkip": 2,
    "denoise": 1.0,
    "loras": [{"name": "cinematic_light", "strength": 0.6, "clipStrength": 0.6, "enabled": true}],
    "controlNets": []
  }'::jsonb,
  true,
  false
),
(
  'Character Portrait',
  'Optimized for character close-ups and portraits',
  '{
    "checkpoint": "realvisxlV4",
    "vae": "automatic",
    "sampler": "dpmpp_2m_sde",
    "scheduler": "karras",
    "steps": 45,
    "cfgScale": 6,
    "width": 896,
    "height": 1152,
    "clipSkip": 2,
    "denoise": 1.0,
    "loras": [{"name": "face_detail", "strength": 0.5, "clipStrength": 0.5, "enabled": true}],
    "controlNets": []
  }'::jsonb,
  true,
  false
),
(
  'Concept Sketch',
  'Sketch-style output for early concept exploration',
  '{
    "checkpoint": "protovisionXL",
    "vae": "automatic",
    "sampler": "euler",
    "scheduler": "normal",
    "steps": 25,
    "cfgScale": 8,
    "width": 1024,
    "height": 1024,
    "clipSkip": 2,
    "denoise": 1.0,
    "loras": [{"name": "concept_art_style", "strength": 0.8, "clipStrength": 0.8, "enabled": true}],
    "controlNets": []
  }'::jsonb,
  true,
  false
);