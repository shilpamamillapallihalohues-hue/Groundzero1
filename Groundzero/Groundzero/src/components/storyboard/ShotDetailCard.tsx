import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Camera, Video, Lightbulb, Clock, Users, 
  Box, MapPin, Image as ImageIcon, Download,
  Sparkles, RefreshCw, Palette
} from 'lucide-react';

interface ShotDetailCardProps {
  shot: {
    id: string;
    shot_number: string;
    shot_type: string | null;
    camera_angle: string | null;
    lighting: string | null;
    mood: string | null;
    action: string | null;
    image_url: string | null;
    status: string;
    scene_id: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onRegenerate?: () => void;
}

export function ShotDetailCard({ shot, isOpen, onClose, onRegenerate }: ShotDetailCardProps) {
  // Fetch scene details for character/prop info
  const { data: scene } = useQuery({
    queryKey: ['scene-for-shot', shot.scene_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('id', shot.scene_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  // Fetch concept arts for this scene
  const { data: conceptArts = [] } = useQuery({
    queryKey: ['shot-concept-arts', shot.scene_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type')
        .eq('scene_id', shot.scene_id)
        .eq('status', 'approved')
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      case 'needs_revision': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Get props from scene data if available
  const sceneProps = scene?.props as string[] | undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Shot {shot.shot_number}
            </DialogTitle>
            <Badge className={getStatusColor(shot.status)}>
              {shot.status?.replace('_', ' ') || 'draft'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
              {shot.image_url ? (
                <img 
                  src={shot.image_url} 
                  alt={shot.shot_number}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No image generated</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {shot.image_url && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(shot.image_url!, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button 
                size="sm" 
                className="flex-1"
                onClick={onRegenerate}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {shot.image_url ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {/* Related Concept Arts */}
            {conceptArts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Scene Concept Arts
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {conceptArts.map((art) => (
                    <div key={art.id} className="aspect-video bg-muted rounded overflow-hidden">
                      {art.image_url && (
                        <img 
                          src={art.image_url} 
                          alt={art.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            {/* Technical Details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium">Technical Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Shot Type</p>
                      <p className="font-medium">{shot.shot_type || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Camera Angle</p>
                      <p className="font-medium">{shot.camera_angle || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lighting</p>
                      <p className="font-medium">{shot.lighting || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Description */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Action/Description</h4>
                <p className="text-sm text-muted-foreground">
                  {shot.action || 'No action description provided'}
                </p>
              </CardContent>
            </Card>

            {/* Mood */}
            {shot.mood && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Mood</h4>
                  <p className="text-sm text-muted-foreground">{shot.mood}</p>
                </CardContent>
              </Card>
            )}

            {/* Scene Context */}
            {scene && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium">Scene Context</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{scene.location || 'No location'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{scene.time_of_day || 'Day'}</span>
                    </div>
                    {scene.characters && scene.characters.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {scene.characters.map((char: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{char}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Props from scene */}
            {sceneProps && sceneProps.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Props in Scene
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {sceneProps.map((prop: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{prop}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
