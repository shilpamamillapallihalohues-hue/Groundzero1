import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export type ProductionStage = 'pre_production' | 'production' | 'post_production' | 'completed' | 'archived';
export type AssetWorkflowStatus = 'not_started' | 'in_progress' | 'internal_review' | 'director_review' | 'approved' | 'locked';
export type ApprovalType = 
  | 'script_draft' | 'script_final' | 'script_lock'
  | 'concept_internal' | 'concept_director'
  | 'storyboard_internal' | 'storyboard_director'
  | 'animatic_internal' | 'animatic_director'
  | 'technical_plan' | 'production_asset'
  | 'post_review' | 'client_final';

export interface PipelineState {
  id: string;
  project_id: string;
  current_stage: ProductionStage;
  script_locked: boolean;
  script_locked_at: string | null;
  concept_approved: boolean;
  concept_approved_at: string | null;
  storyboard_approved: boolean;
  storyboard_approved_at: string | null;
  animatic_approved: boolean;
  animatic_approved_at: string | null;
  technical_plan_approved: boolean;
  technical_plan_approved_at: string | null;
  production_complete: boolean;
  production_complete_at: string | null;
  post_complete: boolean;
  post_complete_at: string | null;
  client_approved: boolean;
  client_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalGate {
  id: string;
  project_id: string;
  scene_id: string | null;
  approval_type: ApprovalType;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  revision_count: number;
}

export interface StageGateRequirements {
  script_locked: boolean;
  concept_approved: boolean;
  storyboard_approved: boolean;
  animatic_approved: boolean;
  technical_plan_approved: boolean;
  can_enter_production: boolean;
  production_complete: boolean;
  can_enter_post: boolean;
  post_complete: boolean;
  client_approved: boolean;
  can_complete: boolean;
}

export function usePipelineState(projectId: string | null) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalGate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelineState = useCallback(async () => {
    if (!projectId) {
      setPipelineState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch pipeline state
      const { data: stateData, error: stateError } = await supabase
        .from('project_pipeline_state')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (stateError && stateError.code !== 'PGRST116') {
        throw stateError;
      }

      setPipelineState(stateData as PipelineState | null);

      // Fetch pending approvals
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_gates')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (approvalError) {
        console.error('Error fetching approvals:', approvalError);
      } else {
        setPendingApprovals((approvalData || []) as ApprovalGate[]);
      }
    } catch (err) {
      console.error('Error fetching pipeline state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline state');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPipelineState();
  }, [fetchPipelineState]);

  // Calculate gate requirements
  const gateRequirements: StageGateRequirements = {
    script_locked: pipelineState?.script_locked ?? false,
    concept_approved: pipelineState?.concept_approved ?? false,
    storyboard_approved: pipelineState?.storyboard_approved ?? false,
    animatic_approved: pipelineState?.animatic_approved ?? false,
    technical_plan_approved: pipelineState?.technical_plan_approved ?? false,
    can_enter_production: 
      (pipelineState?.script_locked ?? false) &&
      (pipelineState?.concept_approved ?? false) &&
      (pipelineState?.storyboard_approved ?? false) &&
      (pipelineState?.animatic_approved ?? false) &&
      (pipelineState?.technical_plan_approved ?? false),
    production_complete: pipelineState?.production_complete ?? false,
    can_enter_post: pipelineState?.production_complete ?? false,
    post_complete: pipelineState?.post_complete ?? false,
    client_approved: pipelineState?.client_approved ?? false,
    can_complete: 
      (pipelineState?.post_complete ?? false) && 
      (pipelineState?.client_approved ?? false),
  };

  // Update gate status
  const updateGate = async (
    gateKey: keyof Pick<PipelineState, 
      'script_locked' | 'concept_approved' | 'storyboard_approved' | 
      'animatic_approved' | 'technical_plan_approved' | 'production_complete' | 
      'post_complete' | 'client_approved'
    >,
    value: boolean
  ) => {
    if (!projectId || !pipelineState) return { success: false, error: 'No project or pipeline state' };

    try {
      const timestampKey = `${gateKey.replace('_approved', '_approved').replace('_locked', '_locked').replace('_complete', '_complete')}_at` as string;
      
      const updateData: Record<string, unknown> = {
        [gateKey]: value,
        [timestampKey]: value ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('project_pipeline_state')
        .update(updateData)
        .eq('project_id', projectId);

      if (error) throw error;

      await fetchPipelineState();
      return { success: true };
    } catch (err) {
      console.error('Error updating gate:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update gate' };
    }
  };

  // Transition to next stage
  const transitionStage = async (targetStage: ProductionStage, reason: string = 'approval') => {
    if (!projectId || !pipelineState || !user) {
      return { success: false, error: 'Missing required data' };
    }

    // Check if transition is allowed (unless admin override)
    if (!isAdmin) {
      if (targetStage === 'production' && !gateRequirements.can_enter_production) {
        return { success: false, error: 'Pre-production gates not complete' };
      }
      if (targetStage === 'post_production' && !gateRequirements.can_enter_post) {
        return { success: false, error: 'Production not complete' };
      }
      if (targetStage === 'completed' && !gateRequirements.can_complete) {
        return { success: false, error: 'Post-production and client approval required' };
      }
    }

    try {
      // Get profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Update stage
      const { error: updateError } = await supabase
        .from('project_pipeline_state')
        .update({ current_stage: targetStage })
        .eq('project_id', projectId);

      if (updateError) throw updateError;

      // Log transition
      await supabase.from('stage_transition_log').insert({
        project_id: projectId,
        from_stage: pipelineState.current_stage,
        to_stage: targetStage,
        triggered_by: profile?.id,
        trigger_reason: isAdmin && reason === 'override' ? 'override' : 'approval',
        metadata: { timestamp: new Date().toISOString() }
      });

      await fetchPipelineState();
      return { success: true };
    } catch (err) {
      console.error('Error transitioning stage:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to transition stage' };
    }
  };

  // Request approval
  const requestApproval = async (
    approvalType: ApprovalType,
    entityType: string,
    entityId: string,
    sceneId?: string
  ) => {
    if (!projectId || !user) {
      return { success: false, error: 'Missing required data' };
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase.from('approval_gates').insert({
        project_id: projectId,
        scene_id: sceneId || null,
        approval_type: approvalType,
        entity_type: entityType,
        entity_id: entityId,
        status: 'pending',
        requested_by: profile?.id,
      });

      if (error) throw error;

      await fetchPipelineState();
      return { success: true };
    } catch (err) {
      console.error('Error requesting approval:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to request approval' };
    }
  };

  // Process approval
  const processApproval = async (
    approvalId: string,
    status: 'approved' | 'rejected' | 'revision_requested',
    notes?: string
  ) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const updateData: Record<string, unknown> = {
        status,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        notes,
      };

      const { error } = await supabase
        .from('approval_gates')
        .update(updateData)
        .eq('id', approvalId);

      if (error) throw error;

      await fetchPipelineState();
      return { success: true };
    } catch (err) {
      console.error('Error processing approval:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to process approval' };
    }
  };

  return {
    pipelineState,
    pendingApprovals,
    gateRequirements,
    isLoading,
    error,
    updateGate,
    transitionStage,
    requestApproval,
    processApproval,
    refetch: fetchPipelineState,
    isAdmin,
  };
}
