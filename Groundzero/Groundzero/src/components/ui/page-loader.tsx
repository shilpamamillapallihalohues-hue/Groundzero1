import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  className?: string;
  text?: string;
}

export function PageLoader({ className, text = 'Loading...' }: PageLoaderProps) {
  return (
    <div className={cn(
      "min-h-[60vh] flex flex-col items-center justify-center gap-3",
      className
    )}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function FullPageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
