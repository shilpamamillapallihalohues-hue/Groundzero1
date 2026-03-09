-- Add submitted_by and submitted_at columns to track who submits for review
ALTER TABLE public.script_versions 
ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
