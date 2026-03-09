// Library Asset Types
export type LibraryAssetType = 
  | 'model_3d'
  | 'texture'
  | 'rig'
  | 'animation'
  | 'fx_preset'
  | 'environment_pack'
  | 'unreal_asset'
  | 'audio'
  | 'misc';

export type LibraryApprovalStatus = 
  | 'pending'
  | 'internal_review'
  | 'approved'
  | 'rejected'
  | 'archived';

export const LIBRARY_ASSET_TYPE_LABELS: Record<LibraryAssetType, string> = {
  model_3d: '3D Model',
  texture: 'Texture',
  rig: 'Rig',
  animation: 'Animation',
  fx_preset: 'FX Preset',
  environment_pack: 'Environment Pack',
  unreal_asset: 'Unreal Asset',
  audio: 'Audio',
  misc: 'Miscellaneous',
};

export const LIBRARY_APPROVAL_STATUS_LABELS: Record<LibraryApprovalStatus, string> = {
  pending: 'Pending',
  internal_review: 'Internal Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const LIBRARY_APPROVAL_STATUS_COLORS: Record<LibraryApprovalStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  internal_review: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  archived: 'bg-muted text-muted-foreground',
};

// Pipeline entry point mapping based on asset type
export const PIPELINE_ENTRY_POINTS: Record<LibraryAssetType, string> = {
  model_3d: 'Texturing',
  texture: 'Lookdev',
  rig: 'Animation',
  animation: 'Animation',
  fx_preset: 'FX',
  environment_pack: 'Lighting',
  unreal_asset: 'Lighting',
  audio: 'Sound',
  misc: '3D Modelling',
};

export interface LibraryAsset {
  id: string;
  name: string;
  description: string | null;
  asset_type: LibraryAssetType;
  owning_department_id: string | null;
  created_by: string | null;
  approval_status: LibraryApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  global_visibility: boolean;
  tags: string[] | null;
  thumbnail_url: string | null;
  pipeline_entry_point: string | null;
  source_project_id: string | null;
  source_asset_id: string | null;
  usage_count: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  // Joined fields
  created_by_profile?: { full_name: string } | null;
  owning_department?: { name: string } | null;
  versions?: LibraryAssetVersion[];
}

export interface LibraryAssetVersion {
  id: string;
  library_asset_id: string;
  version_number: number;
  file_url: string | null;
  preview_url: string | null;
  file_size_bytes: number | null;
  file_format: string | null;
  uploaded_by: string | null;
  notes: string | null;
  is_current: boolean;
  created_at: string;
}

export interface AssetInstance {
  id: string;
  library_asset_id: string;
  library_version_id: string | null;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  current_department: string | null;
  department_order_index: number;
  workflow_status: string;
  assigned_artist_id: string | null;
  instance_name: string | null;
  instance_notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  library_asset?: LibraryAsset;
  project?: { title: string };
  scene?: { scene_name: string };
}

export interface LibraryPromotionRequest {
  id: string;
  source_asset_id: string;
  source_project_id: string;
  requested_by: string;
  proposed_name: string;
  proposed_type: LibraryAssetType;
  proposed_department_id: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_library_asset_id: string | null;
  created_at: string;
}
