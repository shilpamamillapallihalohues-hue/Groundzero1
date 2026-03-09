import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Box, Users, Plus, CheckCircle, Clock, Search, Filter, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssetTaskAssignmentProps {
  departmentId?: string;
  departmentName?: string;
}

export function AssetTaskAssignment({ departmentId, departmentName }: AssetTaskAssignmentProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<string>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Fetch unassigned production assets
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['unassigned-production-assets', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('production_assets')
        .select(`
          id, name, category, description, thumbnail_url, status, project_id,
          projects(id, title)
        `)
        .in('category', ['character', 'prop', 'vehicle', 'environment'] as any)
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter as any);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch existing task assignments for these assets
  const { data: existingTasks } = useQuery({
    queryKey: ['asset-task-assignments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, project_id, status, description')
        .eq('department', departmentName || 'Modeling');
      return data || [];
    },
  });

  // Fetch artists in the department
  const { data: artists, isLoading: artistsLoading } = useQuery({
    queryKey: ['department-artists-for-assignment', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, specific_role')
        .eq('role', 'artist');

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Fetch work employees for linking
  const { data: workEmployees } = useQuery({
    queryKey: ['work-employees-for-assignment', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('work_employees')
        .select('id, name, profile_id, department_id');

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Create task assignment mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: {
      assetId: string;
      assetName: string;
      artistId: string;
      projectId: string;
      title: string;
      description: string;
      priority: string;
      dueDate: string;
    }) => {
      // Create in tasks table
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: taskData.projectId,
          title: taskData.title || `Model: ${taskData.assetName}`,
          description: taskData.description || `Create 3D model for ${taskData.assetName}`,
          department: departmentName || 'Modeling',
          assigned_to: taskData.artistId,
          status: 'pending',
          priority: taskData.priority,
          due_date: taskData.dueDate || null,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Also create in work_tasks if work_employee exists for this profile
      const workEmployee = workEmployees?.find(e => e.profile_id === taskData.artistId);
      if (workEmployee) {
        await supabase
          .from('work_tasks')
          .insert({
            title: taskData.title || `Model: ${taskData.assetName}`,
            description: taskData.description || `Create 3D model for ${taskData.assetName}`,
            employee_id: workEmployee.id,
            assigned_by: profile?.id,
            project_id: taskData.projectId,
            status: 'pending',
            priority: taskData.priority,
            due_date: taskData.dueDate || null,
          });
      }

      // Update asset_department_status if exists
      await supabase
        .from('asset_department_status')
        .update({
          assigned_artist_id: taskData.artistId,
          assigned_at: new Date().toISOString(),
          workflow_status: 'not_started',
        })
        .eq('asset_id', taskData.assetId);

      return task;
    },
    onSuccess: () => {
      toast.success('Task assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['unassigned-production-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      setAssignDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error assigning task:', error);
      toast.error('Failed to assign task');
    },
  });

  const resetForm = () => {
    setSelectedAsset(null);
    setSelectedArtist('');
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('medium');
    setTaskDueDate('');
  };

  const openAssignDialog = (asset: any) => {
    setSelectedAsset(asset);
    setTaskTitle(`Model: ${asset.name}`);
    setTaskDescription(`Create 3D model for ${asset.name}. ${asset.description || ''}`);
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedAsset || !selectedArtist) {
      toast.error('Please select an artist');
      return;
    }

    createTaskMutation.mutate({
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      artistId: selectedArtist,
      projectId: selectedAsset.project_id,
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      dueDate: taskDueDate,
    });
  };

  // Filter assets by search
  const filteredAssets = assets?.filter(asset => {
    if (!searchQuery) return true;
    return asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           asset.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get assigned artist for an asset from tasks
  const getAssignedArtist = (assetId: string, assetName: string) => {
    const task = existingTasks?.find(t => 
      t.title?.includes(assetName) || t.description?.includes(assetName)
    );
    if (task?.assigned_to) {
      return artists?.find(a => a.id === task.assigned_to);
    }
    return null;
  };

  if (assetsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Assets to Artists
            </CardTitle>
            <Badge variant="secondary">{filteredAssets?.length || 0} assets</Badge>
          </div>
          
          {/* Search and Filter */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="character">Characters</SelectItem>
                <SelectItem value="prop">Props</SelectItem>
                <SelectItem value="vehicle">Vehicles</SelectItem>
                <SelectItem value="environment">Environments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {filteredAssets && filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => {
                  const assignedArtist = getAssignedArtist(asset.id, asset.name);
                  
                  return (
                    <div 
                      key={asset.id} 
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {/* Thumbnail */}
                      {asset.thumbnail_url ? (
                        <img 
                          src={asset.thumbnail_url} 
                          alt={asset.name} 
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Box className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Asset Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{asset.name}</h4>
                          <Badge variant="outline" className="capitalize">{asset.category}</Badge>
                        </div>
                        {asset.projects && (
                          <p className="text-sm text-muted-foreground">
                            Project: {(asset.projects as any).title}
                          </p>
                        )}
                        {asset.description && (
                          <p className="text-sm text-muted-foreground truncate">{asset.description}</p>
                        )}
                      </div>

                      {/* Assignment Status / Action */}
                      {assignedArtist ? (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Assigned to</span>
                          <Badge variant="secondary">{assignedArtist.full_name}</Badge>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => openAssignDialog(asset)}
                          className="gap-1"
                        >
                          <UserPlus className="h-4 w-4" />
                          Assign
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No assets found</p>
                  <p className="text-sm">Production assets will appear here for assignment</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task to Artist</DialogTitle>
            <DialogDescription>
              Create a modeling task for {selectedAsset?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Asset Preview */}
            {selectedAsset && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedAsset.thumbnail_url ? (
                  <img 
                    src={selectedAsset.thumbnail_url} 
                    alt={selectedAsset.name} 
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                    <Box className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedAsset.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedAsset.category}</p>
                </div>
              </div>
            )}

            {/* Artist Selection */}
            <div className="space-y-2">
              <Label>Assign to Artist *</Label>
              <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an artist" />
                </SelectTrigger>
                <SelectContent>
                  {artists?.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {artist.full_name}
                        {artist.specific_role && (
                          <span className="text-xs text-muted-foreground">
                            ({artist.specific_role})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task Title */}
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input 
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description..."
                rows={3}
              />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedArtist || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Assign Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
