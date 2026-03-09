import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const departments = [
  { name: 'Direction', progress: 78, color: 'bg-primary' },
  { name: 'Cinematography', progress: 65, color: 'bg-info' },
  { name: 'Art Department', progress: 82, color: 'bg-success' },
  { name: 'VFX', progress: 45, color: 'bg-purple-500' },
  { name: 'Costume', progress: 90, color: 'bg-pink-500' },
  { name: 'Sound', progress: 55, color: 'bg-warning' },
];

export function DepartmentProgress() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Department Progress</h3>
      
      <div className="space-y-5">
        {departments.map((dept, index) => (
          <div 
            key={dept.name}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground font-medium">{dept.name}</span>
              <span className="text-muted-foreground">{dept.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", dept.color)}
                style={{ width: `${dept.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
