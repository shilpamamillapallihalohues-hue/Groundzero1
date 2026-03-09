-- Add indexes to concept_arts table for faster queries
CREATE INDEX IF NOT EXISTS idx_concept_arts_project_id ON public.concept_arts(project_id);
CREATE INDEX IF NOT EXISTS idx_concept_arts_created_at ON public.concept_arts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concept_arts_project_created ON public.concept_arts(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concept_arts_status ON public.concept_arts(status);
CREATE INDEX IF NOT EXISTS idx_concept_arts_is_approved ON public.concept_arts(is_approved);

-- Add indexes to profiles table for faster auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Add indexes to scenes table
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_number ON public.scenes(scene_number);

-- Add indexes to projects table
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);