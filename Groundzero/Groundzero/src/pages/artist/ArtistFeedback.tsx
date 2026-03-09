import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ArtistFeedback() {
  const { user } = useAuth();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['artist-feedback', user?.id],
    queryFn: async () => {
      // Get assets assigned to this artist
      const { data: assignedAssets } = await supabase
        .from('asset_department_status')
        .select('asset_id')
        .eq('assigned_artist_id', user?.id);
      
      if (!assignedAssets || assignedAssets.length === 0) return [];
      
      const assetIds = assignedAssets.map(a => a.asset_id);
      
      // Get comments on those assets
      const { data, error } = await supabase
        .from('asset_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .in('asset_id', assetIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground">Comments and feedback on your work ({feedback?.length || 0} total)</p>
        </div>

        {feedback && feedback.length > 0 ? (
          <div className="space-y-4">
            {feedback.map((comment) => (
              <Card key={comment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        {comment.profiles?.avatar_url ? (
                          <img 
                            src={comment.profiles.avatar_url} 
                            alt="Avatar"
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {comment.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{comment.comment_type || 'general'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{comment.comment_text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No feedback yet</h3>
              <p className="text-sm text-muted-foreground">
                You haven't received any feedback on your work yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
