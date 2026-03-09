import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface RoutingConfig {
  id: string;
  asset_type: string;
  department_order: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetDepartmentStatus {
  id: string;
  asset_id: string;
  project_id: string;
  current_department: string;
  workflow_status: string;
  department_order_index: number;
  assigned_artist_id: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  asset?: {
    id: string;
    name: string;
    category: string;
    thumbnail_url: string | null;
    scene_usage: string[] | null;
  };
  assigned_artist?: {
    id: string;
    full_name: string;
  };
}

export interface DepartmentApprovalLog {
  id: string;
  asset_id: string;
  project_id: string;
  department: string;
  approval_type: 'internal' | 'director' | 'client';
  status: 'approved' | 'rejected' | 'changes_requested';
  reviewer_id: string | null;
  notes: string | null;
  version_number: number;
  created_at: string;
  reviewer?: {
    full_name: string;
  };
}

export function usePipelineRouting(projectId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch routing configurations
  const { data: routingConfigs, isLoading: isLoadingRouting } = useQuery({
    queryKey: ['pipeline-routing-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_routing_config')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as RoutingConfig[];
    },
  });

  // Fetch assets for current department (for HODs and Artists)
  const { data: departmentAssets, isLoading: isLoadingDeptAssets, refetch: refetchDeptAssets } = useQuery({
    queryKey: ['department-assets', projectId, profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return [];

      // Get department name
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .single();

      if (!dept) return [];

      let query = supabase
        .from('asset_department_status')
        .select(`
          *,
          asset:production_assets(id, name, category, thumbnail_url, scene_usage),
          assigned_artist:profiles!asset_department_status_assigned_artist_id_fkey(id, full_name)
        `)
        .eq('current_department', dept.name);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AssetDepartmentStatus[];
    },
    enabled: !!profile?.department_id,
  });

  // Fetch my assigned assets (for Artists)
  const { data: myAssets, isLoading: isLoadingMyAssets } = useQuery({
    queryKey: ['my-assets', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('asset_department_status')
        .select(`
          *,
          asset:production_assets(id, name, category, thumbnail_url, scene_usage)
        `)
        .eq('assigned_artist_id', profile.id);

      if (error) throw error;
      return data as AssetDepartmentStatus[];
    },
    enabled: !!profile?.id,
  });

  // Fetch approval logs for an asset
  const getAssetApprovalHistory = useCallback(async (assetId: string) => {
    const { data, error } = await supabase
      .from('department_approval_log')
      .select(`
        *,
        reviewer:profiles(full_name)
      `)
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as DepartmentApprovalLog[];
  }, []);

  // Assign artist to asset
  const assignArtistMutation = useMutation({
    mutationFn: async ({ assetStatusId, artistId }: { assetStatusId: string; artistId: string }) => {
      const { error } = await supabase
        .from('asset_department_status')
        .update({
          assigned_artist_id: artistId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', assetStatusId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      toast.success('Artist assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign artist: ' + error.message);
    },
  });

  // Update workflow status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      assetStatusId, 
      status, 
      startWork 
    }: { 
      assetStatusId: string; 
      status: string;
      startWork?: boolean;
    }) => {
      const updateData: Record<string, any> = {
        workflow_status: status,
      };

      if (startWork) {
        updateData.started_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('asset_department_status')
        .update(updateData)
        .eq('id', assetStatusId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      queryClient.invalidateQueries({ queryKey: ['my-assets'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });

  // Submit for internal review (Artist → HOD)
  const submitForInternalReview = useMutation({
    mutationFn: async (assetStatusId: string) => {
      const { error } = await supabase
        .from('asset_department_status')
        .update({
          workflow_status: 'internal_review',
        })
        .eq('id', assetStatusId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      queryClient.invalidateQueries({ queryKey: ['my-assets'] });
      toast.success('Submitted for internal review');
    },
  });

  // HOD internal approval
  const internalApprovalMutation = useMutation({
    mutationFn: async ({ 
      assetStatusId, 
      assetId,
      projectId,
      department,
      approved, 
      notes 
    }: { 
      assetStatusId: string;
      assetId: string;
      projectId: string;
      department: string;
      approved: boolean;
      notes?: string;
    }) => {
      // Log the approval
      const { error: logError } = await supabase
        .from('department_approval_log')
        .insert({
          asset_id: assetId,
          project_id: projectId,
          department: department,
          approval_type: 'internal',
          status: approved ? 'approved' : 'changes_requested',
          reviewer_id: profile?.id,
          notes: notes || null,
        });

      if (logError) throw logError;

      // Update status
      const { error: updateError } = await supabase
        .from('asset_department_status')
        .update({
          workflow_status: approved ? 'director_review' : 'changes_requested',
        })
        .eq('id', assetStatusId);

      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      toast.success(variables.approved ? 'Forwarded to Director review' : 'Sent back for changes');
    },
  });

  // Director approval - auto-routes to next department
  const directorApprovalMutation = useMutation({
    mutationFn: async ({ 
      assetId,
      projectId,
      department,
      approved, 
      notes 
    }: { 
      assetId: string;
      projectId: string;
      department: string;
      approved: boolean;
      notes?: string;
    }) => {
      if (approved) {
        // Use the auto-routing function
        const { data, error } = await supabase.rpc('route_asset_to_next_department', {
          p_asset_id: assetId,
          p_approved_by: profile?.id,
        });

        if (error) throw error;
        return data;
      } else {
        // Log rejection
        const { error: logError } = await supabase
          .from('department_approval_log')
          .insert({
            asset_id: assetId,
            project_id: projectId,
            department: department,
            approval_type: 'director',
            status: 'changes_requested',
            reviewer_id: profile?.id,
            notes: notes || null,
          });

        if (logError) throw logError;

        // Send back to artist
        const { error: updateError } = await supabase
          .from('asset_department_status')
          .update({
            workflow_status: 'changes_requested',
          })
          .eq('asset_id', assetId);

        if (updateError) throw updateError;
        
        return { success: true, completed: false };
      }
    },
    onSuccess: (result: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      queryClient.invalidateQueries({ queryKey: ['director-pending'] });
      
      if (variables.approved) {
        if (result?.completed) {
          toast.success('Asset completed all departments!');
        } else {
          toast.success(`Approved and routed to ${result?.next_department}`);
        }
      } else {
        toast.success('Sent back for changes');
      }
    },
  });

  // Initialize asset in pipeline
  const initializeAssetInPipeline = useMutation({
    mutationFn: async ({ 
      assetId, 
      projectId, 
      assetType 
    }: { 
      assetId: string; 
      projectId: string; 
      assetType: string;
    }) => {
      // Get routing config
      const config = routingConfigs?.find(c => c.asset_type === assetType);
      if (!config) throw new Error('No routing config for asset type: ' + assetType);

      const firstDepartment = config.department_order[0];

      const { error } = await supabase
        .from('asset_department_status')
        .insert({
          asset_id: assetId,
          project_id: projectId,
          current_department: firstDepartment,
          workflow_status: 'not_started',
          department_order_index: 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-assets'] });
      toast.success('Asset added to pipeline');
    },
  });

  // Get department order for an asset type
  const getDepartmentOrder = useCallback((assetType: string): string[] => {
    const config = routingConfigs?.find(c => c.asset_type === assetType);
    return config?.department_order || [];
  }, [routingConfigs]);

  // Check if user can approve (HOD, Director, etc.)
  const canApprove = useCallback((approvalType: 'internal' | 'director' | 'client'): boolean => {
    if (!profile) return false;
    
    switch (approvalType) {
      case 'internal':
        return profile.role === 'hod' || profile.role === 'super_user';
      case 'director':
        return profile.role === 'director' || profile.role === 'super_user';
      case 'client':
        return profile.role === 'client' || profile.role === 'super_user';
      default:
        return false;
    }
  }, [profile]);

  return {
    // Data
    routingConfigs,
    departmentAssets,
    myAssets,
    
    // Loading states
    isLoadingRouting,
    isLoadingDeptAssets,
    isLoadingMyAssets,
    
    // Functions
    getDepartmentOrder,
    getAssetApprovalHistory,
    canApprove,
    refetchDeptAssets,
    
    // Mutations
    assignArtist: assignArtistMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    submitForInternalReview: submitForInternalReview.mutate,
    internalApproval: internalApprovalMutation.mutate,
    directorApproval: directorApprovalMutation.mutate,
    initializeAssetInPipeline: initializeAssetInPipeline.mutate,
    
    // Loading states for mutations
    isAssigning: assignArtistMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isSubmitting: submitForInternalReview.isPending,
    isApproving: internalApprovalMutation.isPending || directorApprovalMutation.isPending,
  };
}
