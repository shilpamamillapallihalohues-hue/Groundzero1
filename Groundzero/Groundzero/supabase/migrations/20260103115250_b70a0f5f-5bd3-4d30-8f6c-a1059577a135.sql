-- Create project deliverables table for tracking all project assets
CREATE TABLE public.project_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  
  -- Asset info
  title TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('model', 'video', 'image', 'document')),
  department TEXT NOT NULL,
  
  -- File info
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  thumbnail_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view project deliverables"
  ON public.project_deliverables FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create project deliverables"
  ON public.project_deliverables FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project deliverables"
  ON public.project_deliverables FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete project deliverables"
  ON public.project_deliverables FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_project_deliverables_updated_at
  BEFORE UPDATE ON public.project_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create project-deliverables storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-deliverables', 'project-deliverables', true);

-- Storage policies for project-deliverables bucket
CREATE POLICY "Authenticated users can upload project deliverables"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-deliverables' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view project deliverables files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-deliverables');

CREATE POLICY "Authenticated users can update project deliverables files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-deliverables' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project deliverables files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-deliverables' AND auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_project_deliverables_project_id ON public.project_deliverables(project_id);
CREATE INDEX idx_project_deliverables_department ON public.project_deliverables(department);
CREATE INDEX idx_project_deliverables_asset_type ON public.project_deliverables(asset_type);
CREATE INDEX idx_project_deliverables_status ON public.project_deliverables(status);