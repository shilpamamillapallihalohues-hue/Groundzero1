import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, FileText, Copy, CheckCircle, Clock, ExternalLink
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

export default function SupervisorVersions() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();

  // Fetch only assigned projects based on role
  const { data: projects, isLoading: projectsLoading } = useAssignedProjects();

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch versions
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['supervisor-versions-list', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('script_versions')
        .select('id, version_number, title, created_at, content')
        .eq('project_id', activeProjectId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  // Duplicate version mutation
  const duplicateMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const version = versions?.find((v: any) => v.id === versionId);
      if (!version) throw new Error('Version not found');

      const nextVersionNumber = ((versions as any)?.[0]?.version_number || 0) + 1;

      const { error } = await supabase
        .from('script_versions')
        .insert({
          project_id: activeProjectId,
          version_number: nextVersionNumber,
          title: `${version.title} (Copy)`,
          content: version.content,
        });

      if (error) throw error;
      return nextVersionNumber;
    },
    onSuccess: (newVersion) => {
      toast.success(`Version v${newVersion} created`);
      queryClient.invalidateQueries({ queryKey: ['supervisor-versions-list'] });
    },
    onError: () => toast.error('Failed to duplicate version'),
  });

  const isLoading = projectsLoading || versionsLoading;

  if (isLoading && !versions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-7 w-7 text-primary" />
              Script Versions
            </h1>
            <p className="text-muted-foreground">Manage script versions and history</p>
          </div>

          <Select value={activeProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Version List */}
        {versions && versions.length > 0 ? (
          <div className="space-y-3">
            {versions.map((version, index) => (
              <Card 
                key={version.id} 
                className={index === 0 ? 'border-primary/50 bg-primary/5' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">v{version.version_number}</span>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          {index > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {version.title || `Version ${version.version_number}`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => duplicateMutation.mutate(version.id)}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                      {index !== 0 && (
                        <Button variant="default" size="sm">
                          Switch to Active
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Script Versions</h3>
              <p className="text-muted-foreground">
                Upload a script to create the first version.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Note about no delete */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 flex items-center gap-3">
            <History className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Script versions cannot be deleted to maintain version history and traceability.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
