import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, CheckCircle2, XCircle, Clock, Palette, 
  Package, Filter, Image 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function DirectorReviewHistory() {
  const { user } = useAuth();
  const { selectedProjectId } = useProjectContext();
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  // Concept art review history
  const { data: conceptReviews, isLoading: conceptsLoading } = useQuery({
    queryKey: ['director-concept-review-history', user?.id, selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('concept_arts')
        .select('id, title, concept_type, image_url, is_approved, director_approved, review_status, director_approved_at, updated_at')
        .or('director_approved.eq.true,director_approved.eq.false')
        .not('director_approved', 'is', null);
      
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Asset approval history
  const { data: assetReviews, isLoading: assetsLoading } = useQuery({
    queryKey: ['director-asset-review-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('*, production_assets (id, name, category)')
        .eq('approved_by', user?.id)
        .order('approved_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const getStatusIcon = (status: string | boolean) => {
    if (status === 'approved' || status === true) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (status === 'rejected' || status === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const filteredConcepts = conceptReviews?.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'approved') return c.director_approved === true;
    if (filter === 'rejected') return c.director_approved === false;
    return true;
  });

  const isLoading = conceptsLoading || assetsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalReviews = (conceptReviews?.length || 0) + (assetReviews?.length || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          Review History
        </h1>
        <p className="text-muted-foreground">
          Your past approvals and reviews ({totalReviews} total)
        </p>
      </div>

      <Tabs defaultValue="concepts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="concepts" className="gap-2">
            <Palette className="h-4 w-4" />
            Concept Art ({conceptReviews?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            Assets ({assetReviews?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {(['all', 'approved', 'rejected'] as const).map(f => (
                <Badge 
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {filteredConcepts && filteredConcepts.length > 0 ? (
            <div className="space-y-3">
              {filteredConcepts.map((concept) => (
                <Card key={concept.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {concept.image_url ? (
                        <img 
                          src={concept.image_url} 
                          alt={concept.title}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(concept.director_approved)}
                          <p className="font-medium truncate">{concept.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          {concept.concept_type?.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={concept.director_approved ? 'default' : 'destructive'}>
                          {concept.director_approved ? 'Approved' : 'Rejected'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {concept.director_approved_at 
                            ? format(new Date(concept.director_approved_at), 'PPp')
                            : format(new Date(concept.updated_at), 'PPp')
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No concept reviews yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your concept art review history will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          {assetReviews && assetReviews.length > 0 ? (
            <div className="space-y-3">
              {assetReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(review.status)}
                        <div>
                          <p className="font-medium">
                            {review.production_assets?.name || 'Unknown Asset'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {review.production_assets?.category || 'Unknown Type'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={review.status === 'approved' ? 'default' : 'destructive'}>
                          {review.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {review.approved_at 
                            ? format(new Date(review.approved_at), 'PPp') 
                            : 'Pending'
                          }
                        </p>
                      </div>
                    </div>
                    {review.comments && (
                      <p className="text-sm text-muted-foreground mt-2 pl-8 italic">
                        "{review.comments}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No asset reviews yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your asset approval history will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
