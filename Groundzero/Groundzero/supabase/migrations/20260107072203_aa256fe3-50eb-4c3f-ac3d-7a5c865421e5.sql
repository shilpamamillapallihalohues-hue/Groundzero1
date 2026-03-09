-- Create client_review_sessions table for tracking review sessions
CREATE TABLE IF NOT EXISTS public.client_review_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  scene_id UUID REFERENCES public.scenes(id),
  shot_id UUID,
  asset_id UUID,
  review_type TEXT NOT NULL CHECK (review_type IN ('project', 'scene', 'shot', 'asset')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_review_comments table for timestamped comments
CREATE TABLE IF NOT EXISTS public.client_review_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_session_id UUID NOT NULL REFERENCES public.client_review_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  shot_id UUID,
  asset_id UUID,
  version_id UUID,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  comment_text TEXT NOT NULL,
  timestamp_marker NUMERIC,
  frame_number INTEGER,
  annotation_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_approvals table for tracking client approval decisions
CREATE TABLE IF NOT EXISTS public.client_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id),
  shot_id UUID,
  asset_id UUID,
  version_id UUID,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_required', 'rejected')),
  notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset_versions table for version control
CREATE TABLE IF NOT EXISTS public.asset_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  scene_id UUID REFERENCES public.scenes(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  thumbnail_url TEXT,
  file_hash TEXT,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id),
  upload_notes TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_review_sessions
CREATE POLICY "Clients can view their own review sessions"
  ON public.client_review_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND (p.id = client_id OR p.role IN ('director', 'producer'))
    )
  );

CREATE POLICY "Clients can create review sessions"
  ON public.client_review_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = client_id
    )
  );

-- RLS policies for client_review_comments
CREATE POLICY "Comments visible to project team and client"
  ON public.client_review_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can add comments"
  ON public.client_review_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = client_id
    )
  );

CREATE POLICY "Clients can update their own comments"
  ON public.client_review_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = client_id
    )
  );

-- RLS policies for client_approvals
CREATE POLICY "Approvals visible to all team members"
  ON public.client_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create approvals"
  ON public.client_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'client'
      AND p.id = client_id
    )
  );

-- RLS policies for asset_versions
CREATE POLICY "Versions visible to project team"
  ON public.asset_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can create versions"
  ON public.asset_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = uploaded_by
    )
  );

CREATE POLICY "Artists can update their versions"
  ON public.asset_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = uploaded_by
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('director', 'producer')
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_client_review_comments_updated_at
  BEFORE UPDATE ON public.client_review_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_review_sessions_project ON public.client_review_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_client_review_sessions_client ON public.client_review_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_review_comments_session ON public.client_review_comments(review_session_id);
CREATE INDEX IF NOT EXISTS idx_client_approvals_project ON public.client_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset ON public.asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_project ON public.asset_versions(project_id);