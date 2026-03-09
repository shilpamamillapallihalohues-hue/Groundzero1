import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Film, Upload, Play } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function SceneAnimatics() {
  const [selectedScene, setSelectedScene] = useState<string>('');

  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['scenes-for-animatics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, location')
        .order('scene_number');
      
      if (error) throw error;
      return data?.map(s => ({ ...s, title: s.location || `Scene ${s.scene_number}` })) || [];
    }
  });

  const { data: animatics, isLoading: animaticsLoading } = useQuery({
    queryKey: ['scene-animatics', selectedScene],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animatics')
        .select('*')
        .eq('scene_id', selectedScene)
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedScene
  });

  if (scenesLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scene Animatics</h1>
          <p className="text-muted-foreground">Upload and manage animatic sequences</p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Animatic
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Scene</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedScene} onValueChange={setSelectedScene}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a scene" />
            </SelectTrigger>
            <SelectContent>
              {scenes?.map((scene) => (
                <SelectItem key={scene.id} value={scene.id}>
                  Scene {scene.scene_number}: {scene.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedScene && (
        <Card>
          <CardHeader>
            <CardTitle>Animatics</CardTitle>
          </CardHeader>
          <CardContent>
            {animaticsLoading ? (
              <Skeleton className="h-48" />
            ) : animatics && animatics.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {animatics.map((animatic) => (
                  <Card key={animatic.id}>
                    <CardContent className="pt-4">
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-2">
                        <Play className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium">{animatic.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {animatic.duration_seconds}s
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No animatics for this scene</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
