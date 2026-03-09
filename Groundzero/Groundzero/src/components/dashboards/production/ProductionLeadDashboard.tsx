import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, AlertCircle, Clock, BarChart3, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export function ProductionLeadDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['prod-lead-approvals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('approvals')
        .select('*, production_assets(name, asset_type, projects(title)), profiles(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const { data: teamTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['prod-lead-team-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, profiles(full_name), projects(title)')
        .in('status', ['pending', 'in_progress', 'review'])
        .order('due_date')
        .limit(20);
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['prod-lead-stats'],
    queryFn: async () => {
      const { count: pendingTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: inProgress } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');
        
      const { count: inReview } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'review');

      const { count: pendingApprovalCount } = await supabase
        .from('approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return { 
        pendingTasks: pendingTasks || 0, 
        inProgress: inProgress || 0, 
        inReview: inReview || 0,
        pendingApprovals: pendingApprovalCount || 0
      };
    }
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['prod-lead-team'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, specific_role, avatar_url')
        .eq('phase', 'Production')
        .limit(20);
      return data || [];
    }
  });

  const handleApprove = async (approvalId: string) => {
    const { error } = await supabase
      .from('approvals')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', approvalId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    } else {
      toast({ title: 'Approved', description: 'Asset approved successfully' });
    }
  };

  const handleReject = async (approvalId: string) => {
    const { error } = await supabase
      .from('approvals')
      .update({ status: 'rejected' })
      .eq('id', approvalId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
    } else {
      toast({ title: 'Rejected', description: 'Asset sent back for revision' });
    }
  };

  if (approvalsLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Production Lead Dashboard</h1>
        <p className="text-muted-foreground">Manage team, review work, and approve deliverables</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pendingTasks || 0}</p>
                <p className="text-muted-foreground">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                <p className="text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.inReview || 0}</p>
                <p className="text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pendingApprovals || 0}</p>
                <p className="text-muted-foreground">Awaiting Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {pendingApprovals && pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval: any) => (
                <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{approval.production_assets?.name}</span>
                    <span className="text-muted-foreground text-sm block">
                      {approval.production_assets?.asset_type} - {approval.production_assets?.projects?.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Submitted by: {approval.profiles?.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleApprove(approval.id)}>
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(approval.id)}>
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No pending approvals.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Team Tasks Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {teamTasks && teamTasks.length > 0 ? (
              teamTasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{task.title}</span>
                    <span className="text-muted-foreground text-sm block">
                      Assigned to: {task.profiles?.full_name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      task.status === 'review' ? 'default' :
                      task.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No team tasks found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Production Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map((member: any) => (
                <div key={member.id} className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 mx-auto mb-2 flex items-center justify-center">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium">
                        {member.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.specific_role || member.role}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground col-span-4 text-center py-4">No team members found.</p>
            )}
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/team')}>
            Manage Team
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
