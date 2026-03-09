-- Add specific_role and phase columns to profiles table for detailed role tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS specific_role TEXT,
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'production';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.specific_role IS 'Specific job title (e.g., story_writer, concept_artist, animator)';
COMMENT ON COLUMN public.profiles.phase IS 'Production phase (pre_production, production, post_production, management)';