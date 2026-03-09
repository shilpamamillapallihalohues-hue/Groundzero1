-- AI Model Registry table
CREATE TABLE public.ai_model_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN ('text', 'image', 'vision', 'multimodal')),
  strengths text[] DEFAULT '{}',
  limitations text[] DEFAULT '{}',
  supported_tasks text[] DEFAULT '{}',
  cost_tier text NOT NULL DEFAULT 'medium' CHECK (cost_tier IN ('low', 'medium', 'high', 'premium')),
  speed_tier text NOT NULL DEFAULT 'medium' CHECK (speed_tier IN ('fast', 'medium', 'slow')),
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI Task Definitions table
CREATE TABLE public.ai_task_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_key text NOT NULL UNIQUE,
  task_name text NOT NULL,
  description text,
  task_category text NOT NULL,
  recommended_model_ids text[] DEFAULT '{}',
  alternative_model_ids text[] DEFAULT '{}',
  auto_select_criteria jsonb DEFAULT '{}',
  requires_vision boolean DEFAULT false,
  requires_image_gen boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI Task Outputs (traceability)
CREATE TABLE public.ai_task_outputs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  model_id text NOT NULL,
  model_version text,
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  parameters jsonb DEFAULT '{}',
  seed integer,
  execution_time_ms integer,
  token_usage jsonb DEFAULT '{}',
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User AI Preferences (per project)
CREATE TABLE public.project_ai_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  auto_mode boolean DEFAULT true,
  default_text_model text DEFAULT 'google/gemini-2.5-flash',
  default_image_model text DEFAULT 'google/gemini-2.5-flash-image',
  task_model_overrides jsonb DEFAULT '{}',
  safety_settings jsonb DEFAULT '{
    "prevent_face_likeness": true,
    "prevent_style_drift": true,
    "enforce_look_lock": true
  }',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_model_registry (read-only for all authenticated)
CREATE POLICY "Authenticated users can view models"
ON public.ai_model_registry FOR SELECT
USING (true);

-- RLS Policies for ai_task_definitions
CREATE POLICY "Authenticated users can view task definitions"
ON public.ai_task_definitions FOR SELECT
USING (true);

-- RLS Policies for ai_task_outputs
CREATE POLICY "Authenticated users can view task outputs"
ON public.ai_task_outputs FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create task outputs"
ON public.ai_task_outputs FOR INSERT
WITH CHECK (true);

-- RLS Policies for project_ai_settings
CREATE POLICY "Authenticated users can view project AI settings"
ON public.project_ai_settings FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create project AI settings"
ON public.project_ai_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update project AI settings"
ON public.project_ai_settings FOR UPDATE
USING (true);

-- Insert default models (Lovable AI supported)
INSERT INTO public.ai_model_registry (model_id, display_name, provider, model_type, strengths, limitations, supported_tasks, cost_tier, speed_tier) VALUES
('google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', 'multimodal', 
  ARRAY['Complex reasoning', 'Large context', 'Image+text analysis', 'High accuracy'],
  ARRAY['Higher cost', 'Slower response'],
  ARRAY['script_breakdown', 'scene_analysis', 'risk_estimation', 'complex_analysis'],
  'premium', 'slow'),
('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', 'multimodal',
  ARRAY['Good balance', 'Multimodal', 'Fast', 'Cost effective'],
  ARRAY['Less precise on complex tasks'],
  ARRAY['script_breakdown', 'scene_analysis', 'storyboard_prompts', 'reference_matching', 'asset_detection'],
  'medium', 'fast'),
('google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'Google', 'text',
  ARRAY['Very fast', 'Cheapest', 'Good for simple tasks'],
  ARRAY['Limited reasoning', 'No vision'],
  ARRAY['classification', 'summarization', 'simple_analysis'],
  'low', 'fast'),
('google/gemini-2.5-flash-image', 'Gemini Flash Image', 'Google', 'image',
  ARRAY['Image generation', 'Text-to-image'],
  ARRAY['Limited control'],
  ARRAY['concept_art', 'storyboard_generation', 'character_proxy'],
  'medium', 'medium'),
