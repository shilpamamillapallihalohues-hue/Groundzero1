export type AssetCategory = 'environment' | 'character' | 'prop' | 'vehicle' | 'creature' | 'fx_element';
export type AssetDetailLevel = 'hero' | 'mid' | 'background' | 'proxy';
export type DispatchStatus = 'pending' | 'queued' | 'approved' | 'dispatched' | 'in_progress' | 'completed' | 'blocked';
export type ReadinessStatus = 'ready' | 'risky' | 'blocked';

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  environment: 'Environment',
  character: 'Character',
  prop: 'Prop',
  vehicle: 'Vehicle',
  creature: 'Creature',
  fx_element: 'FX Element',
};

export const ASSET_DETAIL_LABELS: Record<AssetDetailLevel, string> = {
  hero: 'Hero',
  mid: 'Mid',
  background: 'Background',
  proxy: 'Proxy',
};

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  pending: 'Pending',
  queued: 'Queued',
  approved: 'Approved',
  dispatched: 'Dispatched',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
};

export interface ColorPaletteItem {
  name: string;
  hex: string;
  usage: string;
}

export interface LightingLogic {
  keyLightDirection: string;
  keyLightIntensity: string;
  fillLightRatio: string;
  ambientStyle: string;
  shadowQuality: string;
  practicalLights: string[];
  godRays: boolean;
  volumetrics: string;
}

export interface MaterialBehavior {
  surfaceTypes: string[];
  textureStyle: string;
  wearAndTear: string;
  reflectivity: string;
  subsurface: boolean;
}

export interface ScaleProportions {
  humanScale: string;
  environmentScale: string;
  depthCues: string[];
}

export interface CameraContrast {
  dynamicRange: string;
  blackPoint: string;
  highlightRolloff: string;
  colorGrading: string;
  vignetteStrength: string;
}

export interface LookLockProfile {
  id: string;
  project_id: string;
  name: string;
  color_palette: ColorPaletteItem[];
  lighting_logic: LightingLogic;
  material_behavior: MaterialBehavior;
  scale_proportions: ScaleProportions;
  camera_contrast: CameraContrast;
  source_concept_ids: string[];
  is_locked: boolean;
  locked_by?: string;
  locked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionAsset {
  id: string;
  project_id: string;
  name: string;
  category: AssetCategory;
  description?: string;
  source_concept_id?: string;
  scene_usage: string[];
  shot_usage: string[];
  reusability_score: number;
  complexity_score: number;
  owning_department?: string;
  thumbnail_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GeometryGroup {
  name: string;
  purpose: string;
}

export interface FxAttachmentPoint {
  name: string;
  location: string;
  fxType: string;
}

export interface LodLevel {
  level: string;
  polyReduction: string;
  distance: string;
}

export interface RiggingNeeds {
  required: boolean;
  type?: string;
  jointCount?: string;
  deformationNeeds?: string[];
}

export interface ModelPlan {
  id: string;
  asset_id: string;
  detail_level: AssetDetailLevel;
  poly_density_guidance?: string;
  texture_resolution?: string;
  rigging_needs: RiggingNeeds;
  topology_suggestions: string[];
  scale_reference: Record<string, string>;
  geometry_groups: GeometryGroup[];
  material_slots: string[];
  texture_sets: string[];
  rig_layers: string[];
  fx_attachment_points: FxAttachmentPoint[];
  lod_hierarchy: LodLevel[];
  ai_generated_proxy_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ShotReadiness {
  id: string;
  storyboard_id: string;
  asset_readiness_pct: number;
  fx_complexity_score: number;
  animation_difficulty_score: number;
  lighting_cost_score: number;
  overall_status: ReadinessStatus;
  missing_assets: string[];
  risk_flags: string[];
  ai_recommendations?: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentDispatch {
  id: string;
  storyboard_id: string;
  department: string;
  status: DispatchStatus;
  context_pack: Record<string, unknown>;
  assets_included: string[];
  visual_references: string[];
  constraints: Record<string, unknown>;
  queued_at?: string;
  approved_by?: string;
  approved_at?: string;
  dispatched_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export const DEPARTMENTS = [
  { id: 'layout', name: 'Layout', color: 'text-blue-400' },
  { id: 'animation', name: 'Animation', color: 'text-green-400' },
  { id: 'fx', name: 'FX', color: 'text-purple-400' },
  { id: 'lighting', name: 'Lighting', color: 'text-yellow-400' },
  { id: 'compositing', name: 'Compositing', color: 'text-pink-400' },
];
