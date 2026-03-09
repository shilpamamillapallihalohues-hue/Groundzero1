import { useJobStore } from '@/stores/jobStore';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveJobsIndicatorProps {
  projectId: string;
  className?: string;
}

export function ActiveJobsIndicator({ projectId, className }: ActiveJobsIndicatorProps) {
  const jobs = useJobStore((s) => {
    const all = Array.from(s.activeJobs.values());
    return all.filter(j => j.project_id === projectId && (j.status === 'queued' || j.status === 'processing'));
  });

  if (jobs.length === 0) return null;

  const processing = jobs.filter(j => j.status === 'processing').length;
  const queued = jobs.filter(j => j.status === 'queued').length;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="secondary" className="gap-1.5 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        {processing > 0 && `${processing} processing`}
        {processing > 0 && queued > 0 && ', '}
        {queued > 0 && `${queued} queued`}
      </Badge>
    </div>
  );
}
