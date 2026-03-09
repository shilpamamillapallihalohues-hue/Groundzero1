// Story Framework Types for AI Analysis Engine

export type StoryFramework = 'save_the_cat' | 'sequence_method' | 'hero_journey' | 'seven_point';

// Save the Cat! 15-Beat Beat Sheet
export interface SaveTheCatBeat {
  id: string;
  name: string;
  description: string;
  expectedPageRange: [number, number]; // percentage of script
  color: string;
}

export const SAVE_THE_CAT_BEATS: SaveTheCatBeat[] = [
  { id: 'opening_image', name: 'Opening Image', description: 'A visual that sets the tone, mood, and style', expectedPageRange: [0, 1], color: '#3B82F6' },
  { id: 'theme_stated', name: 'Theme Stated', description: 'Someone poses a question or makes a statement that hints at the lesson', expectedPageRange: [1, 5], color: '#8B5CF6' },
  { id: 'setup', name: 'Setup', description: 'Introduce the hero, their world, and their flaws', expectedPageRange: [1, 10], color: '#6366F1' },
  { id: 'catalyst', name: 'Catalyst', description: 'The moment where life changes - the inciting incident', expectedPageRange: [10, 12], color: '#EC4899' },
  { id: 'debate', name: 'Debate', description: 'The hero doubts the journey, debates the choice', expectedPageRange: [12, 25], color: '#F59E0B' },
  { id: 'break_into_two', name: 'Break Into Two', description: 'The hero decides to act and leaves the old world', expectedPageRange: [25, 25], color: '#10B981' },
  { id: 'b_story', name: 'B Story', description: 'A secondary story begins, often a love story or friendship', expectedPageRange: [25, 30], color: '#06B6D4' },
  { id: 'fun_and_games', name: 'Fun & Games', description: 'The promise of the premise is delivered', expectedPageRange: [30, 50], color: '#22C55E' },
  { id: 'midpoint', name: 'Midpoint', description: 'A major twist - false victory or false defeat', expectedPageRange: [50, 50], color: '#EF4444' },
  { id: 'bad_guys_close_in', name: 'Bad Guys Close In', description: 'External and internal pressures mount', expectedPageRange: [50, 75], color: '#F97316' },
  { id: 'all_is_lost', name: 'All Is Lost', description: 'The lowest point, often with a whiff of death', expectedPageRange: [75, 75], color: '#DC2626' },
  { id: 'dark_night', name: 'Dark Night of the Soul', description: 'The hero wallows in hopelessness', expectedPageRange: [75, 85], color: '#7C3AED' },
  { id: 'break_into_three', name: 'Break Into Three', description: 'The hero finds a solution combining A and B stories', expectedPageRange: [85, 85], color: '#0EA5E9' },
  { id: 'finale', name: 'Finale', description: 'The hero conquers their flaws and defeats the villain', expectedPageRange: [85, 99], color: '#14B8A6' },
  { id: 'final_image', name: 'Final Image', description: 'The opposite of the opening image, showing change', expectedPageRange: [99, 100], color: '#84CC16' },
];

// Sequence Method (8 Sequences)
export interface SequenceStep {
  id: string;
  name: string;
  description: string;
  expectedRange: [number, number];
  color: string;
}

export const SEQUENCE_METHOD_STEPS: SequenceStep[] = [
  { id: 'seq_1', name: 'Sequence 1: Status Quo', description: 'Establish the world and introduce the protagonist', expectedRange: [0, 12.5], color: '#3B82F6' },
  { id: 'seq_2', name: 'Sequence 2: Predicament', description: 'The inciting incident and initial response', expectedRange: [12.5, 25], color: '#8B5CF6' },
  { id: 'seq_3', name: 'Sequence 3: First Attempt', description: 'Hero\'s first attempt to solve the problem', expectedRange: [25, 37.5], color: '#EC4899' },
  { id: 'seq_4', name: 'Sequence 4: Midpoint', description: 'A major shift in understanding or situation', expectedRange: [37.5, 50], color: '#F59E0B' },
  { id: 'seq_5', name: 'Sequence 5: Consequences', description: 'Complications arise from midpoint actions', expectedRange: [50, 62.5], color: '#10B981' },
  { id: 'seq_6', name: 'Sequence 6: New Plan', description: 'Hero develops a new approach', expectedRange: [62.5, 75], color: '#06B6D4' },
  { id: 'seq_7', name: 'Sequence 7: All Is Lost', description: 'The darkest moment before the climax', expectedRange: [75, 87.5], color: '#EF4444' },
  { id: 'seq_8', name: 'Sequence 8: Resolution', description: 'Climax and resolution of all story threads', expectedRange: [87.5, 100], color: '#22C55E' },
];

