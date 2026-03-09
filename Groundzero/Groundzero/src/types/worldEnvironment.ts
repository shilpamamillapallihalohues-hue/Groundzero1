// World & Environment Concept Art Generation Types

export type WorldGenerationMode = 'location' | 'world';

export type WorldModuleType = 
  | 'world_map'
  | 'topography'
  | 'top_view'
  | 'elevations'
  | 'architecture_style'
  | 'entries'
  | 'interiors'
  | 'props'
  | 'materials'
  | 'lighting'
  | 'vfx'
  | 'scale'
  | 'camera_guides'
  | 'continuity';

export interface WorldModule {
  id: string;
  type: WorldModuleType;
  title: string;
  description: string;
  icon: string;
  isRequired: boolean;
  prompts: string[];
  outputCount: number; // Number of images to generate for this module
}

export interface GeneratedModuleImage {
  id: string;
  moduleType: WorldModuleType;
  imageUrl: string;
  prompt: string;
  generatedPrompt: string;
  seed: number;
  isApproved: boolean;
  isLocked: boolean;
  notes: string;
  createdAt: string;
  conceptArtId?: string;
}

export interface WorldEnvironmentPack {
  id: string;
  projectId: string;
  worldName: string;
  mode: WorldGenerationMode;
  description: string;
  mythologicalContext?: string;
  styleDirection?: string;
  modules: {
    [key in WorldModuleType]?: {
      enabled: boolean;
      locked: boolean;
      images: GeneratedModuleImage[];
      notes: string;
    };
  };
  status: 'draft' | 'generating' | 'review' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export const WORLD_MODULES: WorldModule[] = [
  {
    id: 'world_map',
    type: 'world_map',
    title: 'World & Location Overview',
    description: 'World map, region map, mythological significance, climate & terrain zones',
    icon: 'Globe',
    isRequired: true,
    prompts: [
      'world map overview',
      'region map with terrain zones',
      'mythological significance markers',
      'climate and biome distribution'
    ],
    outputCount: 4
  },
  {
    id: 'topography',
    type: 'topography',
    title: 'Topography & Terrain',
    description: 'Height map, contour map, slopes, cliffs, plateaus, water flow paths',
    icon: 'Mountain',
    isRequired: true,
    prompts: [
      'topographical height map',
      'contour elevation map',
      'terrain cross-section showing slopes and cliffs',
      'water flow and drainage paths'
    ],
    outputCount: 4
  },
  {
    id: 'top_view',
    type: 'top_view',
    title: 'Top View / Plan Layout',
    description: 'Top-down orthographic layout, building footprints, roads, paths, stairs',
    icon: 'LayoutDashboard',
    isRequired: true,
    prompts: [
      'aerial orthographic plan view',
      'building footprint layout',
      'pathways and circulation routes',
      'courtyards and open spaces'
    ],
    outputCount: 4
  },
  {
    id: 'elevations',
    type: 'elevations',
    title: 'Structural Geometry (Elevations)',
    description: 'Front, side, rear elevations, height proportions, section cuts, human scale',
    icon: 'Building2',
    isRequired: true,
    prompts: [
      'front elevation with human scale',
      'side elevation architectural drawing',
      'rear elevation view',
      'section cut showing interior heights'
    ],
    outputCount: 4
  },
  {
    id: 'architecture_style',
    type: 'architecture_style',
    title: 'Architectural Style Language',
    description: 'Architecture style sheets, motifs, symbols, patterns, cultural identity',
    icon: 'Layers',
    isRequired: true,
    prompts: [
      'architectural style reference sheet',
      'ornamental motifs and patterns',
      'symbolic elements and cultural markers',
      'structural design language guide'
    ],
    outputCount: 4
  },
  {
    id: 'entries',
    type: 'entries',
    title: 'Entry / Exit & Orbital Structures',
    description: 'Main entrances, secondary paths, gates, bridges, ramps, processional routes',
    icon: 'DoorOpen',
    isRequired: true,
    prompts: [
      'main entrance gateway design',
      'secondary entry points',
      'bridges and connecting structures',
      'processional route visualization'
    ],
    outputCount: 4
  },
  {
    id: 'interiors',
    type: 'interiors',
    title: 'Interior Environment Modules',
    description: 'Interior layouts, room hierarchy, ceiling designs, pillars, beams, corridors',
    icon: 'Home',
    isRequired: true,
    prompts: [
      'main interior hall layout',
      'ceiling design and structural elements',
      'corridor and passage designs',
      'room hierarchy floor plan'
    ],
    outputCount: 4
  },
  {
    id: 'props',
    type: 'props',
    title: 'Props & Structural Details',
    description: 'Statues, altars, columns, stairs, decorative elements',
    icon: 'Box',
    isRequired: true,
    prompts: [
      'statue and sculpture designs',
      'altar and sacred object concepts',
      'column and pillar variations',
      'decorative element library'
    ],
    outputCount: 4
  },
  {
    id: 'materials',
    type: 'materials',
    title: 'Materials & Textures',
    description: 'Material palette, stone, metal, wood references, aging & wear logic',
    icon: 'Palette',
    isRequired: true,
    prompts: [
      'material palette reference sheet',
      'stone and rock surface textures',
      'metal and metallic finishes',
      'aging and weathering reference'
    ],
    outputCount: 4
  },
  {
    id: 'lighting',
    type: 'lighting',
    title: 'Lighting & Atmosphere',
    description: 'Lighting mood paintings, time-of-day variations, god rays, fire/torch lighting',
    icon: 'Sun',
    isRequired: true,
    prompts: [
      'dawn lighting mood painting',
      'midday harsh sunlight atmosphere',
      'golden hour dramatic lighting',
      'night/torch lit atmosphere'
    ],
    outputCount: 4
  },
  {
    id: 'vfx',
    type: 'vfx',
    title: 'VFX & Environmental Effects',
    description: 'Magical energy, auras, portals, floating structures, environmental FX zones',
    icon: 'Sparkles',
    isRequired: true,
    prompts: [
      'magical energy and aura effects',
      'portal and dimensional effects',
      'floating/levitating structures',
      'environmental particle effects'
    ],
    outputCount: 4
  },
  {
    id: 'scale',
    type: 'scale',
    title: 'Scale & Human Interaction',
    description: 'Human silhouette overlays, crowd scale, character-to-structure comparison',
    icon: 'Users',
    isRequired: true,
    prompts: [
      'human scale comparison',
      'crowd density reference',
      'character interaction points',
      'scale verification overlay'
    ],
    outputCount: 4
  },
  {
    id: 'camera_guides',
    type: 'camera_guides',
    title: 'Camera & Staging Guides',
    description: 'Suggested hero angles, reveal directions, vertical camera possibilities',
    icon: 'Camera',
    isRequired: false,
    prompts: [
      'hero establishing shot angle',
      'dramatic reveal angle',
      'vertical camera possibilities',
      'key staging positions'
    ],
    outputCount: 4
  },
  {
    id: 'continuity',
    type: 'continuity',
    title: 'World Rules & Continuity Sheet',
    description: 'What can change / cannot change, sacred zones, destruction rules',
    icon: 'FileText',
    isRequired: true,
    prompts: [
      'immutable sacred zones',
      'destructible elements',
      'transformation rules',
      'continuity constraint sheet'
    ],
    outputCount: 4
  }
];

export const MODULE_LABELS: Record<WorldModuleType, string> = {
  world_map: '01_World_Map',
  topography: '02_Topography',
  top_view: '03_Top_View',
  elevations: '04_Elevations',
  architecture_style: '05_Architecture_Style',
  entries: '06_Entries',
  interiors: '07_Interiors',
  props: '08_Props',
  materials: '09_Materials',
  lighting: '10_Lighting',
  vfx: '11_VFX',
  scale: '12_Scale',
  camera_guides: '13_Camera_Guides',
  continuity: '14_Continuity'
};

export interface WorldGenerationRequest {
  mode: WorldGenerationMode;
  worldName: string;
  description: string;
  mythologicalContext?: string;
  culturalReferences?: string[];
  styleDirection?: string;
  modules: WorldModuleType[];
  projectContext?: {
    genre?: string;
    era?: string;
    mood?: string;
  };
}
