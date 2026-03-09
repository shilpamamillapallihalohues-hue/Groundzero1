import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bookmark, Star, Compass, Triangle, CheckCircle, Circle, AlertCircle,
  Tag, Sparkles, X, Edit2, PanelRightOpen, PanelRightClose, Film, ChevronDown, ChevronUp,
  Loader2, Plus, Target, Users, MapPin, ArrowRight, Lightbulb, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';
import { toast } from 'sonner';
import BeatAnalysisPanel from '@/components/beats/BeatAnalysisPanel';
import SceneAnalysisPanel from '@/components/beats/SceneAnalysisPanel';

type BeatStructure = 'save_the_cat' | 'heros_journey' | 'seven_point';

interface BeatNode {
  id: string;
  name: string;
  description: string;
  pageRange: string;
  percentage: number;
  status: 'mapped' | 'partial' | 'missing';
  sceneIds: string[];
  act?: string;
  section?: string;
  isCustom?: boolean;
}

interface SceneSuggestion {
  title: string;
  description: string;
  characters: string[];
  location: string;
  fitScore: number;
  fitReason: string;
  connectsTo: string[];
}

interface BeatAnalysis {
  beatId: string;
  beatName: string;
  diagnosis: string;
  impact: string;
  narrativePosition: string;
  sceneSuggestions: SceneSuggestion[];
}

