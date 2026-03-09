
-- Generation jobs queue table
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id)
);

-- Indexes for performance
CREATE INDEX idx_generation_jobs_project_status ON public.generation_jobs(project_id, status);
CREATE INDEX idx_generation_jobs_created_by ON public.generation_jobs(created_by);
CREATE INDEX idx_generation_jobs_type ON public.generation_jobs(job_type);

-- Enable RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view jobs in their projects"
  ON public.generation_jobs FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects
    )
  );

CREATE POLICY "Authenticated users can create jobs"
  ON public.generation_jobs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own jobs"
  ON public.generation_jobs FOR UPDATE TO authenticated
  USING (created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;

-- Visual memory table for continuity
CREATE TABLE public.visual_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  visual_data JSONB NOT NULL DEFAULT '{}',
  source_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visual_memory_project ON public.visual_memory(project_id, memory_type);

ALTER TABLE public.visual_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visual memory for accessible projects"
  ON public.visual_memory FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects));

CREATE POLICY "Authenticated users can manage visual memory"
  ON public.visual_memory FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects));
