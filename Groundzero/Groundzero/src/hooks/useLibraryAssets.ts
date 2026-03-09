import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProductionRole } from './useProductionRole';
import { toast } from 'sonner';
import { 
  LibraryAsset, 
  LibraryAssetType, 
  LibraryApprovalStatus,
  PIPELINE_ENTRY_POINTS,
  AssetInstance
} from '@/types/library';

export function useLibraryAssets() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { isSuperUser, isProducer, isDirector, isHOD, canUpload } = useProductionRole();

  // Check if user can upload to library
  const canUploadToLibrary = isSuperUser || isProducer || isHOD;
  const canApproveLibrary = isSuperUser || isProducer || isDirector;

  // Fetch all library assets
  const { data: libraryAssets, isLoading, refetch } = useQuery({
    queryKey: ['library-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_assets')
        .select(`
          *,
          owning_department:owning_department_id(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as LibraryAsset[];
    },
  });

  // Fetch approved library assets only
  const { data: approvedAssets } = useQuery({
    queryKey: ['library-assets-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_assets')
        .select(`
          *,
          owning_department:owning_department_id(name)
        `)
        .eq('approval_status', 'approved')
        .order('name');
      
      if (error) throw error;
      return (data || []) as unknown as LibraryAsset[];
    },
  });

  // Fetch pending approvals for directors
  const { data: pendingApprovals } = useQuery({
    queryKey: ['library-pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_assets')
        .select(`
          *,
          owning_department:owning_department_id(name)
        `)
        .in('approval_status', ['pending', 'internal_review'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as LibraryAsset[];
    },
    enabled: canApproveLibrary,
  });

  // Create library asset
  const createAssetMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      asset_type: LibraryAssetType;
      owning_department_id?: string;
      tags?: string[];
      thumbnail_url?: string;
    }) => {
      const entryPoint = PIPELINE_ENTRY_POINTS[data.asset_type];
      
      const { data: asset, error } = await supabase
        .from('library_assets')
        .insert({
          name: data.name,
          description: data.description || null,
          asset_type: data.asset_type,
          owning_department_id: data.owning_department_id || null,
          created_by: profile?.id,
          approval_status: 'pending',
          tags: data.tags || null,
          thumbnail_url: data.thumbnail_url || null,
          pipeline_entry_point: entryPoint,
        })
        .select()
        .single();

      if (error) throw error;
      return asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      toast.success('Library asset created. Pending approval.');
    },
    onError: (error) => {
      console.error('Error creating library asset:', error);
      toast.error('Failed to create library asset');
    },
  });

  // Update library asset approval status
  const updateApprovalMutation = useMutation({
    mutationFn: async ({ 
      assetId, 
      status, 
      notes 
    }: { 
      assetId: string; 
      status: LibraryApprovalStatus;
      notes?: string;
    }) => {
      const updateData: any = {
        approval_status: status,
      };
      
      if (status === 'approved') {
        updateData.approved_by = profile?.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('library_assets')
        .update(updateData)
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      queryClient.invalidateQueries({ queryKey: ['library-pending-approvals'] });
      toast.success(`Asset ${variables.status === 'approved' ? 'approved' : 'updated'}`);
    },
    onError: (error) => {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval status');
    },
  });

  // Add library asset to project (create instance)
  const addToProjectMutation = useMutation({
    mutationFn: async ({
      libraryAssetId,
      projectId,
      sceneId,
      shotId,
      instanceName,
    }: {
      libraryAssetId: string;
      projectId: string;
      sceneId?: string;
      shotId?: string;
      instanceName?: string;
    }) => {
      // Get the library asset to determine entry point
      const { data: asset } = await supabase
        .from('library_assets')
        .select('pipeline_entry_point, name')
        .eq('id', libraryAssetId)
        .single();

      // Create asset instance
      const { data: instance, error: instanceError } = await supabase
        .from('asset_instances')
        .insert({
          library_asset_id: libraryAssetId,
          project_id: projectId,
          scene_id: sceneId || null,
          shot_id: shotId || null,
          current_department: asset?.pipeline_entry_point || '3D Modelling',
          workflow_status: 'not_started',
          instance_name: instanceName || asset?.name,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (instanceError) throw instanceError;

      // Log usage
      await supabase
        .from('library_usage_log')
        .insert({
          library_asset_id: libraryAssetId,
          project_id: projectId,
          scene_id: sceneId || null,
          shot_id: shotId || null,
          asset_instance_id: instance.id,
          used_by: profile?.id,
          action: 'added',
        });

      return instance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-instances'] });
      toast.success('Library asset added to project');
    },
    onError: (error) => {
      console.error('Error adding to project:', error);
      toast.error('Failed to add asset to project');
    },
  });

  // Fetch asset instances for a project
  const useProjectInstances = (projectId: string) => {
    return useQuery({
      queryKey: ['asset-instances', projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('asset_instances')
          .select(`
            *,
            library_asset:library_asset_id(id, name, asset_type, thumbnail_url),
            project:project_id(title)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as unknown as AssetInstance[];
      },
      enabled: !!projectId,
    });
  };

  return {
    libraryAssets,
    approvedAssets,
    pendingApprovals,
    isLoading,
    refetch,
    canUploadToLibrary,
    canApproveLibrary,
    createAsset: createAssetMutation.mutate,
    isCreating: createAssetMutation.isPending,
    updateApproval: updateApprovalMutation.mutate,
    isUpdatingApproval: updateApprovalMutation.isPending,
    addToProject: addToProjectMutation.mutate,
    isAddingToProject: addToProjectMutation.isPending,
    useProjectInstances,
  };
}
