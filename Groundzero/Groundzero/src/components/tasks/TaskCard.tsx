import { Calendar, MoreVertical } from 'lucide-react';
import { Task } from '@/types/production';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { departmentColors } from '@/data/mockData';

interface TaskCardProps {
  task: Task;
  index: number;
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/20 text-info',
  high: 'bg-warning/20 text-warning',
  urgent: 'bg-destructive/20 text-destructive',
};

export function TaskCard({ task, index }: TaskCardProps) {
  return (
    <div 
      className={cn(
        "group p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className={cn("text-xs capitalize", priorityColors[task.priority])}>
          {task.priority}
        </Badge>
        <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Title */}
      <h4 className="font-medium text-foreground mb-2 line-clamp-2">{task.title}</h4>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "px-2 py-1 rounded text-xs font-medium capitalize",
          departmentColors[task.department]
        )}>
          {task.department}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{task.dueDate.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Assignee */}
      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-xs font-medium text-primary-foreground">
          {task.assignedTo.charAt(0)}
        </div>
        <span className="text-sm text-muted-foreground">{task.assignedTo}</span>
      </div>
    </div>
  );
}
