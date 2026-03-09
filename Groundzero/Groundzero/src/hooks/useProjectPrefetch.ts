/**
 * Smart Data Prefetching Hook
 * 
 * When mounted (e.g., on Director Dashboard), prefetches common
 * project data into React Query cache so subsequent page navigations
 * are instant.
 * 
 * Does NOT block rendering. All fetches run in the background.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProjectPrefetch(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const prefetch = async () => {
      // Prefetch scenes
      queryClient.prefetchQuery({
        queryKey: ['scenes', projectId],
        queryFn: async () => {
          const { data } = await supabase
            .from('scenes')
            .select('*')
            .eq('project_id', projectId)
            .order('scene_number', { ascending: true });
          return data ?? [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      });

      // Prefetch concept arts
      queryClient.prefetchQuery({
        queryKey: ['concept-arts', projectId],
        queryFn: async () => {
          const { data } = await supabase
            .from('concept_arts')
            .select('id, title, image_url, concept_type, art_style, status, scene_id, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(100);
          return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch reference images
      queryClient.prefetchQuery({
        queryKey: ['references', projectId],
        queryFn: async () => {
          const { data } = await supabase
            .from('reference_images')
            .select('id, title, image_url, category, scene_id, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(100);
          return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch visual memory for continuity
      queryClient.prefetchQuery({
        queryKey: ['visual-memory', projectId],
        queryFn: async () => {
          const { data } = await supabase
            .from('visual_memory')
            .select('*')
            .eq('project_id', projectId);
          return data ?? [];
        },
        staleTime: 10 * 60 * 1000,
      });
    };

    // Run prefetch after a micro-delay to not block initial render
    const timer = setTimeout(prefetch, 100);
    return () => clearTimeout(timer);
  }, [projectId, queryClient]);
}
