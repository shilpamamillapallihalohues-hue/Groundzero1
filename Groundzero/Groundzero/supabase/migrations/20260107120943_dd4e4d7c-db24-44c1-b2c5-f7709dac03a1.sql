-- Pre-Production Stage Locks table to track department approval/lock status
CREATE TABLE public.preprod_stage_locks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- 'script', 'concept_art', 'storyboard', 'edit_lineup', 'animatic', 'technical_planning'
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'in_review', 'approved', 'locked'
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES public.profiles(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, stage)
);

-- Enable RLS
ALTER TABLE public.preprod_stage_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view preprod locks" ON public.preprod_stage_locks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON public.preprod_stage_locks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update" ON public.preprod_stage_locks FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Pre-Production Approvals table for tracking review history
CREATE TABLE public.preprod_approvals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'scene', 'concept', 'storyboard', 'shot', 'animatic', 'tech_spec'
    entity_id UUID NOT NULL,
    approval_level TEXT NOT NULL, -- 'team', 'art_director', 'director', 'producer'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'revision_requested'
    reviewer_id UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.preprod_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approvals" ON public.preprod_approvals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON public.preprod_approvals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update" ON public.preprod_approvals FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Add columns to scenes table for tracking AI generation status
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS human_edited BOOLEAN DEFAULT false;
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft';

-- Add columns to storyboards for tracking AI vs human origin
ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS human_edited BOOLEAN DEFAULT false;
ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft';
ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS shot_locked BOOLEAN DEFAULT false;

-- Add columns to concept_arts for approval tracking
ALTER TABLE public.concept_arts ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft';
ALTER TABLE public.concept_arts ADD COLUMN IF NOT EXISTS art_director_approved BOOLEAN DEFAULT false;
ALTER TABLE public.concept_arts ADD COLUMN IF NOT EXISTS director_approved BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_preprod_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_preprod_stage_locks_updated_at
    BEFORE UPDATE ON public.preprod_stage_locks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_preprod_updated_at();

-- Add shot_order column to storyboards if not exists
ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS shot_order INTEGER;