// Hero's Journey (12 Steps)
export interface HeroJourneyStep {
  id: string;
  name: string;
  description: string;
  phase: 'departure' | 'initiation' | 'return';
  color: string;
}

export const HERO_JOURNEY_STEPS: HeroJourneyStep[] = [
  { id: 'ordinary_world', name: 'Ordinary World', description: 'Hero\'s normal life before the adventure', phase: 'departure', color: '#3B82F6' },
  { id: 'call_to_adventure', name: 'Call to Adventure', description: 'The hero receives a challenge or quest', phase: 'departure', color: '#8B5CF6' },
  { id: 'refusal_of_call', name: 'Refusal of the Call', description: 'The hero hesitates or refuses the challenge', phase: 'departure', color: '#EC4899' },
  { id: 'meeting_mentor', name: 'Meeting the Mentor', description: 'The hero gains guidance or equipment', phase: 'departure', color: '#F59E0B' },
  { id: 'crossing_threshold', name: 'Crossing the Threshold', description: 'The hero commits to the adventure', phase: 'initiation', color: '#10B981' },
  { id: 'tests_allies_enemies', name: 'Tests, Allies, Enemies', description: 'The hero faces challenges and makes allies', phase: 'initiation', color: '#06B6D4' },
  { id: 'approach_cave', name: 'Approach to the Inmost Cave', description: 'The hero prepares for the major challenge', phase: 'initiation', color: '#EF4444' },
  { id: 'ordeal', name: 'The Ordeal', description: 'The hero faces their greatest fear or enemy', phase: 'initiation', color: '#DC2626' },
  { id: 'reward', name: 'Reward (Seizing the Sword)', description: 'The hero gains what they sought', phase: 'initiation', color: '#22C55E' },
  { id: 'road_back', name: 'The Road Back', description: 'The hero begins the journey home', phase: 'return', color: '#14B8A6' },
  { id: 'resurrection', name: 'Resurrection', description: 'Final test where hero applies lessons learned', phase: 'return', color: '#84CC16' },
  { id: 'return_elixir', name: 'Return with the Elixir', description: 'The hero returns transformed with knowledge', phase: 'return', color: '#A855F7' },
];

// Seven-Point Structure
export interface SevenPointStep {
  id: string;
  name: string;
  description: string;
  position: number; // 1-7
  color: string;
}

export const SEVEN_POINT_STEPS: SevenPointStep[] = [
  { id: 'hook', name: 'Hook', description: 'The starting state, opposite of the resolution', position: 1, color: '#3B82F6' },
  { id: 'plot_point_1', name: 'Plot Point 1', description: 'The inciting incident that launches the story', position: 2, color: '#8B5CF6' },
  { id: 'pinch_point_1', name: 'Pinch Point 1', description: 'First major pressure from antagonistic force', position: 3, color: '#EC4899' },
  { id: 'midpoint', name: 'Midpoint', description: 'Hero moves from reaction to action', position: 4, color: '#F59E0B' },
  { id: 'pinch_point_2', name: 'Pinch Point 2', description: 'Second major pressure, stakes raised', position: 5, color: '#EF4444' },
  { id: 'plot_point_2', name: 'Plot Point 2', description: 'Hero gains final piece needed for climax', position: 6, color: '#10B981' },
  { id: 'resolution', name: 'Resolution', description: 'The climax and final state', position: 7, color: '#22C55E' },
];

// Scene-to-Beat Mapping
export interface SceneBeatMapping {
  sceneId: string;
  sceneNumber: number;
  sceneName: string;
  mappedBeats: {
    framework: StoryFramework;
    beatId: string;
    confidence: number; // 0-100
    aiNotes?: string;
  }[];
}

// Analysis Result
export interface StoryAnalysisResult {
  framework: StoryFramework;
  coverage: number; // percentage of beats covered
  missingBeats: string[];
  weakBeats: { beatId: string; reason: string }[];
  suggestions: StorySuggestion[];
  sceneMappings: SceneBeatMapping[];
}

export interface StorySuggestion {
  id: string;
  type: 'missing_beat' | 'weak_beat' | 'pacing' | 'character_arc' | 'continuity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  affectedBeat?: string;
  affectedScenes?: string[];
  proposedOptions?: string[];
  status: 'pending' | 'accepted' | 'ignored';
}

// Character Arc Tracking
export interface CharacterArcPoint {
  sceneId: string;
  sceneNumber: number;
  characterName: string;
  emotionalState: string;
  growthIndicator: number; // -100 to 100
  notes?: string;
}

// Continuity Issue
export interface ContinuityIssue {
  id: string;
  type: 'motivation' | 'emotional' | 'stakes' | 'logic';
  severity: 'low' | 'medium' | 'high';
  sceneRange: [number, number];
  description: string;
  suggestion?: string;
}
