import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Palette, 
  Clapperboard, 
  Film, 
  Play, 
  Settings2,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreProdProgressTrackerProps {
  projectId: string;
  onStageClick?: (stage: string) => void;
}

const STAGES = [
  { id: 'script', name: 'Script', icon: FileText, description: 'Scene breakdown & characters' },
  { id: 'concept_art', name: 'Concept Art', icon: Palette, description: 'Visual identity' },
  { id: 'storyboard', name: 'Storyboard', icon: Clapperboard, description: 'Shot planning' },
  { id: 'edit_lineup', name: 'Edit Lineup', icon: Film, description: 'Narrative flow' },
  { id: 'animatic', name: 'Animatic', icon: Play, description: 'Timing & motion' },
  { id: 'technical_planning', name: 'Technical', icon: Settings2, description: 'Pipeline & specs' },
];

export function PreProdProgressTracker({ projectId, onStageClick }: PreProdProgressTrackerProps) {
  const { data: stageLocks, isLoading } = useQuery({
    queryKey: ['preprod-all-stage-locks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preprod_stage_locks')
        .select('stage, status, approved_at, locked_at')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const getStageStatus = (stageId: string) => {
    const lock = stageLocks?.find(s => s.stage === stageId);
    return lock?.status || 'draft';
  };

  const lockedCount = stageLocks?.filter(s => s.status === 'locked').length || 0;
  const progressPercent = (lockedCount / STAGES.length) * 100;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pre-Production Progress</span>
          <span className="font-medium">{lockedCount}/{STAGES.length} stages locked</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Stage indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          const isLocked = status === 'locked';
          const isActive = status === 'in_review' || status === 'approved';
          const prevLocked = index === 0 || getStageStatus(STAGES[index - 1].id) === 'locked';
          
          return (
            <button
              key={stage.id}
              onClick={() => onStageClick?.(stage.id)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                isLocked && "border-green-500/50 bg-green-500/10",
                isActive && "border-primary/50 bg-primary/10",
                !isLocked && !isActive && prevLocked && "border-border hover:border-primary/30",
                !isLocked && !isActive && !prevLocked && "border-border/50 opacity-50 cursor-not-allowed"
              )}
              disabled={!prevLocked && !isLocked}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn(
                  "w-4 h-4",
                  isLocked && "text-green-600",
                  isActive && "text-primary"
                )} />
                {status === 'locked' && <Lock className="w-3 h-3 text-green-600" />}
                {status === 'approved' && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                {status === 'in_review' && <Clock className="w-3 h-3 text-amber-500" />}
              </div>
              <p className="text-sm font-medium truncate">{stage.name}</p>
              <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}