export interface FacialReferenceImage {
  id: string;
  url: string;
  fileName: string;
  viewType: 'front' | 'three_quarter' | 'side' | 'reference' | 'unknown';
  uploadedAt: string;
}

export interface FacialTurnaroundView {
  id: string;
  viewType: 'front' | 'three_quarter_left' | 'three_quarter_right' | 'side_left' | 'side_right' | 'up' | 'down';
  label: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  confidence: number;
}

export interface FacialLandmarks {
  eyeDistance: number;
  headScale: number;
  landmarkConfidence: number;
  identityConfidence: number;
  symmetryScore: number;
}

export interface CharacterFacialData {
  id: string;
  characterName: string;
  projectId: string;
  referenceImages: FacialReferenceImage[];
  generatedViews: FacialTurnaroundView[];
  landmarks: FacialLandmarks | null;
  settings: FacialGenerationSettings;
  status: 'draft' | 'processing' | 'completed' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export interface FacialGenerationSettings {
  gender?: 'male' | 'female' | 'neutral';
  ageRange?: 'child' | 'young_adult' | 'adult' | 'middle_aged' | 'elderly';
  stylization: 'realistic' | 'semi_real' | 'stylized';
  outputResolution: '2k' | '4k';
  outputFormat: 'png' | 'exr';
  generateExpressions: boolean;
  neutralBackground: boolean;
}

export interface MetaHumanExportConfig {
  characterName: string;
  glbUrl: string;
  configUrl?: string;
  exportDate: string;
  blendShapeCount: number;
  ready: boolean;
}

export interface AccuFaceRigStatus {
  taskId?: string;
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'manual';
  progress?: number;
  downloadUrl?: string;
  blendShapeCount?: number;
  message?: string;
}

export const DEFAULT_TURNAROUND_VIEWS: Omit<FacialTurnaroundView, 'id' | 'imageUrl' | 'status' | 'confidence'>[] = [
  { viewType: 'front', label: 'Front (Neutral)' },
  { viewType: 'three_quarter_left', label: '¾ Left' },
  { viewType: 'three_quarter_right', label: '¾ Right' },
  { viewType: 'side_left', label: 'Side Left (90°)' },
  { viewType: 'side_right', label: 'Side Right (90°)' },
  { viewType: 'up', label: 'Slight Up' },
  { viewType: 'down', label: 'Slight Down' },
];
