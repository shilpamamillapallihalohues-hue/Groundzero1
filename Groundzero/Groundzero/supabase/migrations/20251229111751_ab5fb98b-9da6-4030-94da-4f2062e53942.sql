-- Create enum for concept art types
CREATE TYPE public.concept_art_type AS ENUM (
  'environment',
  'character',
  'costume',
  'prop',
  'set_architecture',
  'vehicle',
  'creature',
  'fx_concept'
);

-- Create enum for art styles
CREATE TYPE public.art_style AS ENUM (
  'sketch',
  'painterly',
  'photoreal',
  'matte',
  'mixed'
);

-- Create enum for risk levels
CREATE TYPE public.risk_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Concept Arts table with version branching
CREATE TABLE public.concept_arts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  concept_type concept_art_type NOT NULL DEFAULT 'environment',
  art_style art_style NOT NULL DEFAULT 'painterly',
  
  -- AI Generation
  prompt TEXT,
  generated_prompt TEXT,
  image_url TEXT,
  seed INTEGER,
  
  -- Version branching
  version INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.concept_arts(id) ON DELETE SET NULL,
  branch_name TEXT DEFAULT 'main',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Reference Images table
CREATE TABLE public.reference_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Image data
  image_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'upload',
  
  -- AI-extracted tags
  auto_tags JSONB DEFAULT '{}',
  style_dna JSONB DEFAULT '{}',
  
  -- Influence controls
  influence_weight NUMERIC DEFAULT 0.5,
  lock_lighting BOOLEAN DEFAULT false,
  lock_color BOOLEAN DEFAULT false,
  lock_composition BOOLEAN DEFAULT false,
  
  -- Metadata
  title TEXT,
  description TEXT,
  category TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- AI Visual Preferences (AI Visual Brain)
CREATE TABLE public.ai_visual_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  
  -- Learned preferences
  preferred_styles JSONB DEFAULT '{}',
  rejected_styles JSONB DEFAULT '{}',
  color_preferences JSONB DEFAULT '{}',
  lighting_preferences JSONB DEFAULT '{}',
  composition_rules JSONB DEFAULT '{}',
  
  -- Director preferences
  director_notes TEXT,
  reference_movies TEXT[],
  
  -- Learning data
  generation_history JSONB DEFAULT '[]',
  feedback_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shot Risk Analysis
CREATE TABLE public.shot_risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE NOT NULL,
  storyboard_id UUID REFERENCES public.storyboards(id) ON DELETE CASCADE,
  
  -- Risk assessment
  overall_risk risk_level NOT NULL DEFAULT 'low',
  vfx_complexity_risk risk_level DEFAULT 'low',
  camera_complexity_risk risk_level DEFAULT 'low',
  cost_risk risk_level DEFAULT 'low',
  
  -- Details
  risk_factors JSONB DEFAULT '[]',
  ai_recommendations TEXT,
  estimated_cost_impact NUMERIC,
  
  -- Flags
  flagged_issues TEXT[],
  mitigation_suggestions TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- What-If Variations table
CREATE TABLE public.whatif_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_concept_id UUID REFERENCES public.concept_arts(id) ON DELETE CASCADE NOT NULL,
  
  -- Variation type
  variation_type TEXT NOT NULL,
  variation_params JSONB DEFAULT '{}',
  
  -- Generated result
  prompt TEXT,
  image_url TEXT,
  
  -- Comparison
  is_preferred BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concept_arts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_visual_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatif_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for concept_arts
CREATE POLICY "Authenticated users can view concept arts"
  ON public.concept_arts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create concept arts"
  ON public.concept_arts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update concept arts"
  ON public.concept_arts FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete concept arts"
  ON public.concept_arts FOR DELETE
  USING (true);

-- RLS Policies for reference_images
CREATE POLICY "Authenticated users can view reference images"
  ON public.reference_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reference images"
  ON public.reference_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reference images"
  ON public.reference_images FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete reference images"
  ON public.reference_images FOR DELETE
  USING (true);

-- RLS Policies for ai_visual_preferences
CREATE POLICY "Authenticated users can view ai preferences"
  ON public.ai_visual_preferences FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage ai preferences"
  ON public.ai_visual_preferences FOR ALL
  USING (true);

-- RLS Policies for shot_risk_analysis
CREATE POLICY "Authenticated users can view shot risks"
  ON public.shot_risk_analysis FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage shot risks"
  ON public.shot_risk_analysis FOR ALL
  USING (true);

-- RLS Policies for whatif_variations
CREATE POLICY "Authenticated users can view variations"
  ON public.whatif_variations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage variations"
  ON public.whatif_variations FOR ALL
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_concept_arts_updated_at
  BEFORE UPDATE ON public.concept_arts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reference_images_updated_at
  BEFORE UPDATE ON public.reference_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_visual_preferences_updated_at
  BEFORE UPDATE ON public.ai_visual_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shot_risk_analysis_updated_at
  BEFORE UPDATE ON public.shot_risk_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();