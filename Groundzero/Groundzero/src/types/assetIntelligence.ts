export interface CharacterProxy {
  id: string;
  project_id: string;
  name: string;
  age_range?: string;
  facial_structure?: {
    face_shape?: string;
    jaw_definition?: string;
    cheekbone_prominence?: string;
    brow_ridge?: string;
  };
  hair_style?: string;
  hair_density?: string;
  facial_hair?: string;
  body_build?: string;
  ethnicity_hints?: string;
  gender?: string;
  height_reference?: string;
  distinguishing_features?: string[];
  front_view_url?: string;
  side_view_url?: string;
  three_quarter_view_url?: string;
  neutral_proxy_url?: string;
  source_concept_ids?: string[];
  scene_usage?: SceneUsage[];
  costume_reference_ids?: string[];
  emotional_tones?: Record<string, string>;
  lighting_notes?: string;
  complexity_rating?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SceneUsage {
  scene_id: string;
  scene_name?: string;
  emotional_tone?: string;
  costume_notes?: string;
}

export interface ReferenceSearch {
  id: string;
  project_id: string;
  asset_id?: string;
  character_proxy_id?: string;
  search_query?: string;
  search_type: string;
  source_type: string;
  results?: SearchResults;
  selected_references?: SelectedReference[];
  created_at: string;
}

export interface SearchResults {
  search_suggestions?: SearchSuggestion[];
  silhouette_keywords?: string[];
  material_keywords?: string[];
  scale_keywords?: string[];
  safety_notes?: string;
}

export interface SearchSuggestion {
  query: string;
  platforms?: string[];
  expected_results?: string;
  usage_notes?: string;
}

export interface SelectedReference {
  thumbnail?: string;
  source?: string;
  license_type?: string;
  relevance?: string;
  similarity_score?: number;
}

export interface ModelingHandoffPack {
  id: string;
  project_id: string;
  asset_id?: string;
  character_proxy_id?: string;
  pack_name: string;
  pack_type: string;
  concept_art_ids?: string[];
  reference_image_ids?: string[];
  proxy_model_data?: ProxyModelData;
  scale_notes?: string;
  complexity_rating?: number;
  topology_guidance?: TopologyGuidance;
  material_hints?: MaterialHint[];
  mesh_groups?: MeshGroup[];
  modeling_brief?: string;
  status: string;
  exported_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyModelData {
  geometry_type?: string;
  base_mesh_url?: string;
  vertex_count?: number;
}

export interface TopologyGuidance {
  edge_flow_notes?: string;
  density_zones?: DensityZone[];
  deformation_areas?: string[];
}

export interface DensityZone {
  zone: string;
  density: string;
  reason: string;
}

export interface MaterialHint {
  slot_name: string;
  material_type: string;
  texture_notes?: string;
}

export interface MeshGroup {
  name: string;
  purpose: string;
  can_be_separate?: boolean;
}

export interface AssetAnalysis {
  silhouette_analysis?: {
    primary_shape?: string;
    secondary_shapes?: string[];
    negative_space?: string;
  };
  scale_reference?: {
    estimated_size?: string;
    reference_objects?: string[];
  };
  proportion_breakdown?: {
    segments?: { name: string; ratio: string }[];
  };
  material_hints?: MaterialHint[];
  functional_components?: string[];
  mesh_group_suggestions?: string[];
  topology_considerations?: string[];
  lod_recommendations?: {
    hero?: string;
    mid?: string;
    background?: string;
  };
  complexity_score?: number;
  reusability_potential?: number;
  scene_relevance_notes?: string;
}
