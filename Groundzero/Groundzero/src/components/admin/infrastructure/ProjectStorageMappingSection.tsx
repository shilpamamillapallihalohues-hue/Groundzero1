import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FolderTree, Loader2, AlertTriangle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string;
}

interface StorageConfig {
  id: string;
  storage_name: string;
  storage_type: string;
  is_active: boolean;
}

interface ProjectMapping {
  id: string;
  project_id: string;
  storage_id: string;
  folder_path: string;
  projects?: { title: string; status: string };
  storage_configurations?: { storage_name: string; storage_type: string };
}

export function ProjectStorageMappingSection() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; projectId: string; projectName: string } | null>(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status')
        .order('title');
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: storages } = useQuery({
    queryKey: ['active-storages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_configurations')
        .select('id, storage_name, storage_type, is_active')
        .eq('is_active', true)
        .order('storage_name');
      if (error) throw error;
      return data as StorageConfig[];
    },
  });

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['project-storage-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_storage_mappings')
        .select(`
          id,
          project_id,
          storage_id,
          folder_path,
          projects (title, status),
          storage_configurations (storage_name, storage_type)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProjectMapping[];
    },
  });

  const createMappingMutation = useMutation({
    mutationFn: async ({ projectId, storageId }: { projectId: string; storageId: string }) => {
      const project = projects?.find(p => p.id === projectId) as Project | undefined;
      const folderPath = `/${project?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'project'}`;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from('project_storage_mappings').insert({
        project_id: projectId,
        storage_id: storageId,
        folder_path: folderPath,
        created_by: profile?.id,
      });
      if (error) throw error;

      await supabase.from('infrastructure_logs').insert({
        log_type: 'storage',
        severity: 'info',
        message: `Project "${project?.title}" mapped to storage`,
        details: { project_id: projectId, storage_id: storageId },
        performed_by: profile?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-storage-mappings'] });
      toast.success('Project mapped to storage');
      setSelectedProject('');
      setSelectedStorage('');
    },
    onError: (error) => {
      toast.error('Failed to map project: ' + error.message);
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: async ({ projectId, storageId }: { projectId: string; storageId: string }) => {
      const { error } = await supabase
        .from('project_storage_mappings')
        .update({ storage_id: storageId })
        .eq('project_id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-storage-mappings'] });
      toast.success('Storage mapping updated');
      setConfirmDialog(null);
    },
  });

  const unmappedProjects = projects?.filter(
    p => !mappings?.some(m => m.project_id === p.id)
  );

  const folderStructure = [
    'preproduction',
    'production',
    'renders',
    'cache',
    'delivery',
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project → Storage Mapping</CardTitle>
          <CardDescription>
            Assign storage locations to projects. Each project can map to only ONE primary storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Mapping */}
          {unmappedProjects && unmappedProjects.length > 0 && storages && storages.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-4">Map New Project</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {unmappedProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStorage} onValueChange={setSelectedStorage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Storage" />
                    </SelectTrigger>
                    <SelectContent>
                      {storages.map(storage => (
                        <SelectItem key={storage.id} value={storage.id}>
                          {storage.storage_name} ({storage.storage_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => createMappingMutation.mutate({
                      projectId: selectedProject,
                      storageId: selectedStorage,
                    })}
                    disabled={!selectedProject || !selectedStorage || createMappingMutation.isPending}
                  >
                    {createMappingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Map Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Default Folder Structure Preview */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">Default Folder Structure (Auto-Created)</h4>
              <div className="font-mono text-sm bg-background p-4 rounded-lg">
                <div className="text-muted-foreground">/Project_Name</div>
                {folderStructure.map(folder => (
                  <div key={folder} className="ml-4 flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    <span>{folder}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Existing Mappings */}
          <div>
            <h4 className="font-medium mb-4">Current Mappings</h4>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : mappings?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects mapped yet.
              </div>
            ) : (
              <div className="space-y-3">
                {mappings?.map(mapping => (
                  <Card key={mapping.id} className="bg-background">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <FolderTree className="h-5 w-5 text-primary" />
                          <div>
                            <div className="flex items-center gap-2">
                            <h5 className="font-medium">{mapping.projects?.title}</h5>
                              <Badge variant="outline">{mapping.projects?.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Storage: {mapping.storage_configurations?.storage_name} • 
                              Path: {mapping.folder_path}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDialog({
                            open: true,
                            projectId: mapping.project_id,
                            projectName: mapping.projects?.title || '',
                          })}
                        >
                          Change Storage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Change Storage Mapping
            </DialogTitle>
            <DialogDescription>
              Changing storage for "{confirmDialog?.projectName}" requires admin confirmation.
              This may affect file accessibility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={setSelectedStorage}>
              <SelectTrigger>
                <SelectValue placeholder="Select New Storage" />
              </SelectTrigger>
              <SelectContent>
                {storages?.map(storage => (
                  <SelectItem key={storage.id} value={storage.id}>
                    {storage.storage_name} ({storage.storage_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmDialog && updateMappingMutation.mutate({
                projectId: confirmDialog.projectId,
                storageId: selectedStorage,
              })}
              disabled={!selectedStorage || updateMappingMutation.isPending}
            >
              {updateMappingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
