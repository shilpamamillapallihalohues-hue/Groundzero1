import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/lib/api';
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

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
}

export function ProjectSelector({ selectedProjectId, onProjectSelect }: ProjectSelectorProps) {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects-for-analysis'],
    queryFn: getProjects
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      onProjectSelect(projects[0].id);
    }
  }, [projects, selectedProjectId, onProjectSelect]);

  if (isLoading) {
    return <Skeleton className="h-10 w-64" />;
  }

  return (
    <div className="flex items-center gap-3">
      <Film className="h-5 w-5 text-muted-foreground" />
      <Select value={selectedProjectId || ''} onValueChange={onProjectSelect}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a project to analyze" />
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
              No projects available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
