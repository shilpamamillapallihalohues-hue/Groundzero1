import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePipelineState, type ApprovalType } from './usePipelineState';

interface ApprovalGateHookOptions {
  projectId: string | null;
  entityType: 'concept_art' | 'storyboard' | 'animatic' | 'technical_plan' | 'asset';
  entityId: string;
  sceneId?: string;
}

export function useApprovalWorkflow({
  projectId,
  entityType,
  entityId,
  sceneId,
}: ApprovalGateHookOptions) {
  const { user } = useAuth();
  const { requestApproval, processApproval, pendingApprovals, isAdmin } = usePipelineState(projectId);
  const [currentApproval, setCurrentApproval] = useState<{
    id: string;
    status: string;
    approvalType: ApprovalType;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Map entity type to approval types
  const getApprovalTypes = (): { internal: ApprovalType; director: ApprovalType } => {
    switch (entityType) {
      case 'concept_art':
        return { internal: 'concept_internal', director: 'concept_director' };
      case 'storyboard':
        return { internal: 'storyboard_internal', director: 'storyboard_director' };
      case 'animatic':
        return { internal: 'animatic_internal', director: 'animatic_director' };
      case 'technical_plan':
        return { internal: 'technical_plan', director: 'technical_plan' };
      case 'asset':
        return { internal: 'production_asset', director: 'production_asset' };
      default:
        return { internal: 'concept_internal', director: 'concept_director' };
    }
  };

  const fetchCurrentApproval = useCallback(async () => {
    if (!projectId || !entityId) {
      setCurrentApproval(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('approval_gates')
        .select('*')
        .eq('project_id', projectId)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentApproval({
          id: data.id,
          status: data.status,
          approvalType: data.approval_type as ApprovalType,
        });
      } else {
        setCurrentApproval(null);
      }
    } catch (err) {
      console.error('Error fetching approval:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, entityId]);

  useEffect(() => {
    fetchCurrentApproval();
  }, [fetchCurrentApproval]);

  // Submit for internal review
  const submitForInternalReview = async () => {
    const types = getApprovalTypes();
    const result = await requestApproval(types.internal, entityType, entityId, sceneId);
    if (result.success) {
      await fetchCurrentApproval();
    }
    return result;
  };

  // Submit for director review
  const submitForDirectorReview = async () => {
    const types = getApprovalTypes();
    const result = await requestApproval(types.director, entityType, entityId, sceneId);
    if (result.success) {
      await fetchCurrentApproval();
    }
    return result;
  };

  // Approve current request
  const approve = async (notes?: string) => {
    if (!currentApproval) return { success: false, error: 'No pending approval' };
    const result = await processApproval(currentApproval.id, 'approved', notes);
    if (result.success) {
      await fetchCurrentApproval();
    }
    return result;
  };

  // Reject current request
  const reject = async (notes?: string) => {
    if (!currentApproval) return { success: false, error: 'No pending approval' };
    const result = await processApproval(currentApproval.id, 'rejected', notes);
    if (result.success) {
      await fetchCurrentApproval();
    }
    return result;
  };

  // Request revision
  const requestRevision = async (notes?: string) => {
    if (!currentApproval) return { success: false, error: 'No pending approval' };
    const result = await processApproval(currentApproval.id, 'revision_requested', notes);
    if (result.success) {
      await fetchCurrentApproval();
    }
    return result;
  };

  // Get status
  const getApprovalStatus = () => {
    if (!currentApproval) return 'none';
    return currentApproval.status;
  };

  // Check if entity has pending approval
  const hasPendingApproval = currentApproval?.status === 'pending';

  // Check if entity is approved
  const isApproved = currentApproval?.status === 'approved';

  // Check if revision requested
  const needsRevision = currentApproval?.status === 'revision_requested';

  // Check if rejected
  const isRejected = currentApproval?.status === 'rejected';

  return {
    currentApproval,
    isLoading,
    isAdmin,
    hasPendingApproval,
    isApproved,
    needsRevision,
    isRejected,
    getApprovalStatus,
    submitForInternalReview,
    submitForDirectorReview,
    approve,
    reject,
    requestRevision,
    refetch: fetchCurrentApproval,
  };
}
