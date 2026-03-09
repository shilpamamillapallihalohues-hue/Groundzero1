-- Add project_id column to work_tasks table
ALTER TABLE public.work_tasks 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_tasks_project_id ON public.work_tasks(project_id);