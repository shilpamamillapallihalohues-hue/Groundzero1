import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, CheckCircle, Clock, Loader2, 
  ArrowRight, User, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DepartmentDispatch, DEPARTMENTS, DISPATCH_STATUS_LABELS } from '@/types/pipeline';

interface DispatchQueueProps {
  projectId: string;
}

export function DispatchQueue({ projectId }: DispatchQueueProps) {
  const [dispatches, setDispatches] = useState<DepartmentDispatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  useEffect(() => {
    loadDispatches();
  }, [projectId]);

  const loadDispatches = async () => {
    setIsLoading(true);
    try {
      // Get all storyboards for this project
      const { data: scenes } = await supabase
        .from('scenes')
        .select('id')
        .eq('project_id', projectId);

      if (!scenes || scenes.length === 0) {
        setDispatches([]);
        setIsLoading(false);
        return;
      }

      const sceneIds = scenes.map(s => s.id);

      const { data: storyboards } = await supabase
        .from('storyboards')
        .select('id')
        .in('scene_id', sceneIds);

      if (!storyboards || storyboards.length === 0) {
        setDispatches([]);
        setIsLoading(false);
        return;
      }

      const storyboardIds = storyboards.map(s => s.id);

      const { data, error } = await supabase
        .from('department_dispatches')
        .select('*')
        .in('storyboard_id', storyboardIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDispatches(data as DepartmentDispatch[] || []);
    } catch (error) {
      console.error('Error loading dispatches:', error);
      toast.error('Failed to load dispatch queue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (dispatch: DepartmentDispatch) => {
    setIsApproving(dispatch.id);
    try {
      const { error } = await supabase
        .from('department_dispatches')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', dispatch.id);

      if (error) throw error;
      toast.success(`Dispatch to ${dispatch.department} approved`);
      loadDispatches();
    } catch (error) {
      toast.error('Failed to approve dispatch');
    } finally {
      setIsApproving(null);
    }
  };

  const handleDispatch = async (dispatch: DepartmentDispatch) => {
    setIsApproving(dispatch.id);
    try {
      const { error } = await supabase
        .from('department_dispatches')
        .update({
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
        })
        .eq('id', dispatch.id);

      if (error) throw error;
      toast.success(`Dispatched to ${dispatch.department} department`);
      loadDispatches();
    } catch (error) {
      toast.error('Failed to dispatch');
    } finally {
      setIsApproving(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'queued': return 'bg-blue-500/20 text-blue-400';
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'dispatched': return 'bg-purple-500/20 text-purple-400';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'blocked': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDeptColor = (deptId: string) => {
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    return dept?.color || 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group by status
  const pendingDispatches = dispatches.filter(d => d.status === 'pending' || d.status === 'queued');
  const approvedDispatches = dispatches.filter(d => d.status === 'approved');
  const activeDispatches = dispatches.filter(d => d.status === 'dispatched' || d.status === 'in_progress');
  const completedDispatches = dispatches.filter(d => d.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-400">{pendingDispatches.length}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-400">{approvedDispatches.length}</p>
              <p className="text-xs text-muted-foreground">Ready to Send</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Send className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-purple-400">{activeDispatches.length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{completedDispatches.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approval Section */}
      {pendingDispatches.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Awaiting Approval
          </h3>
          <div className="space-y-3">
            {pendingDispatches.map(dispatch => (
              <Card key={dispatch.id} className="border-border/50 bg-card/50 backdrop-blur border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getDeptColor(dispatch.department)}`}>
                            {dispatch.department.toUpperCase()}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">
                            Shot {dispatch.storyboard_id.slice(0, 8)}...
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dispatch.assets_included?.length || 0} assets • 
                          {dispatch.visual_references?.length || 0} references
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(dispatch.status)}>
                        {DISPATCH_STATUS_LABELS[dispatch.status as keyof typeof DISPATCH_STATUS_LABELS]}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(dispatch)}
                        disabled={isApproving === dispatch.id}
                      >
                        {isApproving === dispatch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved - Ready to Dispatch */}
      {approvedDispatches.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Ready to Dispatch
          </h3>
          <div className="space-y-3">
            {approvedDispatches.map(dispatch => (
              <Card key={dispatch.id} className="border-border/50 bg-card/50 backdrop-blur border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getDeptColor(dispatch.department)}`}>
                          {dispatch.department.toUpperCase()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Approved
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        Approved {dispatch.approved_at ? new Date(dispatch.approved_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDispatch(dispatch)}
                      disabled={isApproving === dispatch.id}
                      className="gap-2"
                    >
                      {isApproving === dispatch.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Dispatch
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {dispatches.length === 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No dispatches in queue. Calculate shot readiness first to generate dispatch requests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
