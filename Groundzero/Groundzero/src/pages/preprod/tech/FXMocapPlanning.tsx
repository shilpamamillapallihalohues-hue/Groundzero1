import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, User, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function FXMocapPlanning() {
  const { data: scenes, isLoading } = useQuery({
    queryKey: ['scenes-fx-planning'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, location, vfx_required')
        .order('scene_number');
      
      if (error) throw error;
      return data?.map(s => ({ ...s, title: s.location || `Scene ${s.scene_number}`, vfx_complexity: s.vfx_required ? 'high' : 'none' })) || [];
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
          <h1 className="text-2xl font-bold">FX & Mocap Planning</h1>
          <p className="text-muted-foreground">Plan visual effects and motion capture requirements</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Requirement
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              VFX Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scenes && scenes.length > 0 ? (
              <div className="space-y-3">
                {scenes.map((scene) => (
                  <div key={scene.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Scene {scene.scene_number}</p>
                      <p className="text-sm text-muted-foreground">{scene.title}</p>
                    </div>
                    <Badge variant={scene.vfx_complexity === 'high' ? 'destructive' : 'secondary'}>
                      {scene.vfx_complexity || 'none'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No scenes found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Motion Capture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No mocap requirements defined</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Mocap Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
