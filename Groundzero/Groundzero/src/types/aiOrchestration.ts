// AI Model Types
export type ModelType = 'text' | 'image' | 'vision' | 'multimodal';
export type CostTier = 'low' | 'medium' | 'high' | 'premium';
export type SpeedTier = 'fast' | 'medium' | 'slow';
export type TaskCategory = 'analysis' | 'generation' | 'validation';

export interface AIModel {
  id: string;
  model_id: string;
  display_name: string;
  provider: string;
  model_type: ModelType;
  strengths: string[];
  limitations: string[];
  supported_tasks: string[];
  cost_tier: CostTier;
  speed_tier: SpeedTier;
  is_active: boolean;
  config: Record<string, unknown>;
}

export interface AITaskDefinition {
  id: string;
  task_key: string;
  task_name: string;
  description: string | null;
  task_category: TaskCategory;
  recommended_model_ids: string[];
  alternative_model_ids: string[];
  auto_select_criteria: AutoSelectCriteria;
  requires_vision: boolean;
  requires_image_gen: boolean;
}

export interface AutoSelectCriteria {
  complexity_threshold?: 'low' | 'medium' | 'high';
  accuracy_required?: 'low' | 'medium' | 'high';
  speed_priority?: boolean;
  cost_priority?: boolean;
}

export interface AITaskOutput {
  id: string;
  project_id: string | null;
  task_key: string;
  model_id: string;
  model_version: string | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  parameters: AIParameters;
  seed: number | null;
  execution_time_ms: number | null;
  token_usage: TokenUsage;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AIParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  [key: string]: unknown;
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ProjectAISettings {
  id: string;
  project_id: string;
  auto_mode: boolean;
  default_text_model: string;
  default_image_model: string;
  task_model_overrides: Record<string, string>;
  safety_settings: SafetySettings;
}

export interface SafetySettings {
  prevent_face_likeness: boolean;
  prevent_style_drift: boolean;
  enforce_look_lock: boolean;
}

// Auto-routing context
export interface TaskContext {
  task_key: string;
  project_phase?: 'exploration' | 'development' | 'locked';
  complexity?: 'low' | 'medium' | 'high';
  requires_accuracy?: boolean;
  budget_conscious?: boolean;
  has_vision_input?: boolean;
  needs_image_output?: boolean;
}

// Model selection result
export interface ModelSelectionResult {
  selected_model: AIModel;
  selection_reason: string;
  alternatives: AIModel[];
  is_optimal: boolean;
  warnings: string[];
}

// ComfyUI workflow mapping (for image generation)
export interface ComfyUIWorkflowConfig {
  workflow_id: string;
  checkpoint: string;
  loras: string[];
  controlnet_setup: ControlNetSetup | null;
  look_lock_profile_id: string | null;
  seed_control: boolean;
}

export interface ControlNetSetup {
  type: string;
  strength: number;
  preprocessor: string;
}

// AI Registry - static model definitions for quick access
export const AI_MODELS = {
  'google/gemini-2.5-pro': {
    display_name: 'Gemini 2.5 Pro',
    provider: 'Google',
    model_type: 'multimodal' as ModelType,
    cost_tier: 'premium' as CostTier,
    speed_tier: 'slow' as SpeedTier,
    best_for: ['Complex reasoning', 'Large context analysis', 'High-stakes decisions']
  },
  'google/gemini-2.5-flash': {
    display_name: 'Gemini 2.5 Flash',
    provider: 'Google',
    model_type: 'multimodal' as ModelType,
    cost_tier: 'medium' as CostTier,
    speed_tier: 'fast' as SpeedTier,
    best_for: ['General tasks', 'Script analysis', 'Quick iterations']
  },
  'google/gemini-2.5-flash-lite': {
    display_name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    model_type: 'text' as ModelType,
    cost_tier: 'low' as CostTier,
    speed_tier: 'fast' as SpeedTier,
    best_for: ['Simple classification', 'Summarization', 'Tagging']
  },
  'google/gemini-2.5-flash-image': {
    display_name: 'Gemini Flash Image',
    provider: 'Google',
    model_type: 'image' as ModelType,
    cost_tier: 'medium' as CostTier,
    speed_tier: 'medium' as SpeedTier,
    best_for: ['Concept art', 'Storyboards', 'Character proxies']
  },
  'google/gemini-3-pro-image-preview': {
    display_name: 'Gemini 3 Pro Image',
    provider: 'Google',
    model_type: 'image' as ModelType,
    cost_tier: 'premium' as CostTier,
    speed_tier: 'slow' as SpeedTier,
    best_for: ['Hero shots', 'Final renders', 'High-quality output']
  },
  'openai/gpt-5': {
    display_name: 'GPT-5',
    provider: 'OpenAI',
    model_type: 'multimodal' as ModelType,
    cost_tier: 'premium' as CostTier,
    speed_tier: 'slow' as SpeedTier,
    best_for: ['Complex reasoning', 'Nuanced analysis', 'Critical decisions']
  },
  'openai/gpt-5-mini': {
    display_name: 'GPT-5 Mini',
    provider: 'OpenAI',
    model_type: 'multimodal' as ModelType,
    cost_tier: 'medium' as CostTier,
    speed_tier: 'medium' as SpeedTier,
    best_for: ['Balanced performance', 'General analysis', 'Cost-effective']
  },
  'openai/gpt-5-nano': {
    display_name: 'GPT-5 Nano',
    provider: 'OpenAI',
    model_type: 'text' as ModelType,
    cost_tier: 'low' as CostTier,
    speed_tier: 'fast' as SpeedTier,
    best_for: ['High volume', 'Simple tasks', 'Speed priority']
  }
} as const;

export type AIModelId = keyof typeof AI_MODELS;
