import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AssetReferenceLink {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_name: string;
  target_id?: string;
  project_id: string;
  created_at: string;
}

interface LinkedAsset {
  id: string;
  title: string;
  file_url: string | null;
  thumbnail_url: string | null;
  asset_type: string;
  source_type: string;
}

/**
 * Hook to fetch all assets/references linked to a specific target (character, prop, scene, etc.)
 */
export function useAssetReferences(projectId: string, targetType: string, targetName: string) {
  const [references, setReferences] = useState<LinkedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !targetType || !targetName) {
      setReferences([]);
      setLoading(false);
      return;
    }

    loadReferences();
  }, [projectId, targetType, targetName]);

  const loadReferences = async () => {
    try {
      // Get all links for this target
      const { data: links, error: linksError } = await supabase
        .from('asset_reference_links')
        .select('*')
        .eq('project_id', projectId)
        .eq('target_type', targetType)
        .ilike('target_name', targetName);

      if (linksError) throw linksError;

      if (!links || links.length === 0) {
        setReferences([]);
        setLoading(false);
        return;
      }

      // Fetch actual assets based on source_type
      const assets: LinkedAsset[] = [];

      // Group by source_type
      const deliverableIds = links.filter(l => l.source_type === 'deliverable').map(l => l.source_id);
      const referenceIds = links.filter(l => l.source_type === 'reference_image').map(l => l.source_id);
      const conceptIds = links.filter(l => l.source_type === 'concept_art').map(l => l.source_id);

      // Fetch deliverables
      if (deliverableIds.length > 0) {
        const { data: deliverables } = await supabase
          .from('project_deliverables')
          .select('id, title, file_url, thumbnail_url, asset_type')
          .in('id', deliverableIds);

        if (deliverables) {
          assets.push(...deliverables.map(d => ({
            ...d,
            source_type: 'deliverable'
          })));
        }
      }

      // Fetch reference images
      if (referenceIds.length > 0) {
        const { data: refs } = await supabase
          .from('reference_images')
          .select('id, title, image_url, category')
          .in('id', referenceIds);

        if (refs) {
          assets.push(...refs.map(r => ({
            id: r.id,
            title: r.title,
            file_url: r.image_url,
            thumbnail_url: r.image_url,
            asset_type: r.category || 'reference',
            source_type: 'reference_image'
          })));
        }
      }

      // Fetch concept art
      if (conceptIds.length > 0) {
        const { data: concepts } = await supabase
          .from('concept_arts')
          .select('id, title, image_url, concept_type')
          .in('id', conceptIds);

        if (concepts) {
          assets.push(...concepts.map(c => ({
            id: c.id,
            title: c.title,
            file_url: c.image_url,
            thumbnail_url: c.image_url,
            asset_type: c.concept_type || 'concept',
            source_type: 'concept_art'
          })));
        }
      }

      setReferences(assets);
    } catch (error) {
      console.error('Error loading asset references:', error);
    } finally {
      setLoading(false);
    }
  };

  return { references, loading, refetch: loadReferences };
}

/**
 * Hook to fetch all references for a scene
 */
export function useSceneReferences(projectId: string, sceneId: string) {
  const [references, setReferences] = useState<LinkedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !sceneId) {
      setReferences([]);
      setLoading(false);
      return;
    }

    loadSceneReferences();
  }, [projectId, sceneId]);

  const loadSceneReferences = async () => {
    try {
      // Get scene slugline first
      const { data: scene } = await supabase
        .from('scenes')
        .select('slugline')
        .eq('id', sceneId)
        .single();

      if (!scene) {
        setReferences([]);
        setLoading(false);
        return;
      }

      // Get all links for this scene
      const { data: links } = await supabase
        .from('asset_reference_links')
        .select('*')
        .eq('project_id', projectId)
        .eq('target_type', 'scene')
        .ilike('target_name', scene.slugline);

      if (!links || links.length === 0) {
        // Also check scene_references table
        const { data: sceneRefs } = await supabase
          .from('scene_references')
          .select('*')
          .eq('scene_id', sceneId);

        if (sceneRefs && sceneRefs.length > 0) {
          setReferences(sceneRefs.map(r => ({
            id: r.id,
            title: r.title,
            file_url: r.image_url,
            thumbnail_url: r.image_url,
            asset_type: r.category || 'reference',
            source_type: 'scene_reference'
          })));
        } else {
          setReferences([]);
        }
        setLoading(false);
        return;
      }

      // Fetch actual assets
      const assets: LinkedAsset[] = [];

      const deliverableIds = links.filter(l => l.source_type === 'deliverable').map(l => l.source_id);
      const referenceIds = links.filter(l => l.source_type === 'reference_image').map(l => l.source_id);
      const conceptIds = links.filter(l => l.source_type === 'concept_art').map(l => l.source_id);

      if (deliverableIds.length > 0) {
        const { data: deliverables } = await supabase
          .from('project_deliverables')
          .select('id, title, file_url, thumbnail_url, asset_type')
          .in('id', deliverableIds);

        if (deliverables) {
          assets.push(...deliverables.map(d => ({ ...d, source_type: 'deliverable' })));
        }
      }

      if (referenceIds.length > 0) {
        const { data: refs } = await supabase
          .from('reference_images')
          .select('id, title, image_url, category')
          .in('id', referenceIds);

        if (refs) {
          assets.push(...refs.map(r => ({
            id: r.id,
            title: r.title,
            file_url: r.image_url,
            thumbnail_url: r.image_url,
            asset_type: r.category || 'reference',
            source_type: 'reference_image'
          })));
        }
      }

      if (conceptIds.length > 0) {
        const { data: concepts } = await supabase
          .from('concept_arts')
          .select('id, title, image_url, concept_type')
          .in('id', conceptIds);

        if (concepts) {
          assets.push(...concepts.map(c => ({
            id: c.id,
            title: c.title,
            file_url: c.image_url,
            thumbnail_url: c.image_url,
            asset_type: c.concept_type || 'concept',
            source_type: 'concept_art'
          })));
        }
      }

      // Also get scene_references
      const { data: sceneRefs } = await supabase
        .from('scene_references')
        .select('*')
        .eq('scene_id', sceneId);

      if (sceneRefs) {
        assets.push(...sceneRefs.map(r => ({
          id: r.id,
          title: r.title,
          file_url: r.image_url,
          thumbnail_url: r.image_url,
          asset_type: r.category || 'reference',
          source_type: 'scene_reference'
        })));
      }

      setReferences(assets);
    } catch (error) {
      console.error('Error loading scene references:', error);
    } finally {
      setLoading(false);
    }
  };

  return { references, loading, refetch: loadSceneReferences };
}
