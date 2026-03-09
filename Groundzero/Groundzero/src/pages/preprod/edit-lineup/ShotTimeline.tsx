import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Film, GripVertical, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function ShotTimeline() {
  const { data: storyboards } = useQuery({
    queryKey: ['shots-for-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, action')
        .order('shot_number');
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Film className="h-8 w-8 text-green-500" />
            Shot Order Timeline
          </h1>
          <Button><Play className="h-4 w-4 mr-2" />Preview</Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Shot Sequence (Drag to Reorder)</CardTitle></CardHeader>
          <CardContent>
            {storyboards && storyboards.length > 0 ? (
              <div className="space-y-2">
                {storyboards.map((shot) => (
                  <div key={shot.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-grab">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm">SH_{shot.shot_number}</p>
                    <p className="text-xs text-muted-foreground flex-1 truncate">{shot.action || 'No description'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No shots available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
