/**
 * Generation Job Rate Limiter
 * 
 * Frontend guard that checks current job counts before submitting.
 * Actual enforcement happens at DB level via check functions.
 */

import { useJobStore } from '@/stores/jobStore';

export interface RateLimitConfig {
  maxConcurrentPerProject: number;
  maxQueuedPerUser: number;
}

const DEFAULT_LIMITS: RateLimitConfig = {
  maxConcurrentPerProject: 5,
  maxQueuedPerUser: 10,
};

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  currentProcessing: number;
  currentQueued: number;
}

/**
 * Check if a new generation job can be submitted.
 * Returns whether the request is allowed and why not if blocked.
 */
export function checkRateLimit(
  projectId: string,
  userId?: string,
  limits: RateLimitConfig = DEFAULT_LIMITS,
): RateLimitResult {
  const jobs = Array.from(useJobStore.getState().activeJobs.values());
  const projectJobs = jobs.filter(j => j.project_id === projectId);

  const processing = projectJobs.filter(j => j.status === 'processing').length;
  const queued = projectJobs.filter(j => j.status === 'queued').length;

  if (processing >= limits.maxConcurrentPerProject) {
    return {
      allowed: false,
      reason: `Maximum ${limits.maxConcurrentPerProject} concurrent jobs per project. Please wait for a running job to complete.`,
      currentProcessing: processing,
      currentQueued: queued,
    };
  }

  if (userId) {
    const userQueued = projectJobs.filter(
      j => j.created_by === userId && j.status === 'queued'
    ).length;
    if (userQueued >= limits.maxQueuedPerUser) {
      return {
        allowed: false,
        reason: `Maximum ${limits.maxQueuedPerUser} queued jobs per user. Please wait for some jobs to process.`,
        currentProcessing: processing,
        currentQueued: queued,
      };
    }
  }

  return {
    allowed: true,
    currentProcessing: processing,
    currentQueued: queued,
  };
}

/**
 * Get job priority based on user role.
 * Directors get higher priority.
 */
export function getJobPriority(userRole?: string): number {
  switch (userRole) {
    case 'super_user':
    case 'director':
      return 10;
    case 'producer':
    case 'hod':
      return 7;
    case 'art_director':
    case 'department_head':
      return 5;
    default:
      return 1;
  }
}
