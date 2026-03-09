import React from 'react';
import { CheckCircle2, Circle, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProductionStage, StageGateRequirements } from '@/hooks/usePipelineState';

interface StageGateIndicatorProps {
  currentStage: ProductionStage;
  gateRequirements: StageGateRequirements;
  compact?: boolean;
}

interface StageInfo {
  key: ProductionStage;
  label: string;
  shortLabel: string;
  gates: { key: keyof StageGateRequirements; label: string }[];
}

const STAGES: StageInfo[] = [
  {
    key: 'pre_production',
    label: 'Pre-Production',
    shortLabel: 'Pre-Prod',
    gates: [
      { key: 'script_locked', label: 'Script Lock' },
      { key: 'concept_approved', label: 'Concepts Approved' },
      { key: 'storyboard_approved', label: 'Storyboards Approved' },
      { key: 'animatic_approved', label: 'Animatic Approved' },
      { key: 'technical_plan_approved', label: 'Tech Plan Approved' },
    ],
  },
  {
    key: 'production',
    label: 'Production',
    shortLabel: 'Prod',
    gates: [
      { key: 'production_complete', label: 'All Assets Complete' },
    ],
  },
  {
    key: 'post_production',
    label: 'Post-Production',
    shortLabel: 'Post',
    gates: [
      { key: 'post_complete', label: 'Post Complete' },
      { key: 'client_approved', label: 'Client Approved' },
    ],
  },
  {
    key: 'completed',
    label: 'Completed',
    shortLabel: 'Done',
    gates: [],
  },
];

const STAGE_ORDER: ProductionStage[] = ['pre_production', 'production', 'post_production', 'completed', 'archived'];

export function StageGateIndicator({ currentStage, gateRequirements, compact = false }: StageGateIndicatorProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  const getStageStatus = (stage: StageInfo, index: number) => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    
    // Check if can transition to this stage
    if (stage.key === 'production' && gateRequirements.can_enter_production) return 'ready';
    if (stage.key === 'post_production' && gateRequirements.can_enter_post) return 'ready';
    if (stage.key === 'completed' && gateRequirements.can_complete) return 'ready';
    
    return 'locked';
  };

  const getGateIcon = (gateKey: keyof StageGateRequirements) => {
    const value = gateRequirements[gateKey];
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-muted-foreground" />
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage, index);
          return (
            <React.Fragment key={stage.key}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant={status === 'current' ? 'default' : 'outline'}
                      className={cn(
                        'text-xs',
                        status === 'completed' && 'bg-green-500/20 text-green-600 border-green-500/50',
                        status === 'current' && 'bg-primary',
                        status === 'ready' && 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50',
                        status === 'locked' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {status === 'locked' && <Lock className="w-3 h-3 mr-1" />}
                      {stage.shortLabel}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{stage.label}</p>
                      {stage.gates.map(gate => (
                        <div key={gate.key} className="flex items-center gap-2 text-xs">
                          {getGateIcon(gate.key)}
                          <span>{gate.label}</span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {index < STAGES.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage, index);
          return (
            <React.Fragment key={stage.key}>
              <div className="flex-1">
                <div
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    status === 'completed' && 'bg-green-500/10 border-green-500/50',
                    status === 'current' && 'bg-primary/10 border-primary',
                    status === 'ready' && 'bg-yellow-500/10 border-yellow-500/50',
                    status === 'locked' && 'bg-muted/50 border-muted'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {status === 'current' && <AlertCircle className="w-4 h-4 text-primary" />}
                    {status === 'ready' && <CheckCircle2 className="w-4 h-4 text-yellow-500" />}
                    {status === 'locked' && <Lock className="w-4 h-4 text-muted-foreground" />}
                    <span className={cn(
                      'font-medium text-sm',
                      status === 'locked' && 'text-muted-foreground'
                    )}>
                      {stage.label}
                    </span>
                  </div>
                  
                  {stage.gates.length > 0 && (
                    <div className="space-y-1">
                      {stage.gates.map(gate => (
                        <div key={gate.key} className="flex items-center gap-2 text-xs">
                          {getGateIcon(gate.key)}
                          <span className={cn(
                            gateRequirements[gate.key] ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {gate.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {index < STAGES.length - 1 && (
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
