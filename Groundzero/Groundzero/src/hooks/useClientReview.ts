import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ClientReviewSession {
  id: string;
  project_id: string;
  client_id: string;
  scene_id: string | null;
  shot_id: string | null;
  asset_id: string | null;
  review_type: 'project' | 'scene' | 'shot' | 'asset';
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ClientReviewComment {
  id: string;
  review_session_id: string;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  asset_id: string | null;
  version_id: string | null;
  client_id: string;
  comment_text: string;
  timestamp_marker: number | null;
  frame_number: number | null;
  annotation_data: Record<string, unknown> | null;
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface ClientApproval {
  id: string;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  asset_id: string | null;
  version_id: string | null;
  client_id: string;
  decision: 'approved' | 'changes_required' | 'rejected';
  notes: string | null;
  reviewed_at: string;
  created_at: string;
}

export interface AssetVersion {
  id: string;
  asset_id: string;
  scene_id: string | null;
  project_id: string;
  version_number: number;
  file_url: string | null;
  thumbnail_url: string | null;
  file_hash: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  upload_notes: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useClientReview(projectId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch projects assigned to client
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['client-projects', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // Fetch scenes for a project
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['client-scenes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch storyboards (shots) for review - storyboards link to scenes, not projects
  const { data: shots, isLoading: shotsLoading } = useQuery({
    queryKey: ['client-shots', projectId, scenes],
    queryFn: async () => {
      if (!scenes || scenes.length === 0) return [];
      
      const sceneIds = scenes.map(s => s.id);
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, image_url, action, camera_angle, scene_id')
        .in('scene_id', sceneIds)
        .order('shot_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!scenes && scenes.length > 0,
  });

  // Fetch approval history
  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['client-approvals', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_approvals')
        .select(`
          *,
          profiles:client_id (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('reviewed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['client-comments', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_review_comments')
        .select(`
          *,
          profiles:client_id (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch asset versions
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['asset-versions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_versions')
        .select(`
          *,
          profiles:uploaded_by (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: {
      review_session_id: string;
      project_id: string;
      client_id: string;
      comment_text: string;
      scene_id?: string | null;
      shot_id?: string | null;
      asset_id?: string | null;
      version_id?: string | null;
      timestamp_marker?: number | null;
      frame_number?: number | null;
      annotation_data?: Record<string, unknown> | null;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('client_review_comments')
        .insert([{
          review_session_id: comment.review_session_id,
          project_id: comment.project_id,
          client_id: comment.client_id,
          comment_text: comment.comment_text,
          scene_id: comment.scene_id || null,
          shot_id: comment.shot_id || null,
          asset_id: comment.asset_id || null,
          version_id: comment.version_id || null,
          timestamp_marker: comment.timestamp_marker || null,
          frame_number: comment.frame_number || null,
          annotation_data: comment.annotation_data ? JSON.parse(JSON.stringify(comment.annotation_data)) : null,
          status: comment.status || 'pending',
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-comments', projectId] });
    },
  });

  // Submit approval mutation
  const submitApprovalMutation = useMutation({
    mutationFn: async (approval: {
      project_id: string;
      client_id: string;
      decision: 'approved' | 'changes_required' | 'rejected';
      scene_id?: string | null;
      shot_id?: string | null;
      asset_id?: string | null;
      version_id?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('client_approvals')
        .insert([{
          project_id: approval.project_id,
          client_id: approval.client_id,
          decision: approval.decision,
          scene_id: approval.scene_id || null,
          shot_id: approval.shot_id || null,
          asset_id: approval.asset_id || null,
          version_id: approval.version_id || null,
          notes: approval.notes || null,
          reviewed_at: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-approvals', projectId] });
    },
  });

  return {
    projects,
    scenes,
    shots,
    approvals,
    comments,
    versions,
    isLoading: projectsLoading || scenesLoading || shotsLoading || approvalsLoading || commentsLoading || versionsLoading,
    addComment: addCommentMutation.mutate,
    submitApproval: submitApprovalMutation.mutate,
    isSubmitting: addCommentMutation.isPending || submitApprovalMutation.isPending,
  };
}
