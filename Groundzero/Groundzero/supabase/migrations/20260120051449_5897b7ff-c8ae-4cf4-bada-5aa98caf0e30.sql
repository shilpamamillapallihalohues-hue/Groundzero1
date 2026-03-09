-- Add concept_lead_approved column for 3-step approval workflow
-- Flow: Concept Lead -> Art Director -> Director
ALTER TABLE public.concept_arts 
ADD COLUMN IF NOT EXISTS concept_lead_approved boolean DEFAULT false;

-- Add approval timestamps for each level
ALTER TABLE public.concept_arts 
ADD COLUMN IF NOT EXISTS concept_lead_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS concept_lead_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS art_director_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS art_director_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS director_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS director_approved_by uuid REFERENCES auth.users(id);

-- Add lens and lighting fields to storyboards for enhanced generation
ALTER TABLE public.storyboards
ADD COLUMN IF NOT EXISTS lens_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS lens_focal_length text,
ADD COLUMN IF NOT EXISTS lighting_setup text DEFAULT 'natural',
ADD COLUMN IF NOT EXISTS lighting_mood text;

-- Create index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_concept_arts_approval_status 
ON public.concept_arts(project_id, concept_lead_approved, art_director_approved, director_approved);

-- Add comment explaining the approval workflow
COMMENT ON COLUMN public.concept_arts.concept_lead_approved IS 'First approval step by Concept Art Lead';
COMMENT ON COLUMN public.concept_arts.art_director_approved IS 'Second approval step by Art Director';
COMMENT ON COLUMN public.concept_arts.director_approved IS 'Final approval step by Director';