('google/gemini-3-pro-image-preview', 'Gemini 3 Pro Image', 'Google', 'image',
  ARRAY['Next-gen image quality', 'High fidelity'],
  ARRAY['Preview model', 'Higher cost'],
  ARRAY['concept_art', 'hero_shots', 'final_renders'],
  'premium', 'slow'),
('openai/gpt-5', 'GPT-5', 'OpenAI', 'multimodal',
  ARRAY['Excellent reasoning', 'Long context', 'High accuracy'],
  ARRAY['Expensive', 'Slower'],
  ARRAY['script_breakdown', 'scene_analysis', 'risk_estimation', 'complex_analysis'],
  'premium', 'slow'),
('openai/gpt-5-mini', 'GPT-5 Mini', 'OpenAI', 'multimodal',
  ARRAY['Good performance', 'Lower cost than GPT-5', 'Multimodal'],
  ARRAY['Less powerful than full GPT-5'],
  ARRAY['scene_analysis', 'reference_matching', 'storyboard_prompts'],
  'medium', 'medium'),
('openai/gpt-5-nano', 'GPT-5 Nano', 'OpenAI', 'text',
  ARRAY['Very fast', 'Cost efficient', 'High volume'],
  ARRAY['Lower accuracy', 'Simple tasks only'],
  ARRAY['classification', 'summarization', 'tagging'],
  'low', 'fast');

-- Insert default task definitions
INSERT INTO public.ai_task_definitions (task_key, task_name, description, task_category, recommended_model_ids, alternative_model_ids, requires_vision, requires_image_gen) VALUES
('script_breakdown', 'Script Breakdown', 'Parse and analyze screenplay structure', 'analysis', 
  ARRAY['google/gemini-2.5-flash'], ARRAY['google/gemini-2.5-pro', 'openai/gpt-5'], false, false),
('scene_analysis', 'Scene Analysis', 'Analyze scene requirements and elements', 'analysis',
  ARRAY['google/gemini-2.5-flash'], ARRAY['google/gemini-2.5-pro', 'openai/gpt-5-mini'], false, false),
('storyboard_generation', 'Storyboard Generation', 'Generate storyboard images from prompts', 'generation',
  ARRAY['google/gemini-2.5-flash-image'], ARRAY['google/gemini-3-pro-image-preview'], false, true),
('concept_art', 'Concept Art Generation', 'Generate concept art and visual designs', 'generation',
  ARRAY['google/gemini-2.5-flash-image'], ARRAY['google/gemini-3-pro-image-preview'], false, true),
('character_proxy', 'Character Proxy Generation', 'Generate character reference images', 'generation',
  ARRAY['google/gemini-2.5-flash-image'], ARRAY['google/gemini-3-pro-image-preview'], false, true),
('reference_matching', 'Reference Similarity Matching', 'Find similar reference images', 'analysis',
  ARRAY['google/gemini-2.5-flash'], ARRAY['google/gemini-2.5-pro'], true, false),
('asset_detection', 'Asset Reuse Detection', 'Detect reusable assets across scenes', 'analysis',
  ARRAY['google/gemini-2.5-flash'], ARRAY['openai/gpt-5-mini'], false, false),
('risk_estimation', 'Risk & Cost Estimation', 'Estimate production risks and costs', 'analysis',
  ARRAY['google/gemini-2.5-pro'], ARRAY['openai/gpt-5'], false, false),
('look_extraction', 'Look Profile Extraction', 'Extract visual DNA from concept art', 'analysis',
  ARRAY['google/gemini-2.5-flash'], ARRAY['google/gemini-2.5-pro'], true, false);

-- Trigger for updated_at
CREATE TRIGGER update_ai_model_registry_updated_at
BEFORE UPDATE ON public.ai_model_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_ai_settings_updated_at
BEFORE UPDATE ON public.project_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();