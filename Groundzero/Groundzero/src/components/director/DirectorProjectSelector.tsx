import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Film } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEffect } from 'react';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

interface DirectorProjectSelectorProps {
  className?: string;
}

export function DirectorProjectSelector({ className }: DirectorProjectSelectorProps) {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  
  const { data: projects, isLoading } = useAssignedProjects();

  const hasOnlyOneProject = projects?.length === 1;

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  if (isLoading) {
    return <Skeleton className="h-9 w-48" />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Film className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={selectedProjectId || ''} 
        onValueChange={setSelectedProjectId}
        disabled={hasOnlyOneProject}
      >
        <SelectTrigger className={`w-48 h-9 ${hasOnlyOneProject ? 'opacity-70' : ''}`}>
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="none" disabled>
              No assigned projects
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
