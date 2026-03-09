-- Add AI provider setting to project_ai_settings
ALTER TABLE public.project_ai_settings 
ADD COLUMN IF NOT EXISTS image_generation_provider TEXT DEFAULT 'lovable' CHECK (image_generation_provider IN ('lovable', 'gemini'));