
-- Add reference_type column to scene_references for classifying how the reference is used
ALTER TABLE public.scene_references 
ADD COLUMN IF NOT EXISTS reference_type text DEFAULT 'reference_image';

-- Add a comment for documentation
COMMENT ON COLUMN public.scene_references.reference_type IS 'Type of reference: concept_art, story_panel, reference_image, mood_board, texture_sample, color_palette, character_sheet, environment_ref';
