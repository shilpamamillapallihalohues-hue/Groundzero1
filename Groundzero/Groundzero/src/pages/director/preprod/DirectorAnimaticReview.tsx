import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Film, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function DirectorAnimaticReview() {
  const { data: animatics, isLoading } = useQuery({
    queryKey: ['director-animatic-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animatics')
        .select('*, scenes(scene_number, slugline)')
        .neq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
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
    <div className="space-y-4 p-4">

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews ({animatics?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {animatics && animatics.length > 0 ? (
            <div className="space-y-4">
              {animatics.map((animatic) => (
                <div key={animatic.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-20 bg-muted rounded flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{animatic.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {animatic.duration_seconds}s
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {animatic.status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <XCircle className="h-4 w-4 mr-1" />
                      Request Changes
                    </Button>
                    <Button>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No animatics pending review</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
