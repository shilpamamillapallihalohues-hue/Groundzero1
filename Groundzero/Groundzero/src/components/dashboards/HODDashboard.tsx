import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CheckCircle, 
  Clock,
  Layers,
  AlertCircle,
  RefreshCw,
  Eye,
  BarChart3,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionNav } from '@/hooks/usePermissionNav';
import { usePipelineRouting } from '@/hooks/usePipelineRouting';
import { DepartmentAssetList } from '@/components/pipeline/DepartmentAssetList';
import { AssetTaskAssignment } from '@/components/pipeline/AssetTaskAssignment';

export function HODDashboard() {
  const { navigateTo, canAccess } = usePermissionNav();
  const { profile } = useAuth();
  const { departmentAssets, isLoadingDeptAssets } = usePipelineRouting();

  // Get department name
  const { data: department } = useQuery({
    queryKey: ['my-department', profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return null;
      const { data } = await supabase
        .from('departments')
        .select('name, color')
        .eq('id', profile.department_id)
        .single();
      return data;
    },
    enabled: !!profile?.department_id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['hod-team', profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('department_id', profile.department_id);
      return data || [];
    },
    enabled: !!profile?.department_id,
  });

  const { data: artistPerformance } = useQuery({
    queryKey: ['artist-performance', profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return [];
      
      const { data: employees } = await supabase
        .from('work_employees')
        .select(`
          id,
          profiles:profile_id (full_name),
          work_tasks (status)
        `)
        .eq('department_id', profile.department_id);
      
      return employees?.map((emp: any) => ({
        id: emp.id,
        name: emp.profiles?.full_name || 'Unknown',
        completed: emp.work_tasks?.filter((t: any) => t.status === 'completed').length || 0,
        total: emp.work_tasks?.length || 0
      })) || [];
    },
    enabled: !!profile?.department_id,
  });

  // Calculate stats from departmentAssets
  const stats = {
    pendingInternalReview: departmentAssets?.filter(a => a.workflow_status === 'internal_review').length || 0,
    inProgress: departmentAssets?.filter(a => a.workflow_status === 'in_progress').length || 0,
    changesRequested: departmentAssets?.filter(a => a.workflow_status === 'changes_requested').length || 0,
    awaitingAssignment: departmentAssets?.filter(a => !a.assigned_artist_id && a.workflow_status === 'not_started').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            {department?.name || 'Department'} Dashboard
          </h1>
          <p className="text-muted-foreground">Department oversight and internal approvals</p>
        </div>
        {canAccess('/team') && (
          <Button onClick={() => navigateTo('/team')}>
            <Users className="h-4 w-4 mr-2" />
            View Team
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Internal Reviews</p>
                <p className="text-2xl font-bold">{stats.pendingInternalReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Layers className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assets In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.changesRequested > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <RefreshCw className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rework Requested</p>
                <p className="text-2xl font-bold">{stats.changesRequested}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.awaitingAssignment > 0 ? 'border-amber-500/30' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Assignment</p>
                <p className="text-2xl font-bold">{stats.awaitingAssignment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Work Tabs */}
      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="assets" className="gap-2">
            <Layers className="h-4 w-4" />
            Assets & Reviews
          </TabsTrigger>
          <TabsTrigger value="assign" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Work
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assets" className="mt-4">
          <DepartmentAssetList
            departmentName={department?.name}
            showAssignment={true}
            showInternalApproval={true}
          />
        </TabsContent>
        
        <TabsContent value="assign" className="mt-4">
          <AssetTaskAssignment 
            departmentId={profile?.department_id || undefined}
            departmentName={department?.name || 'Modeling'}
          />
        </TabsContent>
      </Tabs>

      {/* Artist Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Artist Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {artistPerformance?.map((artist: any) => (
              <div key={artist.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                    {artist.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{artist.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {artist.completed}/{artist.total} tasks completed
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {artist.total > 0 ? Math.round((artist.completed / artist.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            ))}
            {(!artistPerformance || artistPerformance.length === 0) && (
              <p className="text-center text-muted-foreground py-4">No artists in your department</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Your Team ({teamMembers?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teamMembers?.map((member: any) => (
              <div key={member.id} className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2 text-lg font-semibold">
                  {member.full_name?.[0] || '?'}
                </div>
                <p className="font-medium truncate">{member.full_name}</p>
                <p className="text-sm text-muted-foreground capitalize">{member.role?.replace('_', ' ')}</p>
              </div>
            ))}
            {(!teamMembers || teamMembers.length === 0) && (
              <p className="col-span-4 text-center text-muted-foreground py-4">No team members in your department</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Approval Workflow</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Badge variant="outline">Artist Work</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30">Your Review</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline">Director Review</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline">Next Department</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restrictions Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">HOD / Lead Focus</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Internal approvals only (not final)</li>
                <li>• Cannot assign vendors</li>
                <li>• Validate readiness for Director review</li>
                <li>• Cannot bypass department routing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
