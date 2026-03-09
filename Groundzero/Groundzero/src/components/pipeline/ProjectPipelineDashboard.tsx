import React from 'react';
import { Lock, Unlock, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { StageGateIndicator } from './StageGateIndicator';
import { ApprovalGatePanel } from './ApprovalGatePanel';
import { usePipelineState, type ProductionStage } from '@/hooks/usePipelineState';

interface ProjectPipelineDashboardProps {
  projectId: string;
}

const STAGE_LABELS: Record<ProductionStage, string> = {
  pre_production: 'Pre-Production',
  production: 'Production',
  post_production: 'Post-Production',
  completed: 'Completed',
  archived: 'Archived',
};

export function ProjectPipelineDashboard({ projectId }: ProjectPipelineDashboardProps) {
  const {
    pipelineState,
    pendingApprovals,
    gateRequirements,
    isLoading,
    error,
    updateGate,
    transitionStage,
    processApproval,
    isAdmin,
  } = usePipelineState(projectId);

  const handleApprove = async (id: string, notes?: string) => {
    return processApproval(id, 'approved', notes);
  };

  const handleReject = async (id: string, notes?: string) => {
    return processApproval(id, 'rejected', notes);
  };

  const handleRequestRevision = async (id: string, notes?: string) => {
    return processApproval(id, 'revision_requested', notes);
  };

  const handleTransition = async (targetStage: ProductionStage) => {
    const result = await transitionStage(targetStage, isAdmin ? 'override' : 'approval');
    if (result.success) {
      toast.success(`Transitioned to ${STAGE_LABELS[targetStage]}`);
    } else {
      toast.error(result.error || 'Failed to transition stage');
    }
  };

  const handleOverrideGate = async (gateKey: string) => {
    if (!isAdmin || !pipelineState) return;
    
    const currentValue = (pipelineState as unknown as Record<string, boolean>)[gateKey] ?? false;
    const result = await updateGate(gateKey as any, !currentValue);
    if (result.success) {
      toast.success(`Gate ${currentValue ? 'unlocked' : 'locked'}`);
    } else {
      toast.error(result.error || 'Failed to update gate');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !pipelineState) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || 'Failed to load pipeline state'}
        </AlertDescription>
      </Alert>
    );
  }

  const currentStage = pipelineState.current_stage;

  // Determine next available stage
  const getNextStage = (): ProductionStage | null => {
    if (currentStage === 'pre_production' && gateRequirements.can_enter_production) {
      return 'production';
    }
    if (currentStage === 'production' && gateRequirements.can_enter_post) {
      return 'post_production';
    }
    if (currentStage === 'post_production' && gateRequirements.can_complete) {
      return 'completed';
    }
    return null;
  };

  const nextStage = getNextStage();

  return (
    <div className="space-y-6">
      {/* Stage Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Production Pipeline</CardTitle>
              <CardDescription>
                Current Stage: <Badge variant="default">{STAGE_LABELS[currentStage]}</Badge>
              </CardDescription>
            </div>
            {nextStage && (
              <Button
                onClick={() => handleTransition(nextStage)}
                className="gap-2"
              >
                Advance to {STAGE_LABELS[nextStage]}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <StageGateIndicator
            currentStage={currentStage}
            gateRequirements={gateRequirements}
          />
        </CardContent>
      </Card>

      {/* Admin Override Panel */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Lock className="w-5 h-5" />
              Super User Controls
            </CardTitle>
            <CardDescription>
              Override gate locks and force stage transitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'script_locked', label: 'Script Lock' },
                { key: 'concept_approved', label: 'Concepts' },
                { key: 'storyboard_approved', label: 'Storyboards' },
                { key: 'animatic_approved', label: 'Animatic' },
                { key: 'technical_plan_approved', label: 'Tech Plan' },
                { key: 'production_complete', label: 'Production' },
                { key: 'post_complete', label: 'Post' },
                { key: 'client_approved', label: 'Client' },
              ].map(({ key, label }) => {
                const isLocked = gateRequirements[key as keyof typeof gateRequirements];
                return (
                  <Button
                    key={key}
                    variant={isLocked ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleOverrideGate(key as any)}
                    className="gap-2"
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-green-500" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                    {label}
                  </Button>
                );
              })}
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground mr-2">Force Stage:</span>
              {(['pre_production', 'production', 'post_production', 'completed'] as ProductionStage[]).map((stage) => (
                <Button
                  key={stage}
                  variant={currentStage === stage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTransition(stage)}
                  disabled={currentStage === stage}
                >
                  {STAGE_LABELS[stage]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Approvals */}
      <ApprovalGatePanel
        approvals={pendingApprovals}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestRevision={handleRequestRevision}
        canApprove={isAdmin}
      />

      {/* Gate Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Gate Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GateStatusCard
              label="Script"
              isComplete={gateRequirements.script_locked}
              description={gateRequirements.script_locked ? 'Locked' : 'Draft'}
            />
            <GateStatusCard
              label="Concept Art"
              isComplete={gateRequirements.concept_approved}
              description={gateRequirements.concept_approved ? 'Approved' : 'Pending'}
            />
            <GateStatusCard
              label="Storyboards"
              isComplete={gateRequirements.storyboard_approved}
              description={gateRequirements.storyboard_approved ? 'Approved' : 'Pending'}
            />
            <GateStatusCard
              label="Animatic"
              isComplete={gateRequirements.animatic_approved}
              description={gateRequirements.animatic_approved ? 'Approved' : 'Pending'}
            />
            <GateStatusCard
              label="Tech Plan"
              isComplete={gateRequirements.technical_plan_approved}
              description={gateRequirements.technical_plan_approved ? 'Approved' : 'Pending'}
            />
            <GateStatusCard
              label="Production"
              isComplete={gateRequirements.production_complete}
              description={gateRequirements.production_complete ? 'Complete' : 'In Progress'}
            />
            <GateStatusCard
              label="Post"
              isComplete={gateRequirements.post_complete}
              description={gateRequirements.post_complete ? 'Complete' : 'Pending'}
            />
            <GateStatusCard
              label="Client"
              isComplete={gateRequirements.client_approved}
              description={gateRequirements.client_approved ? 'Approved' : 'Awaiting'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface GateStatusCardProps {
  label: string;
  isComplete: boolean;
  description: string;
}

function GateStatusCard({ label, isComplete, description }: GateStatusCardProps) {
  return (
    <div className={`p-4 rounded-lg border ${isComplete ? 'bg-green-500/10 border-green-500/50' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-2 mb-1">
        {isComplete ? (
          <Lock className="w-4 h-4 text-green-500" />
        ) : (
          <Unlock className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className={`text-xs ${isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
        {description}
      </p>
    </div>
  );
}
