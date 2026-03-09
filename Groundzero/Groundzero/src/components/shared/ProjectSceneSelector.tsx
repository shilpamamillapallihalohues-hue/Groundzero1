import { useQuery } from '@tanstack/react-query';
import { getProjectScenes } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Film, Clapperboard } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useEffect } from 'react';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

interface ProjectSceneSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  selectedSceneId?: string | null;
  onSceneSelect?: (sceneId: string) => void;
  showSceneSelector?: boolean;
  className?: string;
}

export function ProjectSceneSelector({ 
  selectedProjectId, 
  onProjectSelect,
  selectedSceneId,
  onSceneSelect,
  showSceneSelector = false,
  className = ''
}: ProjectSceneSelectorProps) {
  const { data: projects, isLoading: loadingProjects } = useAssignedProjects();

  const { data: scenes, isLoading: loadingScenes } = useQuery({
    queryKey: ['scenes-for-selector', selectedProjectId],
    queryFn: () => selectedProjectId ? getProjectScenes(selectedProjectId) : Promise.resolve([]),
    enabled: !!selectedProjectId && showSceneSelector
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      onProjectSelect(projects[0].id);
    }
  }, [projects, selectedProjectId, onProjectSelect]);

  if (loadingProjects) {
    return <Skeleton className="h-10 w-64" />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedProjectId || ''} onValueChange={onProjectSelect}>
          <SelectTrigger className="w-48">
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
                No projects available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {showSceneSelector && selectedProjectId && onSceneSelect && (
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
          {loadingScenes ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedSceneId || ''} onValueChange={onSceneSelect}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select scene" />
              </SelectTrigger>
              <SelectContent>
                {scenes && scenes.length > 0 ? (
                  scenes.map((scene: any) => (
                    <SelectItem key={scene.id} value={scene.id}>
                      {scene.slugline || `Scene ${scene.scene_number}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No scenes available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
