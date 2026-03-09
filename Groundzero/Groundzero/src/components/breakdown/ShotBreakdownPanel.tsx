import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Film, 
  Camera, 
  Sun, 
  Sparkles, 
  Loader2, 
  Wand2,
  ExternalLink,
  Image as ImageIcon,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getSceneStoryboards, generateStoryboard, saveStoryboard } from '@/lib/api';
import { toast } from 'sonner';

interface Shot {
  id: string;
  shot_number: string;
  shot_type: string | null;
  camera_angle: string | null;
  lighting: string | null;
  mood: string | null;
  action: string | null;
  image_url: string | null;
  status: string;
}

interface ShotBreakdownPanelProps {
  scene: any;
  projectId: string | null;
}

export function ShotBreakdownPanel({ scene, projectId }: ShotBreakdownPanelProps) {
  const navigate = useNavigate();
  const [shots, setShots] = useState<Shot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  useEffect(() => {
    if (scene?.id) {
      loadShots();
    } else {
      setShots([]);
      setIsLoading(false);
    }
  }, [scene?.id]);

  const loadShots = async () => {
    if (!scene?.id) return;
    
    setIsLoading(true);
    try {
      const storyboards = await getSceneStoryboards(scene.id);
      setShots(storyboards || []);
      if (storyboards && storyboards.length > 0) {
        setSelectedShot(storyboards[0]);
      }
    } catch (error) {
      console.error('Error loading shots:', error);
      toast.error('Failed to load shots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateShot = async () => {
    if (!scene?.id) {
      toast.error('Please save the scene to a project first');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateStoryboard({
        sceneId: scene.id,
        sceneNumber: scene.scene_number,
        slugline: scene.slugline,
        description: scene.description || '',
        characters: scene.characters || [],
        location: scene.location || '',
        timeOfDay: scene.time_of_day || 'day',
        mood: 'dramatic',
        shotType: 'wide shot',
        cameraAngle: 'eye level',
      });

      if (result.imageUrl) {
        const saved = await saveStoryboard({
          scene_id: scene.id,
          shot_number: `${scene.scene_number}-${shots.length + 1}`,
          image_url: result.imageUrl,
          prompt: result.prompt,
          shot_type: 'wide',
          camera_angle: 'eye level',
          mood: 'dramatic',
          action: scene.description?.substring(0, 200) || '',
        });

        setShots(prev => [...prev, saved]);
        setSelectedShot(saved);
        toast.success('Shot generated!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate shot');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoToStoryboards = () => {
    if (projectId) {
      navigate(`/storyboards?project=${projectId}`);
    }
  };

  if (!scene?.id) {
    return (
      <div className="p-6 text-center border border-dashed border-border rounded-xl">
        <Film className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h4 className="font-medium text-foreground mb-2">Scene Not Saved</h4>
        <p className="text-sm text-muted-foreground">
          Save this scene to a project to view and generate shot breakdowns
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">
            Shot Breakdown ({shots.length} shots)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {shots.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleGoToStoryboards} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View in Storyboards
            </Button>
          )}
          <Button 
            variant="gold" 
            size="sm" 
            onClick={handleGenerateShot}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Shot
              </>
            )}
          </Button>
        </div>
      </div>

      {shots.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h4 className="font-medium text-foreground mb-2">No Shots Yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Generate AI shots to break down this scene into individual frames
          </p>
          <Button 
            variant="gold" 
            onClick={handleGenerateShot}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate First Shot
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Shot List */}
          <div className="lg:col-span-1">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {shots.map((shot) => (
                  <button
                    key={shot.id}
                    onClick={() => setSelectedShot(shot)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedShot?.id === shot.id
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                        {shot.image_url ? (
                          <img 
                            src={shot.image_url} 
                            alt={`Shot ${shot.shot_number}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs mb-1">
                          Shot {shot.shot_number}
                        </Badge>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {shot.shot_type || 'Wide'} • {shot.camera_angle || 'Eye Level'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Selected Shot Detail */}
          <div className="lg:col-span-2">
            {selectedShot ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    Shot {selectedShot.shot_number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shot Image */}
                  {selectedShot.image_url && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={selectedShot.image_url} 
                        alt={`Shot ${selectedShot.shot_number}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Shot Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Camera className="w-4 h-4" />
                        <span className="text-xs">Shot Type</span>
                      </div>
                      <p className="font-medium text-foreground capitalize">
                        {selectedShot.shot_type || 'Wide'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Camera className="w-4 h-4" />
                        <span className="text-xs">Camera Angle</span>
                      </div>
                      <p className="font-medium text-foreground capitalize">
                        {selectedShot.camera_angle || 'Eye Level'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Sun className="w-4 h-4" />
                        <span className="text-xs">Lighting</span>
                      </div>
                      <p className="font-medium text-foreground capitalize">
                        {selectedShot.lighting || 'Natural'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs">Mood</span>
                      </div>
                      <p className="font-medium text-foreground capitalize">
                        {selectedShot.mood || 'Dramatic'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs">Location</span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto font-medium text-primary"
                        onClick={() => navigate(`/vp/location-intelligence?scene=${scene?.id}`)}
                      >
                        View Suggestions
                      </Button>
                    </div>
                  </div>

                  {/* Action Description */}
                  {selectedShot.action && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Action</p>
                      <p className="text-sm text-foreground">{selectedShot.action}</p>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <Badge variant={selectedShot.status === 'approved' ? 'success' : 'outline'}>
                      {selectedShot.status || 'Draft'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a shot to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
