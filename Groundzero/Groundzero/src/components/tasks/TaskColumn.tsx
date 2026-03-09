import { Task } from '@/types/production';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: string;
}

const columnColors: Record<string, string> = {
  todo: 'border-muted-foreground/30',
  in_progress: 'border-info/50',
  review: 'border-warning/50',
  done: 'border-success/50',
};

export function TaskColumn({ title, tasks, status }: TaskColumnProps) {
  return (
    <div className="flex flex-col min-w-[300px] w-[300px]">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-t-xl border-t-2 bg-card",
        columnColors[status]
      )}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-3 space-y-3 bg-secondary/30 rounded-b-xl border border-t-0 border-border min-h-[400px]">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} index={index} />
        ))}
      </div>
    </div>
  );
}