// Save the Cat with act/section grouping
const STRUCTURE_DEFINITIONS: Record<BeatStructure, { name: string; icon: React.ReactNode; beats: { id: string; name: string; description: string; pageRange: string; percentage: number; act: string; section: string }[] }> = {
  save_the_cat: {
    name: 'Save the Cat',
    icon: <Star className="h-4 w-4" />,
    beats: [
      { id: 'opening_image', name: 'Opening Image', description: 'The first impression of the story world', pageRange: '1', percentage: 1, act: 'ACT 1', section: 'Setup' },
      { id: 'theme_stated', name: 'Theme Stated', description: 'A character states the theme', pageRange: '5', percentage: 5, act: 'ACT 1', section: 'Setup' },
      { id: 'setup', name: 'Set-Up', description: 'Introduce protagonist, stakes, and the world', pageRange: '1-10', percentage: 10, act: 'ACT 1', section: 'Setup' },
      { id: 'catalyst', name: 'Catalyst', description: 'The inciting incident that disrupts the status quo', pageRange: '12', percentage: 12, act: 'ACT 1', section: 'Setup' },
      { id: 'debate', name: 'Debate', description: 'Protagonist questions whether to take the journey', pageRange: '12-25', percentage: 17, act: 'ACT 1', section: 'Debate' },
      { id: 'break_into_two', name: 'Break into 2', description: 'Protagonist commits to the journey', pageRange: '25', percentage: 25, act: 'ACT 1', section: 'Debate' },
      { id: 'b_story', name: 'B Story', description: 'The love story or secondary plot begins', pageRange: '30', percentage: 30, act: 'ACT 2A', section: 'Fun and Games' },
      { id: 'fun_and_games', name: 'Fun and Games', description: 'The promise of the premise is delivered', pageRange: '30-55', percentage: 42, act: 'ACT 2A', section: 'Fun and Games' },
      { id: 'midpoint', name: 'Midpoint', description: 'False victory or false defeat; stakes are raised', pageRange: '55', percentage: 55, act: 'ACT 2A', section: 'Fun and Games' },
      { id: 'bad_guys_close_in', name: 'Bad Guys Close In', description: 'Opposition strengthens, team fractures', pageRange: '55-75', percentage: 65, act: 'ACT 2B', section: 'Bad Guys Close In' },
      { id: 'all_is_lost', name: 'All Is Lost', description: 'The lowest point', pageRange: '75', percentage: 75, act: 'ACT 2B', section: 'Bad Guys Close In' },
      { id: 'dark_night', name: 'Dark Night of the Soul', description: 'Protagonist wallows in despair', pageRange: '75-85', percentage: 80, act: 'ACT 2B', section: 'Dark Night of the Soul' },
      { id: 'break_into_three', name: 'Break into 3', description: 'Solution found through A and B stories merging', pageRange: '85', percentage: 85, act: 'ACT 2B', section: 'Dark Night of the Soul' },
      { id: 'gather_team', name: 'Gather the Team', description: 'Protagonist rallies allies for the final push', pageRange: '85-90', percentage: 87, act: 'ACT 3', section: 'Finale' },
      { id: 'execute_plan', name: 'Execute the Plan', description: 'The team puts the plan into action', pageRange: '90-95', percentage: 90, act: 'ACT 3', section: 'Finale' },
      { id: 'high_tower', name: 'High Tower Surprise', description: 'An unexpected complication arises', pageRange: '95-100', percentage: 93, act: 'ACT 3', section: 'Finale' },
      { id: 'dig_deep', name: 'Dig Deep Down', description: 'Protagonist must find inner strength', pageRange: '100-105', percentage: 96, act: 'ACT 3', section: 'Finale' },
      { id: 'execute_new_plan', name: 'Execute a New Plan', description: 'A revised approach based on new understanding', pageRange: '105-108', percentage: 98, act: 'ACT 3', section: 'Finale' },
      { id: 'final_image', name: 'Final Image', description: 'Mirror of opening; shows transformation', pageRange: '110', percentage: 100, act: 'ACT 3', section: 'Finale' },
    ],
  },
  heros_journey: {
    name: "Hero's Journey",
    icon: <Compass className="h-4 w-4" />,
    beats: [
      { id: 'ordinary_world', name: 'Ordinary World', description: 'Hero in their normal environment', pageRange: '1-12', percentage: 10, act: 'ACT 1', section: 'Departure' },
      { id: 'call_to_adventure', name: 'Call to Adventure', description: 'Hero receives invitation to change', pageRange: '12-17', percentage: 15, act: 'ACT 1', section: 'Departure' },
      { id: 'refusal', name: 'Refusal of the Call', description: 'Hero hesitates or refuses', pageRange: '17-25', percentage: 22, act: 'ACT 1', section: 'Departure' },
      { id: 'meeting_mentor', name: 'Meeting the Mentor', description: 'Hero gains guidance or tools', pageRange: '25-30', percentage: 27, act: 'ACT 1', section: 'Departure' },
      { id: 'crossing_threshold', name: 'Crossing the Threshold', description: 'Hero enters the special world', pageRange: '30', percentage: 30, act: 'ACT 1', section: 'Departure' },
      { id: 'tests_allies', name: 'Tests, Allies, Enemies', description: 'Hero learns the rules', pageRange: '30-55', percentage: 45, act: 'ACT 2', section: 'Initiation' },
      { id: 'approach', name: 'Approach to Inmost Cave', description: 'Hero prepares for major challenge', pageRange: '55-60', percentage: 55, act: 'ACT 2', section: 'Initiation' },
      { id: 'ordeal', name: 'Ordeal', description: 'Hero faces death or greatest fear', pageRange: '60-65', percentage: 60, act: 'ACT 2', section: 'Initiation' },
      { id: 'reward', name: 'Reward', description: 'Hero gains what they sought', pageRange: '65-75', percentage: 70, act: 'ACT 2', section: 'Initiation' },
      { id: 'road_back', name: 'The Road Back', description: 'Hero begins journey home', pageRange: '75-85', percentage: 80, act: 'ACT 3', section: 'Return' },
      { id: 'resurrection', name: 'Resurrection', description: 'Final test; hero is transformed', pageRange: '85-100', percentage: 92, act: 'ACT 3', section: 'Return' },
      { id: 'return_elixir', name: 'Return with the Elixir', description: 'Hero returns transformed', pageRange: '100-110', percentage: 100, act: 'ACT 3', section: 'Return' },
    ],
  },
  seven_point: {
    name: '7-Point Structure',
    icon: <Triangle className="h-4 w-4" />,
    beats: [
      { id: 'hook', name: 'Hook', description: 'Opposite state of resolution; grab attention', pageRange: '1-10', percentage: 8, act: 'ACT 1', section: 'Beginning' },
      { id: 'plot_turn_1', name: 'Plot Turn 1', description: 'Introduce conflict; set story in motion', pageRange: '20-30', percentage: 25, act: 'ACT 1', section: 'Beginning' },
      { id: 'pinch_1', name: 'Pinch Point 1', description: 'Apply pressure; force into action', pageRange: '37-45', percentage: 38, act: 'ACT 2', section: 'Middle' },
      { id: 'midpoint', name: 'Midpoint', description: 'Move from reaction to action', pageRange: '50-60', percentage: 50, act: 'ACT 2', section: 'Middle' },
      { id: 'pinch_2', name: 'Pinch Point 2', description: 'Apply more pressure; all seems lost', pageRange: '62-75', percentage: 62, act: 'ACT 2', section: 'Middle' },
      { id: 'plot_turn_2', name: 'Plot Turn 2', description: 'Final piece falls into place', pageRange: '75-85', percentage: 80, act: 'ACT 3', section: 'End' },
      { id: 'resolution', name: 'Resolution', description: 'Hero achieves (or fails) goal', pageRange: '100-110', percentage: 100, act: 'ACT 3', section: 'End' },
    ],
  },
};

