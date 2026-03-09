// Creative Context / Lore System Types

export type CreativeContextScope = 'global' | 'world' | 'character' | 'location' | 'asset';

export type CreativeDocType = 
  | 'character_backstory'
  | 'world_mythology'
  | 'location_environment'
  | 'asset_prop_bible'
  | 'cultural_symbolism'
  | 'general';

export type CreativeRuleType = 
  | 'visual_cue'
  | 'design_constraint'
  | 'cultural_logic'
  | 'symbolism'
  | 'do'
  | 'dont'
  | 'color_palette'
  | 'material'
  | 'proportion'
  | 'lighting'
  | 'atmosphere';

export type DocumentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'locked';

export interface CreativeContextDocument {
  id: string;
  project_id: string;
  title: string;
  document_type: CreativeDocType;
  scope: CreativeContextScope;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  file_type?: string;
  raw_content?: string;
  ai_summary?: string;
  ai_interpretation?: string;
  world_name?: string;
  character_name?: string;
  location_name?: string;
  asset_name?: string;
  version: number;
  parent_document_id?: string;
  status: DocumentStatus;
  is_approved: boolean;
  is_locked: boolean;
  approved_by?: string;
  approved_at?: string;
  locked_by?: string;
  locked_at?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreativeContextRule {
  id: string;
  document_id: string;
  project_id: string;
  rule_type: CreativeRuleType;
  rule_title: string;
  rule_description: string;
  scope: CreativeContextScope;
  applies_to?: string[];
  priority: number;
  is_mandatory: boolean;
  confidence_score: number;
  source_excerpt?: string;
  created_at: string;
}

export interface CreativeContextUsage {
  id: string;
  document_id: string;
  entity_type: 'concept_art' | 'storyboard' | 'character_proxy' | 'world_environment';
  entity_id: string;
  rules_applied?: string[];
  prompt_additions?: string;
  had_conflicts: boolean;
  conflict_details?: Record<string, any>;
  created_at: string;
}

// Labels for UI
export const DOC_TYPE_LABELS: Record<CreativeDocType, string> = {
  character_backstory: 'Character Backstory',
  world_mythology: 'World / Mythology',
  location_environment: 'Location & Environment',
  asset_prop_bible: 'Asset / Prop Bible',
  cultural_symbolism: 'Cultural & Symbolism',
  general: 'General Reference'
};

export const SCOPE_LABELS: Record<CreativeContextScope, string> = {
  global: 'Global (All Assets)',
  world: 'World-Specific',
  character: 'Character-Specific',
  location: 'Location-Specific',
  asset: 'Asset-Specific'
};

export const RULE_TYPE_LABELS: Record<CreativeRuleType, string> = {
  visual_cue: 'Visual Cue',
  design_constraint: 'Design Constraint',
  cultural_logic: 'Cultural Logic',
  symbolism: 'Symbolism',
  do: "Do's",
  dont: "Don'ts",
  color_palette: 'Color Palette',
  material: 'Material',
  proportion: 'Proportion',
  lighting: 'Lighting',
  atmosphere: 'Atmosphere'
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  locked: 'Locked'
};

export const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-destructive/20 text-destructive',
  locked: 'bg-blue-500/20 text-blue-400'
};
