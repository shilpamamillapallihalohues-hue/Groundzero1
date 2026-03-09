
-- Add priority column to generation_jobs for rate limiting and worker ordering
ALTER TABLE public.generation_jobs 
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 1;

-- Add unique constraint on visual_memory for upsert support
-- First check if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visual_memory_project_type_entity_unique'
  ) THEN
    ALTER TABLE public.visual_memory 
      ADD CONSTRAINT visual_memory_project_type_entity_unique 
      UNIQUE (project_id, memory_type, entity_name);
  END IF;
END $$;

-- Create a function to check rate limits at DB level
CREATE OR REPLACE FUNCTION public.check_generation_rate_limit(
  _project_id uuid,
  _user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  concurrent_count integer;
  queued_count integer;
  max_concurrent integer := 5;
  max_queued integer := 10;
BEGIN
  SELECT count(*) INTO concurrent_count
  FROM generation_jobs
  WHERE project_id = _project_id AND status = 'processing';

  SELECT count(*) INTO queued_count
  FROM generation_jobs
  WHERE project_id = _project_id AND status = 'queued'
    AND (_user_id IS NULL OR created_by = _user_id::text);

  RETURN jsonb_build_object(
    'allowed', concurrent_count < max_concurrent AND queued_count < max_queued,
    'concurrent', concurrent_count,
    'queued', queued_count,
    'max_concurrent', max_concurrent,
    'max_queued', max_queued
  );
END;
$$;

-- Index for worker polling performance
CREATE INDEX IF NOT EXISTS idx_generation_jobs_worker_poll 
  ON public.generation_jobs (status, priority DESC, created_at ASC) 
  WHERE status = 'queued';
