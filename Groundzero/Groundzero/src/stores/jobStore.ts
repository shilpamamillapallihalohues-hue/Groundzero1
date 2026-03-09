import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobType = 'concept_art' | 'storyboard' | 'shot_generation' | 'visual_analysis' | 'reference_extraction';

export interface GenerationJob {
  id: string;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  project_id: string;
  input_data: Record<string, any>;
  output_data: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
}

interface JobState {
  activeJobs: Map<string, GenerationJob>;
  completedJobIds: Set<string>;

  addJob: (job: GenerationJob) => void;
  updateJob: (id: string, updates: Partial<GenerationJob>) => void;
  removeJob: (id: string) => void;
  getJobsByType: (type: JobType) => GenerationJob[];
  getJobsByProject: (projectId: string) => GenerationJob[];
  subscribeToJobs: (projectId: string) => () => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  activeJobs: new Map(),
  completedJobIds: new Set(),

  addJob: (job) => {
    set((state) => {
      const newMap = new Map(state.activeJobs);
      newMap.set(job.id, job);
      return { activeJobs: newMap };
    });
  },

  updateJob: (id, updates) => {
    set((state) => {
      const existing = state.activeJobs.get(id);
      if (!existing) return state;
      const newMap = new Map(state.activeJobs);
      newMap.set(id, { ...existing, ...updates });
      const newCompleted = new Set(state.completedJobIds);
      if (updates.status === 'completed' || updates.status === 'failed') {
        newCompleted.add(id);
      }
      return { activeJobs: newMap, completedJobIds: newCompleted };
    });
  },

  removeJob: (id) => {
    set((state) => {
      const newMap = new Map(state.activeJobs);
      newMap.delete(id);
      return { activeJobs: newMap };
    });
  },

  getJobsByType: (type) => {
    return Array.from(get().activeJobs.values()).filter(j => j.job_type === type);
  },

  getJobsByProject: (projectId) => {
    return Array.from(get().activeJobs.values()).filter(j => j.project_id === projectId);
  },

  subscribeToJobs: (projectId: string) => {
    const channel = supabase
      .channel(`generation-jobs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_jobs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const job = payload.new as GenerationJob;
          if (payload.eventType === 'DELETE') {
            get().removeJob((payload.old as any).id);
          } else {
            if (get().activeJobs.has(job.id)) {
              get().updateJob(job.id, job);
            } else {
              get().addJob(job);
            }
          }
        }
      )
      .subscribe();

    // Load existing active jobs via REST (table not in generated types yet)
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/generation_jobs?project_id=eq.${projectId}&status=in.(queued,processing)&order=created_at.desc&limit=50`;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        }
      })
        .then(r => r.json())
        .then((data: GenerationJob[]) => {
          if (Array.isArray(data)) {
            data.forEach(job => get().addJob(job));
          }
        })
        .catch(console.error);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
