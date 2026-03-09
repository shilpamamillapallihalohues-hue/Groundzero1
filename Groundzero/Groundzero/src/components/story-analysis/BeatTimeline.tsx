import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, AlertTriangle, XCircle, Clock, FileText } from 'lucide-react';
import { 
  SAVE_THE_CAT_BEATS, 
  SEQUENCE_METHOD_STEPS, 
  HERO_JOURNEY_STEPS, 
  SEVEN_POINT_STEPS,
  StoryFramework,
  SceneBeatMapping 
} from '@/types/storyFrameworks';

interface BeatTimelineProps {
  framework: StoryFramework;
  sceneMappings: SceneBeatMapping[];
  totalScenes: number;
  scenes?: any[];
}

export function BeatTimeline({ framework, sceneMappings, totalScenes, scenes = [] }: BeatTimelineProps) {
  const [selectedBeat, setSelectedBeat] = useState<{ id: string; name: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getBeatsForFramework = () => {
    switch (framework) {
      case 'save_the_cat':
        return SAVE_THE_CAT_BEATS.map(b => ({ id: b.id, name: b.name, color: b.color, description: b.description }));
      case 'sequence_method':
        return SEQUENCE_METHOD_STEPS.map(s => ({ id: s.id, name: s.name, color: s.color, description: s.description }));
      case 'hero_journey':
        return HERO_JOURNEY_STEPS.map(h => ({ id: h.id, name: h.name, color: h.color, description: h.description }));
      case 'seven_point':
        return SEVEN_POINT_STEPS.map(s => ({ id: s.id, name: s.name, color: s.color, description: s.description }));
      default:
        return [];
    }
  };

  const beats = getBeatsForFramework();

  const getBeatStatus = (beatId: string) => {
    const mappedScenes = sceneMappings.filter(sm => 
      sm.mappedBeats.some(mb => mb.framework === framework && mb.beatId === beatId)
    );
    
    if (mappedScenes.length === 0) return 'missing';
    
    const avgConfidence = mappedScenes.reduce((acc, sm) => {
      const beat = sm.mappedBeats.find(mb => mb.framework === framework && mb.beatId === beatId);
      return acc + (beat?.confidence || 0);
    }, 0) / mappedScenes.length;
    
    if (avgConfidence >= 80) return 'strong';
    if (avgConfidence >= 50) return 'weak';
    return 'missing';
  };

  const getScenesForBeat = (beatId: string) => {
    const mappedSceneIds = sceneMappings
      .filter(sm => sm.mappedBeats.some(mb => mb.framework === framework && mb.beatId === beatId))
      .map(sm => sm.sceneId);
    
    return scenes.filter(scene => mappedSceneIds.includes(scene.id));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'strong':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'weak':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'strong':
        return 'Well Defined';
      case 'weak':
        return 'Needs Work';
      case 'missing':
        return 'Not Found';
      default:
        return 'Unknown';
    }
  };

  const handleBeatClick = (beat: { id: string; name: string }) => {
    setSelectedBeat(beat);
    setDialogOpen(true);
  };

  const selectedBeatScenes = selectedBeat ? getScenesForBeat(selectedBeat.id) : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Beat Timeline</span>
            <Badge variant="outline">
              {beats.filter(b => getBeatStatus(b.id) === 'strong').length}/{beats.length} Beats Covered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline bar */}
            <div className="absolute top-6 left-0 right-0 h-2 bg-muted rounded-full" />
            
            {/* Beat markers */}
            <div className="relative flex justify-between pt-1 pb-8">
              {beats.map((beat, index) => {
                const status = getBeatStatus(beat.id);
                const scenesForBeat = getScenesForBeat(beat.id);
                return (
                  <Tooltip key={beat.id}>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex flex-col items-center cursor-pointer z-10 group"
                        style={{ width: `${100 / beats.length}%` }}
                        onClick={() => handleBeatClick(beat)}
                      >
                        <div 
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-background transition-transform group-hover:scale-125
                            ${status === 'strong' ? 'border-green-500' : 
                              status === 'weak' ? 'border-amber-500' : 'border-red-500'}`}
                          style={{ borderColor: status === 'strong' ? beat.color : undefined }}
                        >
                          {getStatusIcon(status)}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-2 text-center line-clamp-2 px-1 group-hover:text-foreground transition-colors">
                          {beat.name}
                        </span>
                        {scenesForBeat.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] mt-1 px-1.5 py-0">
                            {scenesForBeat.length} scene{scenesForBeat.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium" style={{ color: beat.color }}>{beat.name}</p>
                        <p className="text-xs text-muted-foreground">{beat.description}</p>
                        <Badge 
                          variant={status === 'strong' ? 'default' : status === 'weak' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {getStatusLabel(status)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click to view mapped scenes
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>Well Defined</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Needs Work</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span>Not Found</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scene Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Scenes for "{selectedBeat?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedBeatScenes.length > 0 ? (
              selectedBeatScenes.map((scene) => {
                const mapping = sceneMappings.find(sm => sm.sceneId === scene.id);
                const beatMapping = mapping?.mappedBeats.find(mb => mb.framework === framework && mb.beatId === selectedBeat?.id);
                
                return (
                  <Card key={scene.id} className="border-l-4 border-primary">
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Scene {scene.scene_number}
                            </Badge>
                            {beatMapping && (
                              <Badge 
                                variant={beatMapping.confidence >= 80 ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {beatMapping.confidence}% confidence
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{scene.slugline || `Scene ${scene.scene_number}`}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {scene.description || 'No description available'}
                          </p>
                          {scene.characters && scene.characters.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {scene.characters.slice(0, 5).map((char: string) => (
                                <Badge key={char} variant="secondary" className="text-xs">
                                  {char}
                                </Badge>
                              ))}
                              {scene.characters.length > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{scene.characters.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                          {beatMapping?.aiNotes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              AI Note: {beatMapping.aiNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No scenes mapped to this beat</p>
                <p className="text-sm mt-1">
                  This beat may be missing from your script or needs to be added.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