const ACT_COLORS: Record<string, { bg: string; border: string; text: string; cardBg: string }> = {
  'ACT 1': { bg: 'bg-violet-500/10', border: 'border-violet-500/40', text: 'text-violet-400', cardBg: 'bg-violet-500/5' },
  'ACT 2A': { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-400', cardBg: 'bg-pink-500/5' },
  'ACT 2': { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-400', cardBg: 'bg-pink-500/5' },
  'ACT 2B': { bg: 'bg-teal-500/10', border: 'border-teal-500/40', text: 'text-teal-400', cardBg: 'bg-teal-500/5' },
  'ACT 3': { bg: 'bg-lime-500/10', border: 'border-lime-500/40', text: 'text-lime-400', cardBg: 'bg-lime-500/5' },
};

function getStatusIcon(status: BeatNode['status']) {
  switch (status) {
    case 'mapped': return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    case 'partial': return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    case 'missing': return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'border-green-500/40 bg-green-500/10 text-green-400';
  if (score >= 60) return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
  return 'border-red-500/40 bg-red-500/10 text-red-400';
}

// Auto-tag scenes to beats
function autoTagScenesToBeats(
  beats: { id: string; name: string; description: string; percentage: number }[],
  scenes: { id: string; scene_number: string; slugline: string | null; description?: string | null; beat_tag?: string | null }[]
): Record<string, string[]> {
  if (!scenes.length || !beats.length) return {};

  const beatKeywords: Record<string, string[]> = {
    'opening_image': ['open', 'begin', 'start', 'first', 'dawn', 'morning'],
    'theme_stated': ['theme', 'lesson', 'moral', 'truth', 'meaning'],
    'setup': ['setup', 'introduce', 'world', 'normal', 'daily', 'routine', 'home'],
    'catalyst': ['catalyst', 'inciting', 'discover', 'news', 'call', 'change'],
    'debate': ['debate', 'hesitate', 'doubt', 'question', 'refuse', 'reluctant'],
    'break_into_two': ['commit', 'decide', 'leave', 'journey', 'depart', 'threshold'],
    'b_story': ['love', 'romance', 'subplot', 'friendship', 'bond', 'ally'],
    'fun_and_games': ['adventure', 'fun', 'explore', 'action', 'promise', 'montage'],
    'midpoint': ['midpoint', 'twist', 'reveal', 'raise', 'stakes', 'victory'],
    'bad_guys_close_in': ['enemy', 'villain', 'attack', 'betray', 'fracture', 'threat'],
    'all_is_lost': ['lost', 'death', 'defeat', 'lowest', 'fail', 'destroy'],
    'dark_night': ['despair', 'dark', 'night', 'soul', 'grieve', 'mourn', 'alone'],
    'break_into_three': ['solution', 'realize', 'plan', 'merge', 'idea', 'eureka'],
    'gather_team': ['gather', 'rally', 'team', 'allies', 'assemble', 'unite'],
    'execute_plan': ['execute', 'plan', 'action', 'begin', 'attack', 'infiltrate'],
    'high_tower': ['surprise', 'complication', 'twist', 'unexpected', 'tower'],
    'dig_deep': ['dig', 'deep', 'inner', 'strength', 'courage', 'believe'],
    'execute_new_plan': ['new plan', 'revised', 'adapt', 'overcome', 'final push'],
    'finale': ['finale', 'final', 'battle', 'confront', 'climax', 'fight'],
    'final_image': ['end', 'final', 'close', 'transform', 'mirror', 'conclusion'],
    'ordinary_world': ['ordinary', 'normal', 'home', 'daily', 'routine'],
    'call_to_adventure': ['call', 'adventure', 'invitation', 'mission', 'quest'],
    'refusal': ['refuse', 'hesitate', 'doubt', 'fear', 'reluctant'],
    'meeting_mentor': ['mentor', 'guide', 'teacher', 'wise', 'train', 'learn'],
    'crossing_threshold': ['cross', 'threshold', 'enter', 'new world', 'portal'],
    'tests_allies': ['test', 'ally', 'enemy', 'challenge', 'trial', 'friend'],
    'approach': ['approach', 'prepare', 'plan', 'cave', 'inner'],
    'ordeal': ['ordeal', 'death', 'fear', 'greatest', 'face', 'battle'],
    'reward': ['reward', 'gain', 'treasure', 'prize', 'seize', 'victory'],
    'road_back': ['return', 'road', 'back', 'chase', 'escape'],
    'resurrection': ['resurrection', 'final test', 'transform', 'reborn'],
    'return_elixir': ['return', 'elixir', 'home', 'changed', 'new'],
    'hook': ['hook', 'opening', 'grab', 'attention', 'begin'],
    'plot_turn_1': ['conflict', 'turn', 'motion', 'incident', 'catalyst'],
    'pinch_1': ['pressure', 'force', 'action', 'threat'],
    'pinch_2': ['more pressure', 'lost', 'dark', 'desperate'],
    'plot_turn_2': ['final piece', 'place', 'revelation', 'key'],
    'resolution': ['resolution', 'achieve', 'goal', 'end', 'conclude'],
  };

  const result: Record<string, string[]> = {};
  const assignedSceneIds = new Set<string>();
  
  scenes.forEach(scene => {
    if (scene.beat_tag) {
      if (!result[scene.beat_tag]) result[scene.beat_tag] = [];
      result[scene.beat_tag].push(scene.id);
      assignedSceneIds.add(scene.id);
    }
  });

  const untaggedScenes = scenes.filter(s => !s.beat_tag);
  const totalScenes = scenes.length;

  beats.forEach(beat => {
    if (result[beat.id] && result[beat.id].length > 0) return;
    const keywords = beatKeywords[beat.id] || beat.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const beatPosition = beat.percentage / 100;

    const scored = untaggedScenes
      .filter(s => !assignedSceneIds.has(s.id))
      .map(scene => {
        let score = 0;
        const sceneIdx = scenes.findIndex(s => s.id === scene.id);
        const sceneText = `${scene.slugline || ''} ${scene.description || ''}`.toLowerCase();
        keywords.forEach(kw => { if (sceneText.includes(kw)) score += 3; });
        const scenePosition = sceneIdx / Math.max(totalScenes - 1, 1);
        const positionDiff = Math.abs(scenePosition - beatPosition);
        if (positionDiff < 0.08) score += 4;
        else if (positionDiff < 0.15) score += 2;
        else if (positionDiff < 0.25) score += 1;
        return { scene, score };
      });

    const bestMatch = scored.sort((a, b) => b.score - a.score)[0];
    if (bestMatch && bestMatch.score >= 3) {
      if (!result[beat.id]) result[beat.id] = [];
      result[beat.id].push(bestMatch.scene.id);
      assignedSceneIds.add(bestMatch.scene.id);
    }
  });

  return result;
}

// Storage for beat-level analysis cache
const BEAT_ANALYSIS_CACHE_KEY = 'beat-analysis-individual-cache';

function getBeatAnalysisFromCache(projectTitle: string | undefined, structureName: string, beatId: string): BeatAnalysis | null {
  try {
    const cached = localStorage.getItem(BEAT_ANALYSIS_CACHE_KEY);
    if (!cached) return null;
    const all = JSON.parse(cached);
    const key = `${projectTitle || 'unknown'}_${structureName}_${beatId}`;
    return all[key] || null;
  } catch { return null; }
}

function saveBeatAnalysisToCache(projectTitle: string | undefined, structureName: string, analysis: BeatAnalysis) {
  try {
    const cached = localStorage.getItem(BEAT_ANALYSIS_CACHE_KEY);
    const all = cached ? JSON.parse(cached) : {};
    const key = `${projectTitle || 'unknown'}_${structureName}_${analysis.beatId}`;
    all[key] = analysis;
    localStorage.setItem(BEAT_ANALYSIS_CACHE_KEY, JSON.stringify(all));
  } catch (e) { console.error('Cache save failed', e); }
}

export default function BeatBoard() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const queryClient = useQueryClient();
  const [structure, setStructure] = useState<BeatStructure>('save_the_cat');
  const [nodes, setNodes] = useState<BeatNode[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'beats' | 'scenes'>('beats');
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagDialogBeatId, setTagDialogBeatId] = useState<string | null>(null);
  const [analyzingBeatId, setAnalyzingBeatId] = useState<string | null>(null);
  const [beatAnalyses, setBeatAnalyses] = useState<Record<string, BeatAnalysis>>({});
  const [addingSceneForBeat, setAddingSceneForBeat] = useState<string | null>(null);

  const { data: projects, isLoading: projectsLoading } = useAssignedProjects();
  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;
  const activeProjectTitle = projects?.find(p => p.id === activeProjectId)?.title;

  const { data: scenes } = useQuery({
    queryKey: ['beat-board-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, beat_tag, characters, props, location')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  const tagScene = useMutation({
    mutationFn: async ({ sceneId, beatTag }: { sceneId: string; beatTag: string | null }) => {
      const { error } = await supabase
        .from('scenes')
        .update({ beat_tag: beatTag })
        .eq('id', sceneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beat-board-scenes'] });
      toast.success('Scene tagged successfully');
    },
    onError: () => toast.error('Failed to tag scene'),
  });

  // Add AI suggestion as a new scene to the script
  const addSuggestionAsScene = useMutation({
    mutationFn: async ({ suggestion, beatId }: { suggestion: SceneSuggestion; beatId: string }) => {
      if (!activeProjectId) throw new Error('No project selected');
      // Find what scene number to use
      const maxScene = scenes?.reduce((max, s) => {
        const num = parseInt(s.scene_number) || 0;
        return num > max ? num : max;
      }, 0) || 0;
      const newSceneNumber = String(maxScene + 1);

      const { data, error } = await supabase
        .from('scenes')
        .insert({
          project_id: activeProjectId,
          scene_number: newSceneNumber,
          slugline: suggestion.title,
          description: suggestion.description,
          characters: suggestion.characters || [],
          location: suggestion.location || null,
          beat_tag: beatId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['beat-board-scenes'] });
      toast.success(`Scene added to script and mapped to "${nodes.find(n => n.id === vars.beatId)?.name}"`);
      setAddingSceneForBeat(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add scene'),
  });

  // Analyze a single missing beat
  const analyzeSingleBeat = async (beatId: string) => {
    // Check cache first
    const cached = getBeatAnalysisFromCache(activeProjectTitle, STRUCTURE_DEFINITIONS[structure].name, beatId);
    if (cached) {
      setBeatAnalyses(prev => ({ ...prev, [beatId]: cached }));
      return;
    }

    setAnalyzingBeatId(beatId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-beats', {
        body: {
          beats: nodes,
          scenes: (scenes || []).map(s => ({
            id: s.id, scene_number: s.scene_number, slugline: s.slugline,
            description: s.description || null, characters: s.characters || null,
            props: s.props || null, location: s.location || null, beat_tag: s.beat_tag || null,
          })),
          structureName: STRUCTURE_DEFINITIONS[structure].name,
          projectTitle: activeProjectTitle,
          missingBeatId: beatId,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Analysis failed');
      const analysis = data.analyses?.[0];
      if (analysis) {
        setBeatAnalyses(prev => ({ ...prev, [beatId]: analysis }));
        saveBeatAnalysisToCache(activeProjectTitle, STRUCTURE_DEFINITIONS[structure].name, analysis);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Analysis failed');
    } finally {
      setAnalyzingBeatId(null);
    }
  };

  // Build nodes when structure/scenes change + auto-tag
  useEffect(() => {
    const def = STRUCTURE_DEFINITIONS[structure];
    const autoTags = scenes ? autoTagScenesToBeats(def.beats, scenes) : {};

    if (scenes && activeProjectId) {
      const updates: { sceneId: string; beatTag: string }[] = [];
      Object.entries(autoTags).forEach(([beatId, sceneIds]) => {
        sceneIds.forEach(sceneId => {
          const scene = scenes.find(s => s.id === sceneId);
          if (scene && !scene.beat_tag) {
            updates.push({ sceneId, beatTag: beatId });
          }
        });
      });
      if (updates.length > 0) {
        Promise.all(
          updates.map(({ sceneId, beatTag }) =>
            supabase.from('scenes').update({ beat_tag: beatTag }).eq('id', sceneId)
          )
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: ['beat-board-scenes'] });
        });
      }
    }

    const newNodes: BeatNode[] = def.beats.map(beat => {
      const manuallyTagged = scenes?.filter(s => s.beat_tag === beat.id) || [];
      const autoTagged = autoTags[beat.id] || [];
      const allSceneIds = [...new Set([...manuallyTagged.map(s => s.id), ...autoTagged])];
      return { ...beat, status: allSceneIds.length > 0 ? 'mapped' : 'missing', sceneIds: allSceneIds };
    });

    setNodes(newNodes);
  }, [structure, scenes, activeProjectId]);

  const stats = useMemo(() => {
    const mapped = nodes.filter(n => n.status === 'mapped').length;
    const missing = nodes.filter(n => n.status === 'missing').length;
    return { mapped, missing, total: nodes.length };
  }, [nodes]);

  // Group beats by act
  const actGroups = useMemo(() => {
    const groups: { act: string; sections: { name: string; beats: BeatNode[] }[] }[] = [];
    const actMap = new Map<string, Map<string, BeatNode[]>>();
    nodes.forEach(node => {
      const act = node.act || 'Other';
      const section = node.section || '';
      if (!actMap.has(act)) actMap.set(act, new Map());
      const sectionMap = actMap.get(act)!;
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(node);
    });
    actMap.forEach((sectionMap, act) => {
      const sections: { name: string; beats: BeatNode[] }[] = [];
      sectionMap.forEach((beats, name) => { sections.push({ name, beats }); });
      groups.push({ act, sections });
    });
    return groups;
  }, [nodes]);

  const tagDialogBeat = nodes.find(n => n.id === tagDialogBeatId);
  const tagDialogScenes = scenes?.filter(s => tagDialogBeat?.sceneIds.includes(s.id)) || [];

  if (projectsLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-[600px]" /></div>;
  }

  // Render a beat card with popover
  const renderBeatCard = (beat: BeatNode) => {
    const isMapped = beat.status === 'mapped';
    const beatScenes = scenes?.filter(s => beat.sceneIds.includes(s.id)) || [];
    const firstScene = beatScenes[0];
    const isAnalyzing = analyzingBeatId === beat.id;
    const analysis = beatAnalyses[beat.id];

    return (
      <Popover key={beat.id}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative flex flex-col rounded-lg border-2 p-3 min-w-[130px] max-w-[170px] min-h-[90px] transition-all text-left",
              "hover:shadow-lg hover:scale-[1.03] hover:z-10",
              isMapped
                ? "border-primary/40 bg-primary/5 hover:border-primary/70"
                : "border-dashed border-muted-foreground/30 bg-muted/20 hover:border-amber-500/50 hover:bg-amber-500/5",
            )}
          >
            {/* Status dot */}
            <div className="absolute top-1.5 right-1.5">
              {getStatusIcon(beat.status)}
            </div>

            {/* Beat label (small, muted) */}
            <span className={cn(
              "text-[9px] font-semibold uppercase tracking-wider mb-1",
              isMapped ? "text-primary/70" : "text-muted-foreground"
            )}>
              {beat.name}
            </span>

            {/* Scene title + description (main content) */}
            {isMapped && firstScene ? (
              <>
                <span className="text-xs font-semibold leading-tight line-clamp-2 text-foreground">
                  {firstScene.slugline || `Scene ${firstScene.scene_number}`}
                </span>
                {firstScene.description && (
                  <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                    {firstScene.description}
                  </span>
                )}
                {beatScenes.length > 1 && (
                  <Badge variant="secondary" className="text-[8px] h-4 mt-1 w-fit">
                    +{beatScenes.length - 1} more
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground italic mt-1">
                No scene mapped
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          className="w-[380px] max-h-[450px] overflow-y-auto p-0"
          sideOffset={6}
        >
          {/* Popover header */}
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(beat.status)}
                <h4 className="text-sm font-semibold">{beat.name}</h4>
                <Badge variant="outline" className="text-[9px]">p.{beat.pageRange}</Badge>
              </div>
              <Button variant="outline" size="sm" className="text-xs gap-1 h-6" onClick={() => { setTagDialogBeatId(beat.id); setShowTagDialog(true); }}>
                <Edit2 className="h-3 w-3" /> Remap
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{beat.description}</p>
          </div>

          {/* Mapped beat: show scenes + AI explanation */}
          {isMapped && (
            <div className="p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linked Scenes</p>
              {beatScenes.map(s => (
                <div key={s.id} className="rounded-md border bg-card p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Film className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">Scene {s.scene_number}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground ml-5">{s.slugline}</p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1 ml-5">{s.description}</p>
                  )}
                  {s.characters && (s.characters as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
                      {(s.characters as string[]).map(c => (
                        <Badge key={c} variant="secondary" className="text-[9px] py-0">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* AI explanation for mapped beat */}
              {analysis ? (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 mt-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">AI Explanation</span>
                  </div>
                  <p className="text-xs leading-relaxed">{analysis.diagnosis}</p>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 w-full mt-1"
                  onClick={() => analyzeSingleBeat(beat.id)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Get AI Explanation
                </Button>
              )}
            </div>
          )}

          {/* Missing beat: show AI suggestions */}
          {!isMapped && (
            <div className="p-3">
              {analysis ? (
                <div className="space-y-3">
                  {/* Diagnosis */}
                  <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-500">Why This Is Missing</span>
                    </div>
                    <p className="text-xs leading-relaxed">{analysis.diagnosis}</p>
                  </div>

                  {/* Impact */}
                  <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="h-3 w-3 text-red-400" />
                      <span className="text-[10px] font-semibold text-red-400">Story Impact</span>
                    </div>
                    <p className="text-xs leading-relaxed">{analysis.impact}</p>
                  </div>

                  {analysis.narrativePosition && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span><strong className="text-foreground">Position:</strong> {analysis.narrativePosition}</span>
                    </div>
                  )}

                  {/* Scene suggestions */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      AI Scene Suggestions — pick one to add
                    </p>
                    <div className="space-y-2">
                      {(analysis.sceneSuggestions || [])
                        .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
                        .map((suggestion, idx) => (
                          <div key={idx} className={cn("rounded-lg border p-2.5 transition-colors", getScoreColor(suggestion.fitScore))}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border",
                                    suggestion.fitScore >= 80 ? "border-green-500/50 bg-green-500/20" :
                                    suggestion.fitScore >= 60 ? "border-amber-500/50 bg-amber-500/20" :
                                    "border-red-500/50 bg-red-500/20"
                                  )}>
                                    <span className="text-[10px] font-bold">{suggestion.fitScore}</span>
                                  </div>
                                  <h5 className="text-xs font-semibold text-foreground">{suggestion.title}</h5>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{suggestion.description}</p>

                                {suggestion.characters?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    <Users className="h-2.5 w-2.5 text-muted-foreground mt-0.5" />
                                    {suggestion.characters.map(c => (
                                      <Badge key={c} variant="secondary" className="text-[8px] py-0">{c}</Badge>
                                    ))}
                                  </div>
                                )}

                                {suggestion.fitReason && (
                                  <div className="mt-1.5 rounded bg-background/50 p-1.5 border border-border/50">
                                    <span className="text-[9px] text-muted-foreground"><Star className="h-2.5 w-2.5 inline mr-1" />{suggestion.fitReason}</span>
                                  </div>
                                )}
                              </div>

                              {/* Add to script button */}
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-[10px] gap-1 flex-shrink-0"
                                disabled={addSuggestionAsScene.isPending}
                                onClick={() => addSuggestionAsScene.mutate({ suggestion, beatId: beat.id })}
                              >
                                {addSuggestionAsScene.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                Add
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Click below to get AI-generated scene suggestions for this missing beat
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => analyzeSingleBeat(beat.id)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isAnalyzing ? 'Analyzing...' : 'Get AI Suggestions'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-7 w-7 text-primary" />
            Beat Board
          </h1>
          <p className="text-muted-foreground text-sm">Click any beat card for details and AI analysis</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={structure} onValueChange={(v) => setStructure(v as BeatStructure)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STRUCTURE_DEFINITIONS).map(([key, def]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">{def.icon}<span>{def.name}</span></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => setShowRightPanel(!showRightPanel)} className="gap-1">
            {showRightPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>{stats.mapped} Mapped</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <span>{stats.missing} Missing</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Beat Sheet */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 pb-4 pr-2">
            {actGroups.map(({ act, sections }) => {
              const actColor = ACT_COLORS[act] || ACT_COLORS['ACT 1'];
              return (
                <div key={act} className="flex gap-3">
                  {/* Act Label */}
                  <div className={cn(
                    "w-14 flex-shrink-0 rounded-lg flex items-center justify-center border",
                    actColor.bg, actColor.border
                  )}>
                    <span className={cn("text-xs font-bold tracking-widest", actColor.text)}
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
                    >
                      {act}
                    </span>
                  </div>

                  {/* Sections and beats */}
                  <div className="flex-1 space-y-2">
                    {sections.map(({ name: sectionName, beats }) => (
                      <div key={sectionName}>
                        {sectionName && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-semibold text-muted-foreground tracking-wide">{sectionName}</span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {beats.map(beat => renderBeatCard(beat))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Right Panel: AI Analysis */}
        {showRightPanel && scenes && scenes.length > 0 && (
          <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0 max-h-full overflow-hidden border-l">
            {/* Tab switcher */}
            <div className="flex border-b bg-muted/20 flex-shrink-0">
              <button
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2",
                  rightPanelTab === 'beats' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setRightPanelTab('beats')}
              >
                Beat Analysis
              </button>
              <button
                className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2",
                  rightPanelTab === 'scenes' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setRightPanelTab('scenes')}
              >
                Scene Analysis
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'beats' ? (
                <ScrollArea className="h-full">
                  <div className="p-2">
                    <BeatAnalysisPanel
                      beats={nodes}
                      scenes={scenes}
                      structureName={STRUCTURE_DEFINITIONS[structure].name}
                      projectTitle={activeProjectTitle}
                    />
                  </div>
                </ScrollArea>
              ) : (
                <SceneAnalysisPanel
                  scenes={scenes || []}
                  projectTitle={activeProjectTitle}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tag/Remap Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Remap Scenes — "{tagDialogBeat?.name}"
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pr-3">
              {tagDialogScenes.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Currently Tagged:</p>
                  {tagDialogScenes.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-primary/5 mb-1">
                      <span className="text-sm">Scene {s.scene_number}: {s.slugline}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => tagScene.mutate({ sceneId: s.id, beatTag: null })}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">All Scenes (click to assign):</p>
                {scenes?.map(s => {
                  const isTaggedHere = tagDialogBeat?.sceneIds.includes(s.id);
                  const isTaggedElsewhere = s.beat_tag && s.beat_tag !== tagDialogBeat?.id;
                  return (
                    <div key={s.id} className={cn(
                      "flex items-center justify-between py-1.5 px-2 rounded mb-1",
                      isTaggedHere ? "bg-primary/10" : "hover:bg-muted/50"
                    )}>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">Scene {s.scene_number}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{s.slugline}</p>
                        {isTaggedElsewhere && (
                          <Badge variant="outline" className="text-[8px] mt-0.5">
                            Tagged: {nodes.find(n => n.id === s.beat_tag)?.name || s.beat_tag}
                          </Badge>
                        )}
                      </div>
                      {isTaggedHere ? (
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => tagScene.mutate({ sceneId: s.id, beatTag: null })}>
                          <X className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => tagScene.mutate({ sceneId: s.id, beatTag: tagDialogBeat!.id })}>
                          <Tag className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Bookmark className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a project</p>
            <p className="text-sm">Choose a project and story structure to visualize beats</p>
          </div>
        </div>
      )}
    </div>
  );
}
