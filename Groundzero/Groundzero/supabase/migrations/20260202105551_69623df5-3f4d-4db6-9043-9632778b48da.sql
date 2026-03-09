-- Table to store character facial reconstruction data
CREATE TABLE public.character_facial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  character_name TEXT NOT NULL,
  
  -- Character attributes
  gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
  age_range TEXT CHECK (age_range IN ('child', 'young_adult', 'adult', 'middle_aged', 'elderly')),
  ethnicity_hints TEXT,
  skin_tone TEXT,
  face_shape TEXT CHECK (face_shape IN ('oval', 'round', 'square', 'heart', 'oblong', 'diamond')),
  eye_shape TEXT,
  eye_color TEXT,
  nose_type TEXT,
  lip_shape TEXT,
  hair_style TEXT,
  hair_color TEXT,
  facial_hair TEXT,
  distinguishing_features TEXT[],
  
  -- Generation settings
  stylization TEXT DEFAULT 'realistic' CHECK (stylization IN ('realistic', 'semi_real', 'stylized')),
  output_resolution TEXT DEFAULT '2k' CHECK (output_resolution IN ('2k', '4k')),
  output_format TEXT DEFAULT 'png' CHECK (output_format IN ('png', 'exr')),
  generate_expressions BOOLEAN DEFAULT false,
  neutral_background BOOLEAN DEFAULT true,
  
  -- Reference images (stored as JSON array)
  reference_images JSONB DEFAULT '[]'::jsonb,
  
  -- Generated turnaround views (stored as JSON array)
  generated_views JSONB DEFAULT '[]'::jsonb,
  
  -- KeenTools-compatible landmarks data
  landmarks_data JSONB,
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'approved')),
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.character_facial_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view facial data"
  ON public.character_facial_data FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert facial data"
  ON public.character_facial_data FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update facial data"
  ON public.character_facial_data FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Creators and admins can delete facial data"
  ON public.character_facial_data FOR DELETE
  USING (
    created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR public.is_super_user(auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_character_facial_data_updated_at
  BEFORE UPDATE ON public.character_facial_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_character_facial_data_project ON public.character_facial_data(project_id);
CREATE INDEX idx_character_facial_data_status ON public.character_facial_data(status);