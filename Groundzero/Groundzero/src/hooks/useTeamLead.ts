import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTeamLead() {
  const { user, isLoading: authLoading } = useAuth();
  const [isTeamLead, setIsTeamLead] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsTeamLead(false);
      setDepartmentId(null);
      setDepartmentName(null);
      setIsLoading(false);
      return;
    }

    const checkTeamLead = async () => {
      try {
        // First get the profile id for this user
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile) {
          setIsTeamLead(false);
          setIsLoading(false);
          return;
        }

        // Check if this profile is a team lead for any department
        const { data: dept, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .eq('team_lead_id', profile.id)
          .maybeSingle();

        if (deptError) {
          console.error('Error checking team lead status:', deptError);
          setIsTeamLead(false);
        } else if (dept) {
          setIsTeamLead(true);
          setDepartmentId(dept.id);
          setDepartmentName(dept.name);
        } else {
          setIsTeamLead(false);
          setDepartmentId(null);
          setDepartmentName(null);
        }
      } catch (err) {
        console.error('Error in checkTeamLead:', err);
        setIsTeamLead(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTeamLead();
  }, [user, authLoading]);

  return { isTeamLead, departmentId, departmentName, isLoading };
}