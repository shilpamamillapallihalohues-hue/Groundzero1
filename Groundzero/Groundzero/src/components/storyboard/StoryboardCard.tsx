import { MessageSquare, MoreVertical, RefreshCw, Check, X } from 'lucide-react';
import { Storyboard } from '@/types/production';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StoryboardCardProps {
  storyboard: Storyboard;
  index: number;
}

const statusConfig: Record<string, { variant: 'secondary' | 'info' | 'warning' | 'success' | 'destructive'; label: string }> = {
  pending: { variant: 'secondary', label: 'Pending' },
  in_progress: { variant: 'info', label: 'Generating' },
  review: { variant: 'warning', label: 'Review' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'destructive', label: 'Rejected' },
};

export function StoryboardCard({ storyboard, index }: StoryboardCardProps) {
  const status = statusConfig[storyboard.status] || statusConfig.pending;

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-xl animate-scale-in"
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Image Area */}
      <div className="relative aspect-video bg-gradient-to-br from-secondary via-accent to-muted overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🎬</span>
            </div>
            <p className="text-sm text-muted-foreground">Shot {storyboard.shotNumber}</p>
          </div>
        </div>

        <div className="absolute top-3 left-3">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="absolute top-3 right-3">
          <Badge variant="glass">v{storyboard.version}</Badge>
        </div>

        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
          <Button size="sm" variant="gold">
            <RefreshCw className="w-4 h-4 mr-1" />
            Regenerate
          </Button>
          <Button size="sm" variant="outline" className="bg-success/20 border-success/40 text-success hover:bg-success/30">
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-foreground">{storyboard.shotType}</h4>
            <p className="text-sm text-muted-foreground">{storyboard.cameraAngle}</p>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
            {storyboard.lighting}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
            {storyboard.mood}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {storyboard.action}
        </p>

        <div className="flex items-center justify-between text-sm">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span>{storyboard.comments.length}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
