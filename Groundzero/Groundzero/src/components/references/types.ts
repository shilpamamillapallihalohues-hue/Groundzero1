
export interface SceneReference {
  id: string;
  scene_id: string | null;
  project_id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  source_type: string;
  category: string;
  reference_type: string | null;
  asset_tags: string[] | null;
  created_at: string;
  collection_id?: string | null;
  scenes?: {
    id: string;
    scene_number: string | null;
    slugline: string | null;
  } | null;
}

export interface ReferenceRegion {
  id: string;
  reference_id: string;
  project_id: string;
  label: string;
  description: string | null;
  region_data: { x: number; y: number; width: number; height: number };
  image_url: string | null;
  category: string;
  asset_tags: string[] | null;
  created_at: string;
}

export interface ReferenceCollection {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  collection_type: string;
  cover_image_url: string | null;
  created_at: string;
  item_count?: number;
}

export const CATEGORIES = [
  { value: 'general', label: 'General', color: 'text-muted-foreground' },
  { value: 'location', label: 'Location', color: 'text-blue-500' },
  { value: 'character', label: 'Character', color: 'text-green-500' },
  { value: 'prop', label: 'Prop', color: 'text-yellow-500' },
  { value: 'environment', label: 'Environment', color: 'text-emerald-500' },
  { value: 'vehicle', label: 'Vehicle', color: 'text-orange-500' },
  { value: 'costume', label: 'Costume', color: 'text-pink-500' },
  { value: 'crop', label: 'Crop / Detail', color: 'text-cyan-500' },
  { value: 'document', label: 'Document', color: 'text-violet-500' },
] as const;

export const REFERENCE_TYPES = [
  { value: 'reference_image', label: 'Reference Image' },
  { value: 'concept_art', label: 'Concept Art' },
  { value: 'story_panel', label: 'Story Panel' },
  { value: 'mood_board', label: 'Mood Board' },
  { value: 'texture_sample', label: 'Texture / Material' },
  { value: 'color_palette', label: 'Color Palette' },
  { value: 'character_sheet', label: 'Character Sheet' },
  { value: 'environment_ref', label: 'Environment Reference' },
  { value: 'camera_reference', label: 'Camera / Shot Reference' },
] as const;

export const ASPECT_LOCK_OPTIONS = [
  { value: 'face', label: 'Face / Identity', description: 'Facial features, identity preservation' },
  { value: 'environment', label: 'Environment', description: 'Landscape, terrain, atmosphere' },
  { value: 'lighting', label: 'Lighting', description: 'Light setup, mood, shadows' },
  { value: 'color_palette', label: 'Color Palette', description: 'Color scheme, tones' },
  { value: 'character_design', label: 'Character Design', description: 'Character look, features' },
  { value: 'costume', label: 'Costume / Wardrobe', description: 'Outfits, accessories' },
  { value: 'prop_design', label: 'Props / Assets', description: 'Objects, tools, items' },
  { value: 'architecture', label: 'Architecture', description: 'Buildings, structures' },
  { value: 'texture', label: 'Texture / Material', description: 'Surfaces, materials' },
  { value: 'composition', label: 'Composition', description: 'Framing, layout' },
  { value: 'mood', label: 'Mood / Tone', description: 'Emotional atmosphere' },
  { value: 'vfx_style', label: 'VFX Style', description: 'Effects, particles' },
  { value: 'soil_terrain', label: 'Soil / Terrain', description: 'Ground, earth, surfaces' },
] as const;

export const COLLECTION_TYPES = [
  { value: 'character', label: 'Character References' },
  { value: 'costume', label: 'Costume References' },
  { value: 'architecture', label: 'Architecture References' },
  { value: 'lighting', label: 'Lighting References' },
  { value: 'environment', label: 'Environment References' },
  { value: 'custom', label: 'Custom Collection' },
] as const;

export function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i.test(name);
}

export function isVideoFile(name: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv|wmv|flv|m4v)$/i.test(name);
}

export function getCategoryInfo(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
}

export function getRefTypeLabel(type: string | null) {
  return REFERENCE_TYPES.find(t => t.value === type)?.label || 'Reference';
}
