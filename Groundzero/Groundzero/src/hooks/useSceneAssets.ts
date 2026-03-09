import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { AssetWorkflowStatus, ProductionStage } from './usePipelineState';

export type AssetCategory = 'environment' | 'character' | 'creature' | 'prop' | 'vehicle' | 'fx' | 'custom';

export interface SceneAsset {
  id: string;
  project_id: string;
  scene_id: string;
  name: string;
  category: AssetCategory;
  custom_category_name: string | null;
  description: string | null;
  workflow_status: AssetWorkflowStatus;
  current_sector: string | null;
  assigned_artist_id: string | null;
  assigned_vendor_id: string | null;
  planned_start_date: string | null;
  planned_delivery_date: string | null;
  actual_start_date: string | null;
  actual_delivery_date: string | null;
  progress_percentage: number;
  revision_count: number;
  concept_art_id: string | null;
  concept_approved: boolean;
  production_stage: ProductionStage;
  thumbnail_url: string | null;
  file_urls: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectorRoute {
  id: string;
  asset_category: string;
  sector_order: number;
  sector_name: string;
  department_id: string | null;
  is_required: boolean;
  estimated_days: number | null;
}

export function useSceneAssets(projectId: string | null, sceneId?: string | null) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<SceneAsset[]>([]);
  const [sectorRoutes, setSectorRoutes] = useState<SectorRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!projectId) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('scene_assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (sceneId) {
        query = query.eq('scene_id', sceneId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAssets((data || []) as SceneAsset[]);
    } catch (err) {
      console.error('Error fetching scene assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, sceneId]);

  const fetchSectorRoutes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sector_routing')
        .select('*')
        .order('asset_category')
        .order('sector_order');

      if (error) throw error;

      setSectorRoutes((data || []) as SectorRoute[]);
    } catch (err) {
      console.error('Error fetching sector routes:', err);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchSectorRoutes();
  }, [fetchAssets, fetchSectorRoutes]);

  // Create a new asset
  const createAsset = async (
    sceneId: string,
    name: string,
    category: AssetCategory,
    description?: string,
    customCategoryName?: string
  ) => {
    if (!projectId) return { success: false, error: 'No project selected' };

    try {
      const { data, error } = await supabase
        .from('scene_assets')
        .insert({
          project_id: projectId,
          scene_id: sceneId,
          name,
          category,
          custom_category_name: category === 'custom' ? customCategoryName : null,
          description,
          workflow_status: 'not_started',
          production_stage: 'pre_production',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAssets();
      return { success: true, data: data as SceneAsset };
    } catch (err) {
      console.error('Error creating asset:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create asset' };
    }
  };

  // Update asset status
  const updateAssetStatus = async (
    assetId: string,
    status: AssetWorkflowStatus,
    currentSector?: string
  ) => {
    try {
      const updateData: Partial<SceneAsset> = {
        workflow_status: status,
      };

      if (currentSector) {
        updateData.current_sector = currentSector;
      }

      // If starting work, set actual start date
      if (status === 'in_progress') {
        updateData.actual_start_date = new Date().toISOString().split('T')[0];
      }

      // If approved/locked, set actual delivery date
      if (status === 'approved' || status === 'locked') {
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('scene_assets')
        .update(updateData)
        .eq('id', assetId);

      if (error) throw error;

      await fetchAssets();
      return { success: true };
    } catch (err) {
      console.error('Error updating asset status:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update status' };
    }
  };

  // Update asset progress
  const updateAssetProgress = async (assetId: string, progress: number) => {
    try {
      const { error } = await supabase
        .from('scene_assets')
        .update({ progress_percentage: Math.min(100, Math.max(0, progress)) })
        .eq('id', assetId);

      if (error) throw error;

      await fetchAssets();
      return { success: true };
    } catch (err) {
      console.error('Error updating asset progress:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update progress' };
    }
  };

  // Assign artist to asset
  const assignArtist = async (assetId: string, artistId: string | null) => {
    try {
      const { error } = await supabase
        .from('scene_assets')
        .update({ assigned_artist_id: artistId })
        .eq('id', assetId);

      if (error) throw error;

      await fetchAssets();
      return { success: true };
    } catch (err) {
      console.error('Error assigning artist:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to assign artist' };
    }
  };

  // Set planned dates
  const setPlannedDates = async (
    assetId: string,
    startDate: string | null,
    deliveryDate: string | null
  ) => {
    try {
      const { error } = await supabase
        .from('scene_assets')
        .update({
          planned_start_date: startDate,
          planned_delivery_date: deliveryDate,
        })
        .eq('id', assetId);

      if (error) throw error;

      await fetchAssets();
      return { success: true };
    } catch (err) {
      console.error('Error setting planned dates:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to set dates' };
    }
  };

  // Link concept art
  const linkConceptArt = async (assetId: string, conceptArtId: string | null) => {
    try {
      const { error } = await supabase
        .from('scene_assets')
        .update({ concept_art_id: conceptArtId })
        .eq('id', assetId);

      if (error) throw error;

      await fetchAssets();
      return { success: true };
    } catch (err) {
      console.error('Error linking concept art:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to link concept art' };
    }
  };

  // Advance to next sector
  const advanceToNextSector = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return { success: false, error: 'Asset not found' };

    const routes = sectorRoutes.filter(r => r.asset_category === asset.category);
    const currentIndex = routes.findIndex(r => r.sector_name === asset.current_sector);
    
    if (currentIndex < routes.length - 1) {
      const nextSector = routes[currentIndex + 1];
      return updateAssetStatus(assetId, 'not_started', nextSector.sector_name);
    } else {
      // Final sector complete - mark as approved
      return updateAssetStatus(assetId, 'approved');
    }
  };

  // Delete asset
  const deleteAsset = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('scene_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      await fetchAssets();
      return { success: true };
    } catch (err) {
      console.error('Error deleting asset:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete asset' };
    }
  };

  // Get assets by category
  const getAssetsByCategory = (category: AssetCategory) => {
    return assets.filter(a => a.category === category);
  };

  // Get sector route for asset
  const getAssetSectorRoute = (category: AssetCategory) => {
    return sectorRoutes.filter(r => r.asset_category === category).sort((a, b) => a.sector_order - b.sector_order);
  };

  return {
    assets,
    sectorRoutes,
    isLoading,
    error,
    createAsset,
    updateAssetStatus,
    updateAssetProgress,
    assignArtist,
    setPlannedDates,
    linkConceptArt,
    advanceToNextSector,
    deleteAsset,
    getAssetsByCategory,
    getAssetSectorRoute,
    refetch: fetchAssets,
  };
}
