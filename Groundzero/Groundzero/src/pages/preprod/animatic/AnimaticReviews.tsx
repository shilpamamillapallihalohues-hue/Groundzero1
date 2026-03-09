import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Film } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnimaticReviews() {
  const { data: animatics, isLoading } = useQuery({
    queryKey: ['animatic-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animatics')
        .select('*, scenes(scene_number, slugline)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-orange-500" />;
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold">Animatic Reviews</h1>
        <p className="text-muted-foreground">Director approval for animatic sequences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {animatics && animatics.length > 0 ? (
            <div className="space-y-4">
              {animatics.map((animatic) => (
                <div key={animatic.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(animatic.status || 'pending')}
                    <div>
                      <p className="font-medium">{animatic.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {animatic.duration_seconds || 0}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={animatic.status === 'approved' ? 'default' : 'secondary'}>
                      {animatic.status || 'pending'}
                    </Badge>
                    {animatic.status !== 'approved' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <XCircle className="h-4 w-4 mr-1" />
                          Request Changes
                        </Button>
                        <Button size="sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No animatics to review</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
