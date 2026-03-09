import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useProductionRole } from '@/hooks/useProductionRole';
import { useUserSpecificRoles } from '@/hooks/useUserSpecificRoles';
import { SuperUserDashboard } from './SuperUserDashboard';
import { ProducerDashboard } from './ProducerDashboard';
import { DirectorDashboard } from './DirectorDashboard';
import { ProductionManagerDashboard } from './ProductionManagerDashboard';
import { HODDashboard } from './HODDashboard';
import { ArtistDashboard } from './ArtistDashboard';
import { VendorDashboard } from './VendorDashboard';
import { CombinedRoleDashboard } from './CombinedRoleDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDashboardForRole } from '@/types/preprodRoles';
import {
  ScriptWriterDashboard,
  ConceptArtistDashboard,
  StoryboardArtistDashboard,
  EditorDashboard,
  PrevizArtistDashboard,
  TechnicalDirectorDashboard,
  PreprodProducerDashboard,
  PreprodDirectorDashboard,
} from './preprod';
import SupervisorDashboard from '@/pages/supervisor/SupervisorDashboard';
// New Art Director Dashboard from pages
import NewArtDirectorDashboard from '@/pages/art-director/ArtDirectorDashboard';
import {
  ModelingArtistDashboard,
  TexturingArtistDashboard,
  RiggingArtistDashboard,
  AnimationArtistDashboard,
  LightingArtistDashboard,
  VFXArtistDashboard,
  RenderArtistDashboard,
  ProductionLeadDashboard,
} from './production';

// Dashboard mapping - maps dashboard type to component
const DASHBOARD_COMPONENTS: Record<string, React.ComponentType> = {
  // Pre-Production dashboards
  script_writer: ScriptWriterDashboard,
  // IMPORTANT: Use the new supervisor dashboard (with script upload) and avoid the legacy one.
  script_supervisor: SupervisorDashboard,
  concept_artist: ConceptArtistDashboard,
  art_director: NewArtDirectorDashboard,
  storyboard_artist: StoryboardArtistDashboard,
  storyboard_supervisor: StoryboardArtistDashboard,
  editor: EditorDashboard,
  editorial_supervisor: EditorDashboard,
  previz_artist: PrevizArtistDashboard,
  technical_director: TechnicalDirectorDashboard,
  
  // Production dashboards
  modeling_artist: ModelingArtistDashboard,
  texturing_artist: TexturingArtistDashboard,
  rigging_artist: RiggingArtistDashboard,
  animation_artist: AnimationArtistDashboard,
  lighting_artist: LightingArtistDashboard,
  vfx_artist: VFXArtistDashboard,
  render_artist: RenderArtistDashboard,
  production_lead: ProductionLeadDashboard,
  
  // Management dashboards
  super_user: SuperUserDashboard,
  producer: ProducerDashboard,
  director: DirectorDashboard,
  production_manager: ProductionManagerDashboard,
  hod: HODDashboard,
  vendor: VendorDashboard,
  client: VendorDashboard, // Clients use vendor-like view
  artist: ArtistDashboard, // Default fallback
};

export function RoleDashboardRouter() {
  const navigate = useNavigate();
  const { role, isLoading, isClient } = useProductionRole();
  const { roles: userSpecificRoles, mergedInfo, isLoading: rolesLoading } = useUserSpecificRoles();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['current-user-profile-router'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('phase, specific_role, role')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isLoading && isClient) {
      navigate('/client');
    }
  }, [isLoading, isClient, navigate]);

  if (isLoading || profileLoading || rolesLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (isClient) return null;

  // PRIORITY 1: Check for multiple roles in user_specific_roles table
  if (userSpecificRoles.length > 1) {
    return <CombinedRoleDashboard mergedInfo={mergedInfo} />;
  }

  // PRIORITY 2: Check user_specific_roles table for single role
  if (userSpecificRoles.length === 1) {
    const dashboardType = getDashboardForRole(userSpecificRoles[0].specific_role);
    const DashboardComponent = DASHBOARD_COMPONENTS[dashboardType];
    if (DashboardComponent) {
      return <DashboardComponent />;
    }
  }

  const specificRole = profile?.specific_role || '';
  const phase = profile?.phase || '';

  // PRIORITY 3: Route based on specific_role from profile using getDashboardForRole
  if (specificRole) {
    const dashboardType = getDashboardForRole(specificRole);
    const DashboardComponent = DASHBOARD_COMPONENTS[dashboardType];
    
    if (DashboardComponent) {
      return <DashboardComponent />;
    }
  }

  // PRIORITY 4: Route based on phase for management roles
  if (phase === 'Pre-Production' || phase === 'pre_production') {
    if (role === 'producer') return <PreprodProducerDashboard />;
    if (role === 'director') return <PreprodDirectorDashboard />;
  }

  // PRIORITY 5: Default role-based dashboards (for management/non-department roles)
  // Director uses DirectorDashboard component (will redirect to proper review home)
  if (role === 'director') {
    return <DirectorDashboard />;
  }
  
  switch (role) {
    case 'super_user':
      return <SuperUserDashboard />;
    case 'producer':
      return <ProducerDashboard />;
    case 'production_manager':
      return <ProductionManagerDashboard />;
    case 'hod':
    case 'department_head':
      return <HODDashboard />;
    case 'vendor':
      return <VendorDashboard />;
    case 'artist':
    default:
      // For generic "artist" role without specific_role, show production artist dashboard
      return <ArtistDashboard />;
  }
}