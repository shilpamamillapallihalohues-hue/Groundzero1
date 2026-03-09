export type DataConfidence = 'verified' | 'estimated' | 'unknown';

export type LocationType = 
  | 'film_studio' 
  | 'backlot' 
  | 'permanent_set' 
  | 'indoor_stage' 
  | 'outdoor_location' 
  | 'heritage_zone' 
  | 'urban_zone' 
  | 'rural_zone';

export interface DiscoveredLocation {
  id?: string;
  name: string;
  location_name?: string;
  location_type: LocationType;
  city: string;
  state: string;
  country: string;
  address?: string;
  
  // Spatial data
  square_footage?: number;
  square_footage_confidence: DataConfidence;
  ceiling_height_ft?: number;
  ceiling_height_confidence: DataConfidence;
  usable_floor_area?: number;
  floor_area_confidence: DataConfidence;
  
  // Camera feasibility
  wide_shot_feasible?: boolean;
  wide_shot_confidence: DataConfidence;
  crane_dolly_feasible?: boolean;
  crane_dolly_confidence: DataConfidence;
  multi_camera_feasible?: boolean;
  multi_camera_confidence: DataConfidence;
  drone_allowed?: boolean;
  drone_confidence: DataConfidence;
  
  // VP suitability
  green_screen_feasible?: boolean;
  green_screen_confidence: DataConfidence;
  led_volume_possible?: boolean;
  led_volume_confidence: DataConfidence;
  indoor_stage_adaptable?: boolean;
  indoor_stage_confidence: DataConfidence;
  vp_readiness_score: number;
  
  // Sound
  sound_control_level?: 'high' | 'medium' | 'low';
  sound_control_confidence: DataConfidence;
  
  // Source
  data_source: string;
  source_url?: string;
  source_name?: string;
  
  // Metadata
  is_indoor: boolean;
  amenities?: string[];
  photos?: string[];
  contact_info?: Record<string, any>;
  operating_hours?: string;
  cost_estimate_per_day?: number;
  notes?: string;
  
  // Verification
  is_manually_verified?: boolean;
}

export interface SceneRequirements {
  required_space_sqft: number;
  required_ceiling_height_ft?: number;
  is_indoor_required: boolean;
  crowd_size: 'none' | 'small' | 'medium' | 'large';
  action_intensity: 'low' | 'medium' | 'high';
  camera_requirements: {
    wide_shots_needed: boolean;
    crane_shots_needed: boolean;
    dolly_shots_needed: boolean;
    multi_camera_needed: boolean;
    drone_shots_possible: boolean;
  };
  sound_requirements: 'controlled' | 'semi-controlled' | 'natural';
  lighting_requirements: 'natural' | 'mixed' | 'full_artificial';
  vfx_likelihood: 'none' | 'low' | 'medium' | 'high';
  vp_suitability: 'recommended' | 'possible' | 'not_recommended';
  special_requirements: string[];
  location_type_preference: string[];
}

export interface LocationSuggestion {
  id?: string;
  location: DiscoveredLocation;
  location_index: number;
  suggestion_type: 'real_location' | 'studio_set' | 'hybrid' | 'virtual_production';
  
  // Scores
  overall_match_score: number;
  space_suitability_score: number;
  height_feasibility_score: number;
  camera_movement_score: number;
  sound_control_score: number;
  vp_readiness_score: number;
  
  // AI analysis
  scene_requirements: SceneRequirements;
  gap_analysis?: Record<string, any>;
  ai_notes: string;
  risk_assumptions: string[];
  workarounds: string[];
  recommendations: string[];
  
  // Status
  status?: 'suggested' | 'shortlisted' | 'approved' | 'rejected';
  rank?: number;
}

export interface SceneForMatching {
  id: string;
  scene_number: string;
  slugline: string;
  location: string;
  time_of_day: string;
  description: string;
  characters: string[];
  props: string[];
  int_ext: string;
}
