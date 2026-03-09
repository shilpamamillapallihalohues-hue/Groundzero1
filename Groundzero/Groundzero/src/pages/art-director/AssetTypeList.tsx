import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, User, Package, MapPin, Trees, Clock, Film, Image, Wand2, ChevronRight 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useMemo } from 'react';

const TYPE_CONFIG: Record<string, { 
  title: string; 
  icon: typeof User; 
  color: string; 
  bgColor: string;
  conceptType: string;
}> = {
  characters: { 
    title: 'Characters', 
    icon: User, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-500/10',
    conceptType: 'character'
  },
  props: { 
    title: 'Props', 
    icon: Package, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-500/10',
    conceptType: 'prop'
  },
  locations: { 
    title: 'Locations', 
    icon: MapPin, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-500/10',
    conceptType: 'environment'
  },
  environments: { 
    title: 'Environments', 
    icon: Trees, 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-500/10',
    conceptType: 'environment'
  },
};

export default function AssetTypeList() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();

  const config = type ? TYPE_CONFIG[type] : null;
  const Icon = config?.icon || User;

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['ad-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['ad-scenes-for-type', activeProjectId, type],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location, estimated_duration')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  const { data: conceptArts } = useQuery({
    queryKey: ['ad-concepts-by-type', activeProjectId, config?.conceptType],
    queryFn: async () => {
      if (!activeProjectId || !config) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, art_director_approved')
        .eq('project_id', activeProjectId)
        .eq('concept_type', config.conceptType as 'character' | 'costume' | 'creature' | 'environment' | 'fx_concept' | 'prop' | 'set_architecture' | 'vehicle');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId && !!config,
  });

  const assets = useMemo(() => {
    if (!scenes || !type) return [];

    const assetMap: Record<string, { 
      name: string;
      sceneCount: number;
      totalRuntime: number;
      sceneDetails: { id: string; sceneNumber: string; slugline: string; duration: number }[];
    }> = {};

    scenes.forEach(scene => {
      const duration = scene.estimated_duration || 2;
      const sceneDetail = { 
        id: scene.id, 
        sceneNumber: scene.scene_number || 'N/A',
        slugline: scene.slugline || 'Unknown', 
        duration 
      };

      let items: string[] = [];

      if (type === 'characters' && scene.characters) {
        const charData = scene.characters as string | string[];
        items = Array.isArray(charData) 
          ? charData 
          : String(charData).split(',').map(c => c.trim());
      } else if (type === 'props' && scene.props) {
        const propData = scene.props as string | string[];
        items = Array.isArray(propData) 
          ? propData 
          : String(propData).split(',').map(p => p.trim());
      } else if ((type === 'locations' || type === 'environments') && scene.location) {
        items = [scene.location];
      }

      items.forEach(item => {
        if (item) {
          if (!assetMap[item]) {
            assetMap[item] = { name: item, sceneCount: 0, totalRuntime: 0, sceneDetails: [] };
          }
          assetMap[item].sceneCount++;
          assetMap[item].totalRuntime += duration;
          assetMap[item].sceneDetails.push(sceneDetail);
        }
      });
    });

    return Object.values(assetMap).sort((a, b) => b.totalRuntime - a.totalRuntime);
  }, [scenes, type]);

  // Match concept arts to assets
  const getConceptCount = (assetName: string) => {
    return conceptArts?.filter(c => 
      c.title?.toLowerCase().includes(assetName.toLowerCase())
    ).length || 0;
  };

  if (projectsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/art-director/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <p className="mt-6 text-muted-foreground">Invalid asset type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/art-director/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{config.title}</h1>
            <p className="text-sm text-muted-foreground">
              {assets.length} items • {assets.reduce((sum, a) => sum + a.totalRuntime, 0)} min total runtime
            </p>
          </div>
        </div>

        <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[200px] md:w-[240px]">
            <Film className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Asset List */}
      {scenesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : assets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Icon className={`h-12 w-12 mx-auto mb-4 ${config.color} opacity-50`} />
            <h3 className="font-semibold mb-2">No {config.title} Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No {config.title.toLowerCase()} have been extracted from the project scenes yet.
            </p>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              Go to Projects
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assets.map((asset, idx) => {
            const conceptCount = getConceptCount(asset.name);
            
            return (
              <Card 
                key={idx} 
                className="hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/art-director/concepts/automate?type=${config.conceptType}&asset=${encodeURIComponent(asset.name)}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{asset.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            {asset.sceneCount} scene{asset.sceneCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {asset.totalRuntime} min
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {conceptCount > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          <Image className="h-3 w-3 mr-1" />
                          {conceptCount} concept{conceptCount !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No concepts
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Wand2 className="h-3.5 w-3.5" />
                        Generate
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Scene details */}
                  <div className="mt-3 pl-12">
                    <div className="flex flex-wrap gap-1.5">
                      {asset.sceneDetails.slice(0, 5).map((scene, sIdx) => (
                        <Badge key={sIdx} variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal">
                          Sc {scene.sceneNumber} ({scene.duration}m)
                        </Badge>
                      ))}
                      {asset.sceneDetails.length > 5 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          +{asset.sceneDetails.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
