import { Link } from 'react-router-dom';
import { Calendar, Film, MoreVertical, Users } from 'lucide-react';
import { Project } from '@/types/production';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  index: number;
}

const statusColors: Record<string, string> = {
  pre_production: 'gold',
  production: 'info',
  post_production: 'warning',
  completed: 'success',
};

const statusLabels: Record<string, string> = {
  pre_production: 'Pre-Production',
  production: 'Production',
  post_production: 'Post-Production',
  completed: 'Completed',
};

export function ProjectCard({ project, index }: ProjectCardProps) {
  const progress = Math.round((project.completedScenes / project.totalScenes) * 100);
  
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-500 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Thumbnail / Gradient - compact */}
      <div className="relative h-24 lg:h-28 bg-gradient-to-br from-secondary via-accent to-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <Badge variant={statusColors[project.status] as any} className="text-[10px] px-1.5 py-0.5">{statusLabels[project.status]}</Badge>
          <Button variant="ghost" size="icon" className="w-6 h-6 bg-background/20 backdrop-blur-sm hover:bg-background/40">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </div>
        <div className="absolute bottom-2 left-2">
          <Film className="w-6 h-6 lg:w-8 lg:h-8 text-primary/60" />
        </div>
      </div>

      {/* Content - compact */}
      <div className="p-3">
        <Link to={`/projects/${project.id}`}>
          <h3 className="text-sm lg:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {project.title}
          </h3>
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{project.description}</p>

        {/* Meta - compact */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{project.director}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{project.updatedAt.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Progress - compact */}
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{project.completedScenes}/{project.totalScenes}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}
