// MainLayout is provided by App.tsx router - do not import here
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { ScreenplayWorkspace } from '@/components/screenplay/ScreenplayWorkspace';

export default function DirectorScript() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
 
  // Fetch projects for director
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['director-assigned-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; title: string }[] || [];
    },
  });

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3 px-1 py-1.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Free Flow</h1>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Screenplay Editor</span>
        </div>

        <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[180px] h-7 text-xs">
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

      {/* Screenplay Workspace */}
      {activeProjectId ? (
        <div className="flex-1 min-h-0">
          <ScreenplayWorkspace
            projectId={activeProjectId}
            isDirectorView={true}
            canApprove={true}
            canLock={true}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
          Select a project to review the screenplay
        </div>
      )}
    </div>
  );
}
