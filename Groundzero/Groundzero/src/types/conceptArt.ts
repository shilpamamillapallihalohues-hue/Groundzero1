export type ConceptArtType = 
  | 'environment'
  | 'character'
  | 'costume'
  | 'prop'
  | 'set_architecture'
  | 'vehicle'
  | 'creature'
  | 'fx_concept';

export type ArtStyle = 
  | 'sketch'
  | 'painterly'
  | 'photoreal'
  | 'matte'
  | 'mixed';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ConceptArt {
  id: string;
  project_id: string;
  scene_id?: string | null;
  title: string;
  description?: string | null;
  concept_type: ConceptArtType;
  art_style: ArtStyle;
  prompt?: string | null;
  generated_prompt?: string | null;
  image_url?: string | null;
  seed?: number | null;
  version: number;
  parent_id?: string | null;
  branch_name?: string | null;
  status: string;
  is_approved?: boolean | null;
  approved_by?: string | null;
  approved_at?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  // Additional approval fields
  director_approved?: boolean | null;
  art_director_approved?: boolean | null;
  concept_lead_approved?: boolean | null;
  review_status?: string | null;
}

export interface ReferenceImage {
  id: string;
  project_id: string;
  image_url: string;
  source_type: string;
  auto_tags: {
    lighting?: string[];
    mood?: string[];
    color?: string[];
    composition?: string[];
    style?: string[];
    subject?: string[];
    technique?: string[];
  };
  style_dna: {
    lightingType?: string;
    colorTemperature?: string;
    dominantColors?: string[];
    contrastLevel?: string;
    saturation?: string;
    mood?: string;
    era?: string;
    genre?: string;
    artisticMovement?: string;
    textureQuality?: string;
  };
  influence_weight: number;
  lock_lighting: boolean;
  lock_color: boolean;
  lock_composition: boolean;
  title?: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AIVisualPreferences {
  id: string;
  project_id: string;
  preferred_styles: Record<string, unknown>;
  rejected_styles: Record<string, unknown>;
  color_preferences: Record<string, unknown>;
  lighting_preferences: Record<string, unknown>;
  composition_rules: Record<string, unknown>;
  director_notes?: string;
  reference_movies?: string[];
  generation_history: unknown[];
  feedback_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShotRiskAnalysis {
  id: string;
  scene_id: string;
  storyboard_id?: string;
  overall_risk: RiskLevel;
  vfx_complexity_risk: RiskLevel;
  camera_complexity_risk: RiskLevel;
  cost_risk: RiskLevel;
  risk_factors: string[];
  ai_recommendations?: string;
  estimated_cost_impact?: number;
  flagged_issues: string[];
  mitigation_suggestions: string[];
  created_at: string;
  updated_at: string;
}

export interface WhatIfVariation {
  id: string;
  source_concept_id: string;
  variation_type: string;
  variation_params: Record<string, unknown>;
  prompt?: string;
  image_url?: string;
  is_preferred: boolean;
  created_at: string;
}

export interface ConceptGenerationRequest {
  conceptType: ConceptArtType;
  artStyle: ArtStyle;
  sceneContext?: {
    slugline?: string;
    description?: string;
    timeOfDay?: string;
    location?: string;
    characters?: string[];
    props?: string[];
    mood?: string;
  };
  directorVision?: {
    genre?: string;
    mood?: string;
    colorPalette?: string[];
    referenceMovies?: string[];
  };
  userPrompt?: string;
  referenceInfluence?: {
    styleDna?: Record<string, unknown>;
    weight?: number;
  };
  whatIfVariation?: {
    type: string;
    params: Record<string, unknown>;
  };
}

// Re-export labels from shared constants to maintain backward compatibility
export { 
  CONCEPT_TYPE_LABELS, 
  ART_STYLE_LABELS, 
  WHATIF_VARIATIONS 
} from '@/constants/conceptArtLabels';