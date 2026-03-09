import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';
import { MergedRoleInfo } from '@/hooks/useUserSpecificRoles';
import { getDashboardForRole } from '@/types/preprodRoles';
import { Skeleton } from '@/components/ui/skeleton';

// Import all dashboard components
import { SuperUserDashboard } from './SuperUserDashboard';
import { ProducerDashboard } from './ProducerDashboard';
import { DirectorDashboard } from './DirectorDashboard';
import { ProductionManagerDashboard } from './ProductionManagerDashboard';
import { HODDashboard } from './HODDashboard';
import { ArtistDashboard } from './ArtistDashboard';
import { VendorDashboard } from './VendorDashboard';
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

const DASHBOARD_COMPONENTS: Record<string, React.ComponentType> = {
  script_writer: ScriptWriterDashboard,
  script_supervisor: SupervisorDashboard,
  concept_artist: ConceptArtistDashboard,
  art_director: NewArtDirectorDashboard,
  storyboard_artist: StoryboardArtistDashboard,
  storyboard_supervisor: StoryboardArtistDashboard,
  editor: EditorDashboard,
  editorial_supervisor: EditorDashboard,
  previz_artist: PrevizArtistDashboard,
  technical_director: TechnicalDirectorDashboard,
  modeling_artist: ModelingArtistDashboard,
  texturing_artist: TexturingArtistDashboard,
  rigging_artist: RiggingArtistDashboard,
  animation_artist: AnimationArtistDashboard,
  lighting_artist: LightingArtistDashboard,
  vfx_artist: VFXArtistDashboard,
  render_artist: RenderArtistDashboard,
  production_lead: ProductionLeadDashboard,
  super_user: SuperUserDashboard,
  producer: ProducerDashboard,
  director: DirectorDashboard,
  production_manager: ProductionManagerDashboard,
  hod: HODDashboard,
  vendor: VendorDashboard,
  client: VendorDashboard,
  artist: ArtistDashboard,
};

interface CombinedRoleDashboardProps {
  mergedInfo: MergedRoleInfo;
}

function DashboardLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-20 rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

export function CombinedRoleDashboard({ mergedInfo }: CombinedRoleDashboardProps) {
  const [activeTab, setActiveTab] = useState(mergedInfo.roles[0]?.specific_role || '');

  if (mergedInfo.roles.length === 0) {
    return <ArtistDashboard />;
  }

  if (mergedInfo.roles.length === 1) {
    const dashboardType = getDashboardForRole(mergedInfo.roles[0].specific_role);
    const DashboardComponent = DASHBOARD_COMPONENTS[dashboardType] || ArtistDashboard;
    return <DashboardComponent />;
  }

  // Multiple roles - only render the ACTIVE tab's dashboard (lazy)
  const activeDashboardType = getDashboardForRole(activeTab);
  const ActiveDashboardComponent = DASHBOARD_COMPONENTS[activeDashboardType] || ArtistDashboard;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1 py-1">
            <Layers className="w-3 h-3" />
            {mergedInfo.roles.length} Roles
          </Badge>
          <TabsList className="flex-1 justify-start flex-wrap h-auto p-1 bg-muted/50">
            {mergedInfo.roles.map((role) => (
              <TabsTrigger 
                key={role.id} 
                value={role.specific_role}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
              >
                {role.specific_role.replace(/_/g, ' ')}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Only render the active dashboard - not all dashboards */}
        {mergedInfo.roles.map((role) => (
          <TabsContent key={role.id} value={role.specific_role} className="mt-0">
            {role.specific_role === activeTab && <ActiveDashboardComponent />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
