import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/lib/api';

/**
 * Hook to fetch only projects assigned to the current user based on their role.
 * Directors/Art Directors: only assigned projects
 * Script Supervisors/Admins/Producers: all projects
 * Regular users: only assigned projects
 */
export function useAssignedProjects() {
  return useQuery({
    queryKey: ['assigned-projects'],
    queryFn: getProjects,
  });
}
