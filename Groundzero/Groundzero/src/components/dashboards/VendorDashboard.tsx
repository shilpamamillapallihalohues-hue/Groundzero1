import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Clock, 
  CheckCircle,
  Upload,
  AlertTriangle,
  FileText,
  Calendar,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function VendorDashboard() {
  const { profile } = useAuth();

  const { data: vendorTasks } = useQuery({
    queryKey: ['vendor-tasks', profile?.id],
    queryFn: async (): Promise<any[]> => {
      if (!profile?.id) return [];
      
      const { data: employee } = await supabase
        .from('work_employees')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (!employee) return [];
      
      const { data } = await supabase
        .from('work_tasks')
        .select('id, title, description, status, priority, due_date, created_at')
        .eq('employee_id', employee.id);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const taskStats = {
    total: vendorTasks?.length || 0,
    inProgress: vendorTasks?.filter(t => t.status === 'in_progress').length || 0,
    completed: vendorTasks?.filter(t => t.status === 'completed').length || 0,
    pending: vendorTasks?.filter(t => t.status === 'pending').length || 0,
  };

  // Calculate SLA countdown for overdue items
  const overdueTasks = vendorTasks?.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  ) || [];

  const pendingReviewTasks = vendorTasks?.filter(t => t.status === 'under_review') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Vendor Portal
          </h1>
          <p className="text-muted-foreground">Your contracted work and deliverables</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned Assets</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{taskStats.inProgress}</p>
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
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{taskStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Eye className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{pendingReviewTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Warning */}
      {overdueTasks.length > 0 ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">SLA Violation Warning</p>
                <p className="text-sm text-muted-foreground">
                  {overdueTasks.length} deliverable{overdueTasks.length > 1 ? 's are' : ' is'} past the deadline. Please submit immediately to avoid penalties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="font-medium">SLA Status: On Track</p>
                <p className="text-sm text-muted-foreground">
                  All deliverables are within agreed timeframes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SLA Countdown for pending tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Countdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendorTasks && vendorTasks.filter(t => t.due_date && t.status !== 'completed').length > 0 ? (
            <div className="space-y-3">
              {vendorTasks
                .filter(t => t.due_date && t.status !== 'completed')
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .slice(0, 5)
                .map((task) => {
                  const dueDate = new Date(task.due_date);
                  const now = new Date();
                  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysLeft < 0;
                  
                  return (
                    <div key={task.id} className={`flex items-center justify-between p-3 border rounded-lg ${isOverdue ? 'border-destructive/50 bg-destructive/5' : daysLeft <= 2 ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {dueDate.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={isOverdue ? 'destructive' : daysLeft <= 2 ? 'secondary' : 'outline'}>
                        {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No pending deliverables</p>
          )}
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card>
        <CardHeader>
          <CardTitle>Your Deliverables</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorTasks && vendorTasks.length > 0 ? (
            <div className="space-y-4">
              {vendorTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                return (
                  <div key={task.id} className={`p-4 border rounded-lg ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{task.title}</h4>
                      <Badge variant={
                        task.status === 'completed' ? 'default' :
                        isOverdue ? 'destructive' :
                        task.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {isOverdue ? 'Overdue' : task.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Deliverable
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No active contracts</p>
              <p className="text-sm">Work will appear here when assigned to you.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restrictions Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Vendor Access</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• No internal comments access</li>
                <li>• No project-wide visibility</li>
                <li>• Cannot approve any work</li>
                <li>• Cannot see other vendors' work</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
