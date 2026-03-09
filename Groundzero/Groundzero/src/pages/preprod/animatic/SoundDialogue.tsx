import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Upload, Music } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function SoundDialogue() {
  const [selectedScene, setSelectedScene] = useState<string>('');

  const { data: scenes, isLoading } = useQuery({
    queryKey: ['scenes-for-sound'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, location')
        .order('scene_number');
      
      if (error) throw error;
      return data?.map(s => ({ ...s, title: s.location || `Scene ${s.scene_number}` })) || [];
    }
  });

  if (isLoading) {
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
          <h1 className="text-2xl font-bold">Sound & Dialogue</h1>
          <p className="text-muted-foreground">Manage temp audio for previz</p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Audio
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
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Dialogue Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Volume2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No dialogue tracks uploaded</p>
                <Button variant="outline" className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Dialogue
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Temp Music & SFX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No temp audio uploaded</p>
                <Button variant="outline" className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Audio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
