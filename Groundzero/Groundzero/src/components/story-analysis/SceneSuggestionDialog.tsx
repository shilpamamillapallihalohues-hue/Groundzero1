import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  Check, 
  Loader2, 
  FileText, 
  MapPin, 
  Clock, 
  Users, 
  MessageSquare,
  Lightbulb,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedScene {
  slugline: string;
  description: string;
  dialogue_excerpts: string[];
  characters: string[];
  location: string;
  time_of_day: string;
  props: string[];
  emotional_beat: string;
  placement_suggestion: string;
  estimated_page_count: number;
  director_notes: string;
}

interface SceneSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: {
    id: string;
    title: string;
    description: string;
    affectedBeat?: string;
    type: string;
  } | null;
  framework: string;
  projectId: string;
  projectContext: {
    title: string;
    genre: string;
    description: string;
    existingScenes: any[];
    characters: string[];
  };
  onSceneApproved: () => void;
}

export function SceneSuggestionDialog({
  open,
  onOpenChange,
  suggestion,
  framework,
  projectId,
  projectContext,
  onSceneApproved
}: SceneSuggestionDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScene, setGeneratedScene] = useState<GeneratedScene | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedScene, setEditedScene] = useState<GeneratedScene | null>(null);
  const [sceneNumber, setSceneNumber] = useState('');

  const frameworkBeatInfo: Record<string, Record<string, { name: string; description: string }>> = {
    save_the_cat: {
      'opening_image': { name: 'Opening Image', description: 'A visual that sets the tone, mood, and style' },
      'catalyst': { name: 'Catalyst', description: 'The moment where life changes - the inciting incident' },
      'midpoint': { name: 'Midpoint', description: 'A major twist - false victory or false defeat' },
      'all_is_lost': { name: 'All Is Lost', description: 'The lowest point, often with a whiff of death' },
      'finale': { name: 'Finale', description: 'The hero conquers their flaws and defeats the villain' },
    },
    hero_journey: {
      'meeting_mentor': { name: 'Meeting the Mentor', description: 'The hero gains guidance or equipment' },
      'ordeal': { name: 'The Ordeal', description: 'The hero faces their greatest fear or enemy' },
      'resurrection': { name: 'Resurrection', description: 'Final test where hero applies lessons learned' },
    }
  };

  const getBeatInfo = () => {
    if (!suggestion?.affectedBeat) return { name: suggestion?.title || 'Scene', description: suggestion?.description || '' };
    return frameworkBeatInfo[framework]?.[suggestion.affectedBeat] || { name: suggestion.title, description: suggestion.description };
  };

  const handleGenerateScene = async () => {
    if (!suggestion) return;
    
    setIsGenerating(true);
    const beatInfo = getBeatInfo();
    
    try {
      const response = await supabase.functions.invoke('generate-scene', {
        body: {
          beatId: suggestion.affectedBeat || suggestion.id,
          beatName: beatInfo.name,
          beatDescription: beatInfo.description,
          framework,
          projectContext: {
            title: projectContext.title,
            genre: projectContext.genre,
            description: projectContext.description,
            existingScenes: projectContext.existingScenes.map(s => ({
              scene_number: s.scene_number,
              slugline: s.slugline,
              description: s.description,
              characters: s.characters || [],
              location: s.location
            })),
            characters: projectContext.characters
          },
          suggestionType: suggestion.type
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate scene');
      }

      const data = response.data;
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedScene(data.scene);
      setEditedScene(data.scene);
      
      // Suggest scene number based on placement
      const nextSceneNumber = projectContext.existingScenes.length + 1;
      setSceneNumber(String(nextSceneNumber));
      
      toast.success('Scene generated! Review and approve to add it to your project.');
    } catch (error) {
      console.error('Scene generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate scene');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveScene = async () => {
    if (!editedScene || !projectId || !sceneNumber) {
      toast.error('Please provide a scene number');
      return;
    }
    
    setIsApproving(true);
    
    try {
      // Create the new scene in the database
      const { error } = await supabase.from('scenes').insert({
        project_id: projectId,
        scene_number: sceneNumber,
        slugline: editedScene.slugline,
        description: editedScene.description,
        location: editedScene.location,
        time_of_day: editedScene.time_of_day,
        characters: editedScene.characters,
        props: editedScene.props,
        notes: `${editedScene.director_notes}\n\nEmotional Beat: ${editedScene.emotional_beat}\nGenerated for: ${suggestion?.title}`,
        status: 'draft'
      });

      if (error) throw error;

      toast.success(`Scene ${sceneNumber} added to project!`);
      onSceneApproved();
      handleClose();
    } catch (error) {
      console.error('Failed to add scene:', error);
      toast.error('Failed to add scene to project');
    } finally {
      setIsApproving(false);
    }
  };

  const handleClose = () => {
    setGeneratedScene(null);
    setEditedScene(null);
    setEditMode(false);
    setSceneNumber('');
    onOpenChange(false);
  };

  const displayScene = editMode ? editedScene : generatedScene;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Scene Writer
          </DialogTitle>
          <DialogDescription>
            Generate a complete scene based on the "{suggestion?.title}" suggestion
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {!generatedScene ? (
            <div className="space-y-6 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">What will be generated:</h4>
                <p className="text-sm text-muted-foreground">{suggestion?.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Framework: {framework.replace('_', ' ')}</Badge>
                  <Badge variant="outline">Beat: {getBeatInfo().name}</Badge>
                  <Badge variant="secondary">~2-3 pages</Badge>
                </div>
              </div>

              <div className="text-center py-8">
                {isGenerating ? (
                  <div className="space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Writing your scene...</p>
                    <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Ready to generate a scene that fulfills this story beat</p>
                    <Button onClick={handleGenerateScene} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generate Scene
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Scene Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-mono text-lg font-bold">{displayScene?.slugline}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {displayScene?.location}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {displayScene?.time_of_day}
                    </Badge>
                    <Badge variant="secondary">~{displayScene?.estimated_page_count} pages</Badge>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditMode(!editMode)}
                  className="gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  {editMode ? 'Preview' : 'Edit'}
                </Button>
              </div>

              <Separator />

              {/* Scene Description */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Scene Description</Label>
                {editMode ? (
                  <Textarea
                    value={editedScene?.description || ''}
                    onChange={(e) => setEditedScene(prev => prev ? {...prev, description: e.target.value} : null)}
                    rows={8}
                    className="font-serif"
                  />
                ) : (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap font-serif leading-relaxed">
                      {displayScene?.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Dialogue Excerpts */}
              {displayScene?.dialogue_excerpts && displayScene.dialogue_excerpts.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Key Dialogue
                  </Label>
                  <div className="space-y-2">
                    {displayScene.dialogue_excerpts.map((line, i) => (
                      <div key={i} className="bg-muted/30 rounded p-3 italic text-sm border-l-2 border-primary/50">
                        "{line}"
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Characters & Props */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Characters
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {displayScene?.characters.map((char, i) => (
                      <Badge key={i} variant="secondary">{char}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2">Props</Label>
                  <div className="flex flex-wrap gap-1">
                    {displayScene?.props.length ? displayScene.props.map((prop, i) => (
                      <Badge key={i} variant="outline">{prop}</Badge>
                    )) : (
                      <span className="text-sm text-muted-foreground">No specific props</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Director Notes */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Director Notes
                </Label>
                <div className="bg-amber-500/10 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {displayScene?.director_notes}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Emotional Beat:</strong> {displayScene?.emotional_beat}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Scene Number Input */}
              <div className="bg-primary/5 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Scene Number</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="text"
                    value={sceneNumber}
                    onChange={(e) => setSceneNumber(e.target.value)}
                    placeholder="e.g., 12 or 12A"
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Suggested placement: {displayScene?.placement_suggestion}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {generatedScene && (
            <>
              <Button 
                variant="secondary" 
                onClick={handleGenerateScene}
                disabled={isGenerating}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Regenerate
              </Button>
              <Button 
                onClick={handleApproveScene}
                disabled={isApproving || !sceneNumber}
                className="gap-2"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve & Add Scene
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
