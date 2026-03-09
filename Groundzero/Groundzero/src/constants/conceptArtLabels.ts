// Shared concept art label constants
// Separated from types to avoid circular dependency/initialization issues

export const CONCEPT_TYPE_LABELS: Record<string, string> = {
  environment: 'Environment',
  character: 'Character',
  costume: 'Costume',
  prop: 'Prop & Weapon',
  set_architecture: 'Set Architecture',
  vehicle: 'Vehicle',
  creature: 'Creature',
  fx_concept: 'FX Concept',
};

export const ART_STYLE_LABELS: Record<string, string> = {
  sketch: 'Sketch',
  painterly: 'Painterly',
  photoreal: 'Photoreal',
  matte: 'Matte Painting',
  mixed: 'Mixed Media',
};

export const WHATIF_VARIATIONS = [
  { type: 'lighting', label: 'Lighting', options: ['dramatic', 'soft', 'rim', 'natural', 'neon'] },
  { type: 'time_of_day', label: 'Time of Day', options: ['dawn', 'morning', 'golden_hour', 'dusk', 'night', 'blue_hour'] },
  { type: 'weather', label: 'Weather', options: ['rain', 'snow', 'fog', 'storm', 'sunny', 'overcast'] },
  { type: 'genre', label: 'Genre Swap', options: ['cyberpunk', 'noir', 'horror', 'fantasy', 'scifi'] },
  { type: 'camera', label: 'Camera Angle', options: ['low', 'high', 'dutch', 'wideangle', 'closeup'] },
];
