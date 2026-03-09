import { Clock, MapPin, Users, Wand2 } from 'lucide-react';
import { Scene } from '@/types/production';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { departmentColors } from '@/data/mockData';

interface SceneCardProps {
  scene: Scene;
  index: number;
  onClick?: () => void;
}

const statusLabels: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  review: 'In Review',
  approved: 'Approved',
};

const statusVariants: Record<string, 'secondary' | 'info' | 'warning' | 'success'> = {
  not_started: 'secondary',
  in_progress: 'info',
  review: 'warning',
  approved: 'success',
};

const timeOfDayIcons: Record<string, string> = {
  day: '☀️',
  night: '🌙',
  dawn: '🌅',
  dusk: '🌇',
  golden_hour: '🌄',
};

export function SceneCard({ scene, index, onClick }: SceneCardProps) {
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg cursor-pointer animate-slide-up"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      {/* Scene Number Badge */}
      <div className="absolute top-4 right-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{scene.sceneNumber}</span>
        </div>
      </div>

      {/* Status */}
      <Badge variant={statusVariants[scene.status]} className="mb-3">
        {statusLabels[scene.status]}
      </Badge>

      {/* Slugline */}
      <h3 className="text-base font-semibold text-foreground mb-2 pr-12 group-hover:text-primary transition-colors">
        {scene.slugline}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {scene.description}
      </p>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>{scene.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>{timeOfDayIcons[scene.timeOfDay]}</span>
          <span className="capitalize">{scene.timeOfDay.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{scene.estimatedDuration} min</span>
        </div>
        {scene.characters.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{scene.characters.length}</span>
          </div>
        )}
      </div>

      {/* VFX Indicator */}
      {scene.vfxRequired && (
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="glass" className="gap-1.5">
            <Wand2 className="w-3 h-3" />
            VFX: {scene.vfxComplexity}
          </Badge>
        </div>
      )}

      {/* Departments */}
      <div className="flex flex-wrap gap-2">
        {scene.assignedDepartments.map((dept) => (
          <span
            key={dept}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium capitalize",
              departmentColors[dept]
            )}
          >
            {dept}
          </span>
        ))}
      </div>

      {/* AI Generate Button */}
      <Button
        variant="gold"
        size="sm"
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Wand2 className="w-4 h-4 mr-1" />
        Generate
      </Button>
    </div>
  );
}
