import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Send,
  User,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PreProdStageGateProps {
  projectId: string;
  stage: 'script' | 'concept_art' | 'storyboard' | 'edit_lineup' | 'animatic' | 'technical_planning';
  title: string;
  description: string;
  requiredApprovals?: ('team' | 'art_director' | 'director' | 'producer')[];
  onLocked?: () => void;
}

const STAGE_ORDER = ['script', 'concept_art', 'storyboard', 'edit_lineup', 'animatic', 'technical_planning'];

export function PreProdStageGate({
  projectId,
  stage,
  title,
  description,
  requiredApprovals = ['director'],
  onLocked,
}: PreProdStageGateProps) {
  const queryClient = useQueryClient();
  const { role, isDirector, isProducer } = useProductionRole();
  const [showLockDialog, setShowLockDialog] = useState(false);

  // Fetch stage lock status
  const { data: stageLock, isLoading } = useQuery({
    queryKey: ['preprod-stage-lock', projectId, stage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preprod_stage_locks')
        .select('*, approved_by_profile:profiles!preprod_stage_locks_approved_by_fkey(full_name), locked_by_profile:profiles!preprod_stage_locks_locked_by_fkey(full_name)')
        .eq('project_id', projectId)
        .eq('stage', stage)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Check if previous stages are locked
  const { data: allStageLocks } = useQuery({
    queryKey: ['preprod-all-stage-locks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preprod_stage_locks')
        .select('stage, status')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const currentStageIndex = STAGE_ORDER.indexOf(stage);
  const previousStagesLocked = currentStageIndex === 0 || 
    STAGE_ORDER.slice(0, currentStageIndex).every(prevStage => 
      allStageLocks?.find(s => s.stage === prevStage)?.status === 'locked'
    );

  // Submit for review mutation
  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from('preprod_stage_locks')
        .select('id')
        .eq('project_id', projectId)
        .eq('stage', stage)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('preprod_stage_locks')
          .update({ status: 'in_review', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('preprod_stage_locks')
          .insert({ project_id: projectId, stage, status: 'in_review' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preprod-stage-lock', projectId, stage] });
      toast.success('Submitted for review');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit');
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('preprod_stage_locks')
        .update({ 
          status: 'approved', 
          approved_by: user.id, 
          approved_at: new Date().toISOString() 
        })
        .eq('project_id', projectId)
        .eq('stage', stage);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preprod-stage-lock', projectId, stage] });
      toast.success('Stage approved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve');
    },
  });

  // Lock mutation
  const lockMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('preprod_stage_locks')
        .update({ 
          status: 'locked', 
          locked_by: user.id, 
          locked_at: new Date().toISOString() 
        })
        .eq('project_id', projectId)
        .eq('stage', stage);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preprod-stage-lock', projectId, stage] });
      queryClient.invalidateQueries({ queryKey: ['preprod-all-stage-locks', projectId] });
      toast.success(`${title} locked - proceeding to next stage`);
      onLocked?.();
      setShowLockDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to lock');
    },
  });

  const status = stageLock?.status || 'draft';
  const isLocked = status === 'locked';
  const canSubmit = status === 'draft' && previousStagesLocked;
  const canApprove = status === 'in_review' && (isDirector || isProducer);
  const canLock = status === 'approved' && (isDirector || isProducer);

  const getStatusBadge = () => {
    switch (status) {
      case 'locked':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <Lock className="w-3 h-3 mr-1" /> Locked
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'in_review':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" /> In Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" /> Draft
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className={cn(
        "border-2 transition-colors",
        isLocked && "border-green-500/30 bg-green-500/5",
        status === 'in_review' && "border-amber-500/30 bg-amber-500/5"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isLocked ? <Lock className="w-5 h-5 text-green-600" /> : <Unlock className="w-5 h-5" />}
              {title}
            </CardTitle>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Previous stage warning */}
          {!previousStagesLocked && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Previous stages must be locked first</span>
            </div>
          )}

          {/* Approval info */}
          {stageLock?.approved_by && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Approved by {(stageLock as any).approved_by_profile?.full_name || 'Unknown'}</span>
            </div>
          )}

          {stageLock?.locked_by && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Shield className="w-4 h-4" />
              <span>Locked by {(stageLock as any).locked_by_profile?.full_name || 'Unknown'}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {canSubmit && (
              <Button
                onClick={() => submitForReviewMutation.mutate()}
                disabled={submitForReviewMutation.isPending}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Review
              </Button>
            )}

            {canApprove && (
              <Button
                variant="gold"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
            )}

            {canLock && (
              <Button
                variant="destructive"
                onClick={() => setShowLockDialog(true)}
                disabled={lockMutation.isPending}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                Lock Stage
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lock confirmation dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Once locked:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All {stage === 'script' ? 'scene IDs' : stage === 'storyboard' ? 'shot IDs' : 'content'} will be frozen</li>
                <li>No further edits will be allowed</li>
                <li>The next pre-production stage will be unlocked</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => lockMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
            >
              Lock {title}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}