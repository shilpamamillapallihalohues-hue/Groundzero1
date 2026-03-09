import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export interface GenerationProgressProps {
  isGenerating: boolean;
  progress?: number; // 0-100, undefined for indeterminate
  status?: 'idle' | 'generating' | 'complete' | 'error';
  statusText?: string;
  className?: string;
  showIcon?: boolean;
  showPercentage?: boolean; // Always show percentage numbers
}

export function GenerationProgress({
  isGenerating,
  progress,
  status = isGenerating ? 'generating' : 'idle',
  statusText,
  className,
  showIcon = true,
  showPercentage = true,
}: GenerationProgressProps) {
  const [animatedProgress, setAnimatedProgress] = React.useState(0);

  // Indeterminate animation for when progress is undefined
  React.useEffect(() => {
    if (!isGenerating) {
      setAnimatedProgress(status === 'complete' ? 100 : 0);
      return;
    }

    if (progress !== undefined) {
      setAnimatedProgress(progress);
      return;
    }

    // Indeterminate progress animation
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15;
      if (current > 90) current = 90; // Never reach 100 in indeterminate mode
      setAnimatedProgress(current);
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating, progress, status]);

  if (status === 'idle' && !isGenerating) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {showIcon && getStatusIcon()}
          <span className="text-sm font-medium">
            {statusText || (status === 'generating' ? 'Generating...' : status === 'complete' ? 'Complete!' : 'Processing...')}
          </span>
        </div>
        {showPercentage && (
          <span className="text-sm font-medium tabular-nums">
            {Math.round(animatedProgress)}%
          </span>
        )}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            getStatusColor(),
            isGenerating && progress === undefined && "animate-pulse"
          )}
          style={{ width: `${animatedProgress}%` }}
        />
      </div>
    </div>
  );
}
