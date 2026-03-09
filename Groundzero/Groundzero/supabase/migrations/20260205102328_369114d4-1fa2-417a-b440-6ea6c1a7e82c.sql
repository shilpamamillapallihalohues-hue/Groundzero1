-- Add locking and approval fields to script_versions
ALTER TABLE public.script_versions
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'locked_for_production')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS beat_structure JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS estimated_runtime_minutes INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Add scene-level locking and beat information
ALTER TABLE public.scenes
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS beat_tag TEXT,
ADD COLUMN IF NOT EXISTS page_start DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS page_end DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS script_version_id UUID REFERENCES public.script_versions(id);

-- Create screenplay_elements table for structured screenplay content
CREATE TABLE IF NOT EXISTS public.screenplay_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_version_id UUID NOT NULL REFERENCES public.script_versions(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  element_type TEXT NOT NULL CHECK (element_type IN ('scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'note')),
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  page_number DECIMAL(5,2),
  character_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create screenplay_comments table for inline commenting
CREATE TABLE IF NOT EXISTS public.screenplay_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_version_id UUID NOT NULL REFERENCES public.script_versions(id) ON DELETE CASCADE,
  element_id UUID REFERENCES public.screenplay_elements(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note' CHECK (comment_type IN ('note', 'suggestion', 'revision_request', 'approval')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.screenplay_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenplay_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for screenplay_elements
CREATE POLICY "Users can view screenplay elements" ON public.screenplay_elements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super users can manage screenplay elements" ON public.screenplay_elements
  FOR ALL TO authenticated
  USING (public.is_super_user(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Script supervisors can manage screenplay elements" ON public.screenplay_elements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_specific_roles usr
      WHERE usr.user_id = auth.uid()
      AND usr.specific_role IN ('Script Supervisor', 'Script Editor')
    )
  );

-- RLS policies for screenplay_comments
CREATE POLICY "Users can view screenplay comments" ON public.screenplay_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own comments" ON public.screenplay_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Users can update their own comments" ON public.screenplay_comments
  FOR UPDATE TO authenticated
  USING (user_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Super users can manage all comments" ON public.screenplay_comments
  FOR ALL TO authenticated
  USING (public.is_super_user(auth.uid()) OR public.is_admin(auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenplay_elements_version ON public.screenplay_elements(script_version_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_elements_scene ON public.screenplay_elements(scene_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_elements_order ON public.screenplay_elements(script_version_id, order_index);
CREATE INDEX IF NOT EXISTS idx_screenplay_comments_version ON public.screenplay_comments(script_version_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_comments_element ON public.screenplay_comments(element_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_screenplay_elements_updated_at
  BEFORE UPDATE ON public.screenplay_elements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_screenplay_comments_updated_at
  BEFORE UPDATE ON public.screenplay_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();