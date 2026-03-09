import { CheckCircle, Edit, Image, MessageSquare, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const activities = [
  {
    id: 1,
    type: 'approval',
    user: 'Sarah Chen',
    action: 'approved storyboard',
    target: 'Scene 1A - Lab Wide Shot',
    time: '2 minutes ago',
    icon: CheckCircle,
  },
  {
    id: 2,
    type: 'upload',
    user: 'Marcus Johnson',
    action: 'uploaded concept art for',
    target: 'Quantum Portal',
    time: '15 minutes ago',
    icon: Upload,
  },
  {
    id: 3,
    type: 'comment',
    user: 'Lisa Park',
    action: 'commented on',
    target: 'VFX Breakdown - Scene 2',
    time: '1 hour ago',
    icon: MessageSquare,
  },
  {
    id: 4,
    type: 'edit',
    user: 'David Kim',
    action: 'updated sound design for',
    target: 'Lab Ambience',
    time: '2 hours ago',
    icon: Edit,
  },
  {
    id: 5,
    type: 'generation',
    user: 'AI System',
    action: 'generated storyboards for',
    target: 'Scenes 3-5',
    time: '3 hours ago',
    icon: Image,
  },
];

const typeColors: Record<string, string> = {
  approval: 'bg-success/20 text-success',
  upload: 'bg-info/20 text-info',
  comment: 'bg-warning/20 text-warning',
  edit: 'bg-primary/20 text-primary',
  generation: 'bg-purple-500/20 text-purple-400',
};

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={activity.id}
            className={cn(
              "flex items-start gap-3 animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              typeColors[activity.type]
            )}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.user}</span>
                {' '}{activity.action}{' '}
                <span className="font-medium text-primary">{activity.target}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
