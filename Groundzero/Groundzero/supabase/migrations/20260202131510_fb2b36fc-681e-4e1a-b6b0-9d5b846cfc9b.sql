-- Create asset review presentations table for PPT uploads
CREATE TABLE public.asset_review_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  uploaded_by UUID REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  director_notes TEXT,
  annotations JSONB DEFAULT '[]'::jsonb,
  slide_images JSONB DEFAULT '[]'::jsonb,
  current_slide INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_presentations_project ON public.asset_review_presentations(project_id);
CREATE INDEX idx_presentations_status ON public.asset_review_presentations(status);
CREATE INDEX idx_presentations_uploaded_by ON public.asset_review_presentations(uploaded_by);

-- Enable RLS
ALTER TABLE public.asset_review_presentations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view presentations"
ON public.asset_review_presentations
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert presentations"
ON public.asset_review_presentations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders and directors can update presentations"
ON public.asset_review_presentations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    uploaded_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    public.can_approve(auth.uid())
  )
);

CREATE POLICY "Uploaders can delete their own presentations"
ON public.asset_review_presentations
FOR DELETE
USING (
  uploaded_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_presentations_updated_at
BEFORE UPDATE ON public.asset_review_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for presentations
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-presentations', 'asset-presentations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for asset-presentations bucket
CREATE POLICY "Anyone can view presentations"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-presentations');

CREATE POLICY "Authenticated users can upload presentations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'asset-presentations' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own presentations"
ON storage.objects FOR UPDATE
USING (bucket_id = 'asset-presentations' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own presentations"
ON storage.objects FOR DELETE
USING (bucket_id = 'asset-presentations' AND auth.uid() IS NOT NULL);