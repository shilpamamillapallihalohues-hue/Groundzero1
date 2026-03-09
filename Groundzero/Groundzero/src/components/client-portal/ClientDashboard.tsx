import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useClientReview } from '@/hooks/useClientReview';
import { 
  Film, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight,
  Eye,
  MessageSquare,
  History,
  GitCompare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function ClientDashboard() {
  const navigate = useNavigate();
  const { projects, isLoading } = useClientReview();
  const { profile } = useAuth();

  const { data: approvalHistory } = useQuery({
    queryKey: ['client-approval-history', profile?.id],
    queryFn: async (): Promise<any[]> => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('client_approvals')
        .select('id, decision, notes, reviewed_at, project_id')
        .eq('client_id', profile.id)
        .order('reviewed_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate real stats from approval gates
  const { data: pendingReviews } = useQuery({
    queryKey: ['client-pending-reviews', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('approval_gates')
        .select('id')
        .eq('status', 'pending')
        .eq('approval_type', 'client_final');
      return data?.length || 0;
    },
  });

  const totalPendingReviews = pendingReviews || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Eye className="h-8 w-8 text-primary" />
            Client Review Portal
          </h1>
          <p className="text-muted-foreground">Review and approve project deliverables</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Film className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projects in Review</p>
                <p className="text-2xl font-bold">{projects?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalPendingReviews > 0 ? 'border-amber-500/30' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{totalPendingReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <History className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approval History</p>
                <p className="text-2xl font-bold">{approvalHistory?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {approvalHistory?.filter(a => a.decision === 'approved').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List - Primary Content */}
      <Card>
        <CardHeader>
          <CardTitle>Your Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects && projects.length > 0 ? (
              projects.map((project: any) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {project.thumbnail_url ? (
                        <img
                          src={project.thumbnail_url}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Updated {format(new Date(project.updated_at), 'MMM d, yyyy')}
                      </p>
                      <Badge className="mt-1" variant="outline">{project.status}</Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/client/project/${project.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No projects assigned for review yet</p>
                <p className="text-sm">Projects will appear here when shared with you for approval.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Approval History */}
      {approvalHistory && approvalHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Approval History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvalHistory.slice(0, 5).map((approval: any) => (
                <div key={approval.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Badge variant={approval.decision === 'approved' ? 'default' : approval.decision === 'rejected' ? 'destructive' : 'secondary'}>
                      {approval.decision}
                    </Badge>
                    {approval.notes && (
                      <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">{approval.notes}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(approval.reviewed_at), 'MMM d, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restrictions Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Client Access</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• View approved-for-review assets only</li>
                <li>• No WIP (work in progress) access</li>
                <li>• No internal comments visibility</li>
                <li>• Cannot make assignments or uploads</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
