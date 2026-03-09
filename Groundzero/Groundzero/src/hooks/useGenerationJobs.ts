import { useEffect } from 'react';
import { useJobStore, type GenerationJob, type JobType } from '@/stores/jobStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { checkRateLimit, getJobPriority } from '@/lib/rateLimiter';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook to submit and track generation jobs.
 * Jobs run asynchronously - the UI never blocks waiting for AI generation.
 */
export function useGenerationJobs(projectId: string) {
  const store = useJobStore();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  // Subscribe to real-time job updates
  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = store.subscribeToJobs(projectId);
    return unsubscribe;
  }, [projectId]);

  // Show toast notifications for completed/failed jobs and do targeted invalidation
  useEffect(() => {
    store.completedJobIds.forEach((id) => {
      const job = store.activeJobs.get(id);
      if (!job) return;
      if (job.status === 'completed') {
        toast.success(`${formatJobType(job.job_type)} completed`);
        invalidateForJob(job, queryClient);
      } else if (job.status === 'failed') {
        toast.error(`${formatJobType(job.job_type)} failed: ${job.error_message || 'Unknown error'}`);
      }
    });
  }, [store.completedJobIds.size]);

  const submitJob = async (
    jobType: JobType,
    inputData: Record<string, any>,
    profileId?: string
  ): Promise<string | null> => {
    try {
      // Rate limit check (frontend guard)
      const limitResult = checkRateLimit(projectId, profileId);
      if (!limitResult.allowed) {
        toast.warning(limitResult.reason || 'Rate limit exceeded');
        return null;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/generation_jobs`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate content');
        return null;
      }

      const priority = getJobPriority(profile?.role);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          job_type: jobType,
          project_id: projectId,
          input_data: inputData,
          created_by: profileId || null,
          priority,
        }),
      });

      if (!response.ok) throw new Error('Failed to create job');
      const [job] = await response.json();

      store.addJob(job as GenerationJob);
      toast.info(`${formatJobType(jobType)} queued - running in background`);
      return job.id;
    } catch (error) {
      console.error('Failed to submit job:', error);
      toast.error('Failed to queue generation job');
      return null;
    }
  };

  return {
    submitJob,
    activeJobs: store.getJobsByProject(projectId),
    getJobsByType: store.getJobsByType,
  };
}

function formatJobType(type: JobType): string {
  const map: Record<JobType, string> = {
    concept_art: 'Concept Art Generation',
    storyboard: 'Storyboard Generation',
    shot_generation: 'Shot Generation',
    visual_analysis: 'Visual Analysis',
    reference_extraction: 'Reference Extraction',
  };
  return map[type] || type;
}

/**
 * Targeted invalidation: only invalidate the specific asset/scene
 * instead of refetching entire collections.
 */
function invalidateForJob(job: GenerationJob, queryClient: ReturnType<typeof useQueryClient>) {
  const sceneId = job.input_data?.sceneId;
  const projectId = job.project_id;

  // Always invalidate the type-level cache
  const keyMap: Record<JobType, string[]> = {
    concept_art: ['concept-arts'],
    storyboard: ['storyboards'],
    shot_generation: ['storyboards', 'shots'],
    visual_analysis: ['visual-analysis'],
    reference_extraction: ['references'],
  };

  (keyMap[job.job_type] || []).forEach(key => {
    // Invalidate project-scoped queries
    queryClient.invalidateQueries({ queryKey: [key, projectId] });
    // Invalidate scene-scoped queries if applicable
    if (sceneId) {
      queryClient.invalidateQueries({ queryKey: [key, sceneId] });
    }
  });

  // Also refresh visual memory cache
  queryClient.invalidateQueries({ queryKey: ['visual-memory', projectId] });
}
