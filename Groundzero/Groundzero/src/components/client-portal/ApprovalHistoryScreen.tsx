import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useClientReview } from '@/hooks/useClientReview';
import { 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalHistoryScreenProps {
  projectId: string;
}

export function ApprovalHistoryScreen({ projectId }: ApprovalHistoryScreenProps) {
  const { approvals, isLoading } = useClientReview(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'changes_required':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'changes_required':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Changes Required</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Group approvals by date
  const groupedApprovals = approvals?.reduce((acc, approval) => {
    const date = format(new Date(approval.reviewed_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(approval);
    return acc;
  }, {} as Record<string, typeof approvals>) || {};

  const sortedDates = Object.keys(groupedApprovals).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Stats
  const stats = {
    total: approvals?.length || 0,
    approved: approvals?.filter(a => a.decision === 'approved').length || 0,
    changesRequired: approvals?.filter(a => a.decision === 'changes_required').length || 0,
    rejected: approvals?.filter(a => a.decision === 'rejected').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Changes Requested</p>
                <p className="text-2xl font-bold">{stats.changesRequired}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length > 0 ? (
            <div className="space-y-8">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-medium text-muted-foreground px-2">
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  
                  <div className="space-y-4">
                    {groupedApprovals[date]?.map((approval) => (
                      <div 
                        key={approval.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="mt-1">
                          {getDecisionIcon(approval.decision)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getDecisionBadge(approval.decision)}
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(approval.reviewed_at), 'HH:mm')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {(approval as any).profiles?.full_name || 'Unknown Reviewer'}
                            </span>
                          </div>
                          
                          {approval.notes && (
                            <p className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                              {approval.notes}
                            </p>
                          )}
                          
                          <div className="mt-2 flex flex-wrap gap-2">
                            {approval.scene_id && (
                              <Badge variant="outline">Scene</Badge>
                            )}
                            {approval.shot_id && (
                              <Badge variant="outline">Shot</Badge>
                            )}
                            {approval.asset_id && (
                              <Badge variant="outline">Asset</Badge>
                            )}
                            {approval.version_id && (
                              <Badge variant="secondary">Versioned</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No approval history yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
