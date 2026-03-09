export type UserRole = 
  | 'super_admin' 
  | 'producer' 
  | 'director' 
  | 'department_head' 
  | 'artist' 
  | 'client';

export type Department = 
  | 'direction' 
  | 'cinematography' 
  | 'art' 
  | 'costume' 
  | 'vfx' 
  | 'sound' 
  | 'production';

export type SceneStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'review' 
  | 'approved';

export type AssetStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'review' 
  | 'approved' 
  | 'rejected';

export type VFXComplexity = 'low' | 'medium' | 'high' | 'extreme';

export type TimeOfDay = 'day' | 'night' | 'dawn' | 'dusk' | 'golden_hour';

export interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  status: 'pre_production' | 'production' | 'post_production' | 'completed';
  director: string;
  producer: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  totalScenes: number;
  completedScenes: number;
  estimatedBudget?: number;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: string;
  slugline: string;
  location: string;
  timeOfDay: TimeOfDay;
  description: string;
  characters: string[];
  props: string[];
  costumes: string[];
  vfxRequired: boolean;
  vfxComplexity?: VFXComplexity;
  soundCues: string[];
  cameraDirections: string[];
  status: SceneStatus;
  estimatedDuration: number; // in minutes
  assignedDepartments: Department[];
}

export interface SceneBreakdown {
  sceneId: string;
  direction: DirectionNotes;
  cinematography: CinematographyNotes;
  art: ArtNotes;
  costume: CostumeNotes;
  vfx: VFXNotes;
  sound: SoundNotes;
  production: ProductionNotes;
}

export interface DirectionNotes {
  sceneIntent: string;
  emotionalTone: string;
  narrativeImportance: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
}

export interface CinematographyNotes {
  shotList: Shot[];
  overallMood: string;
  lightingNotes: string;
}

export interface Shot {
  shotNumber: string;
  type: string;
  cameraMovement: string;
  lensType: string;
  description: string;
}

export interface ArtNotes {
  setRequirements: string[];
  propsList: string[];
  environmentReferences: string[];
  notes: string;
}

export interface CostumeNotes {
  characterCostumes: CharacterCostume[];
  colorPalette: string[];
  continuityNotes: string;
}

export interface CharacterCostume {
  character: string;
  costume: string;
  notes: string;
}

export interface VFXNotes {
  fxType: string[];
  complexity: VFXComplexity;
  simulationNotes: string;
  compositingNotes: string;
  estimatedFrames: number;
}

export interface SoundNotes {
  foley: string[];
  ambience: string[];
  musicMood: string;
  dialogueNotes: string;
}

export interface ProductionNotes {
  estimatedShootDays: number;
  crewSize: number;
  locationComplexity: 'low' | 'medium' | 'high';
  budgetEstimation: 'low' | 'medium' | 'high';
  specialRequirements: string[];
}

export interface Storyboard {
  id: string;
  sceneId: string;
  shotNumber: string;
  imageUrl: string;
  prompt: string;
  shotType: string;
  cameraAngle: string;
  lighting: string;
  mood: string;
  action: string;
  status: AssetStatus;
  version: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  sceneId?: string;
  title: string;
  description: string;
  department: Department;
  assignedTo: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  createdAt: Date;
}

export interface DirectorVision {
  projectId: string;
  genre: string;
  mood: string[];
  referenceMovies: string[];
  cameraLanguage: string;
  colorPalette: string[];
  visualStyle: string;
  notes: string;
}
