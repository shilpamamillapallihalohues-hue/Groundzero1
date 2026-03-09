-- Concept art priority flags
ALTER TABLE public.concept_arts ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;
ALTER TABLE public.concept_arts ADD COLUMN IF NOT EXISTS priority_reason TEXT;