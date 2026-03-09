import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionRole } from './useProductionRole';
import { toast } from 'sonner';

type Stage = 'script' | 'concept_art' | 'storyboard' | 'edit_lineup' | 'animatic' | 'technical_planning';
type StageStatus = 'draft' | 'in_review' | 'approved' | 'locked';

export function usePreProdStage(projectId: string | null, stage: Stage) {
  const queryClient = useQueryClient();
  const { isDirector, isProducer, role } = useProductionRole();

  // Fetch stage lock status
  const { data: stageLock, isLoading, refetch } = useQuery({
    queryKey: ['preprod-stage-lock', projectId, stage],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('preprod_stage_locks')
        .select('*')
        .eq('project_id', projectId)
        .eq('stage', stage)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Check all stage locks
  const { data: allStageLocks } = useQuery({
    queryKey: ['preprod-all-stage-locks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('preprod_stage_locks')
        .select('stage, status')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const status: StageStatus = (stageLock?.status as StageStatus) || 'draft';
  const isLocked = status === 'locked';
  const isApproved = status === 'approved' || status === 'locked';
  const isInReview = status === 'in_review';
  const canEdit = !isLocked;
  const canApprove = isInReview && (isDirector || isProducer);
  const canLock = status === 'approved' && (isDirector || isProducer);

  // Stage order for dependency checking
  const stageOrder: Stage[] = ['script', 'concept_art', 'storyboard', 'edit_lineup', 'animatic', 'technical_planning'];
  const currentIndex = stageOrder.indexOf(stage);
  
  const previousStagesLocked = currentIndex === 0 || 
    stageOrder.slice(0, currentIndex).every(prevStage => 
      allStageLocks?.find(s => s.stage === prevStage)?.status === 'locked'
    );

  const canProceed = previousStagesLocked;

  // Submit for review
  const submitForReview = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');
      
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

  // Approve stage
  const approve = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');
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

  // Lock stage
  const lock = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');
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
      toast.success('Stage locked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to lock');
    },
  });

  return {
    status,
    isLocked,
    isApproved,
    isInReview,
    canEdit,
    canApprove,
    canLock,
    canProceed,
    previousStagesLocked,
    isLoading,
    stageLock,
    submitForReview: submitForReview.mutate,
    approve: approve.mutate,
    lock: lock.mutate,
    isSubmitting: submitForReview.isPending,
    isApproving: approve.isPending,
    isLocking: lock.isPending,
    refetch,
  };
}