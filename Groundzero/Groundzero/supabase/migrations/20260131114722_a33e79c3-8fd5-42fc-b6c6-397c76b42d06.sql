-- Creative Context / Lore Ingestion System

-- Create scope enum for creative context
CREATE TYPE public.creative_context_scope AS ENUM (
  'global',
  'world',
  'character',
  'location',
  'asset'
);

-- Create document type enum
CREATE TYPE public.creative_doc_type AS ENUM (
  'character_backstory',
  'world_mythology',
  'location_environment',
  'asset_prop_bible',
  'cultural_symbolism',
  'general'
);

-- Main creative context documents table
CREATE TABLE public.creative_context_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Document info
  title TEXT NOT NULL,
  document_type public.creative_doc_type NOT NULL DEFAULT 'general',
  scope public.creative_context_scope NOT NULL DEFAULT 'global',
  
  -- File storage
  file_url TEXT,
  file_name TEXT,
  file_size_bytes INTEGER,
  file_type TEXT,
  
  -- AI-processed content
  raw_content TEXT,
  ai_summary TEXT,
  ai_interpretation TEXT,
  
  -- Scope references (optional - links to specific entities)
  world_name TEXT,
  character_name TEXT,
  location_name TEXT,
  asset_name TEXT,
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.creative_context_documents(id),
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'locked')),
  is_approved BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  locked_by UUID REFERENCES public.profiles(id),
  locked_at TIMESTAMPTZ,
  
  -- Metadata
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extracted creative rules from documents
CREATE TABLE public.creative_context_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.creative_context_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Rule details
  rule_type TEXT NOT NULL CHECK (rule_type IN ('visual_cue', 'design_constraint', 'cultural_logic', 'symbolism', 'do', 'dont', 'color_palette', 'material', 'proportion', 'lighting', 'atmosphere')),
  rule_title TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  
  -- Scope inheritance
  scope public.creative_context_scope NOT NULL,
  applies_to TEXT[], -- e.g., ['Rama', 'Sita'] for character scope
  
  -- Priority and enforcement
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
  is_mandatory BOOLEAN DEFAULT true,
  
  -- AI-detected metadata
  confidence_score NUMERIC(3, 2) DEFAULT 1.00,
  source_excerpt TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which context was used in generations
CREATE TABLE public.creative_context_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.creative_context_documents(id) ON DELETE CASCADE,
  
  -- What was generated
  entity_type TEXT NOT NULL CHECK (entity_type IN ('concept_art', 'storyboard', 'character_proxy', 'world_environment')),
  entity_id UUID NOT NULL,
  
  -- How it was used
  rules_applied UUID[], -- IDs from creative_context_rules
  prompt_additions TEXT,
  
  -- Conflict tracking
  had_conflicts BOOLEAN DEFAULT false,
  conflict_details JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_context_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_context_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_context_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creative_context_documents
CREATE POLICY "Users can view creative context documents"
ON public.creative_context_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Directors and Admins can manage creative context"
ON public.creative_context_documents FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('director', 'super_user', 'producer')
  )
);

CREATE POLICY "Art Directors can insert creative context"
ON public.creative_context_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('art_director', 'director', 'super_user', 'producer')
  )
);

-- RLS Policies for creative_context_rules
CREATE POLICY "Users can view creative rules"
ON public.creative_context_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can manage creative rules"
ON public.creative_context_rules FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('director', 'super_user')
  )
);

-- RLS Policies for creative_context_usage
CREATE POLICY "Users can view context usage"
ON public.creative_context_usage FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert context usage"
ON public.creative_context_usage FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_creative_docs_project ON public.creative_context_documents(project_id);
CREATE INDEX idx_creative_docs_scope ON public.creative_context_documents(scope);
CREATE INDEX idx_creative_docs_status ON public.creative_context_documents(status);
CREATE INDEX idx_creative_rules_document ON public.creative_context_rules(document_id);
CREATE INDEX idx_creative_rules_project ON public.creative_context_rules(project_id);
CREATE INDEX idx_creative_usage_document ON public.creative_context_usage(document_id);

-- Update timestamp trigger
CREATE TRIGGER update_creative_docs_updated_at
BEFORE UPDATE ON public.creative_context_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();