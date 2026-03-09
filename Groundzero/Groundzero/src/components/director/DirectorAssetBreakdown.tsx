import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, User, MapPin, Car, Clock, Film, Clapperboard
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface DirectorAssetBreakdownProps {
  selectedProjectId: string | null;
}

type AssetCategory = 'character' | 'prop' | 'environment' | 'vehicle';

const ASSET_CATEGORIES: { key: AssetCategory; label: string; icon: React.ElementType }[] = [
  { key: 'character', label: 'Characters', icon: User },
  { key: 'prop', label: 'Props', icon: Package },
  { key: 'environment', label: 'Environments', icon: MapPin },
  { key: 'vehicle', label: 'Vehicles', icon: Car },
];

interface SceneAsset {
  id: string;
  name: string;
  category: string;
  description: string | null;
  thumbnail_url: string | null;
  workflow_status: string | null;
  scene_id: string;
  scenes?: { scene_number: string | null; estimated_duration: number | null } | null;
}

interface SceneData {
  id: string;
  scene_number: string | null;
  slugline: string | null;
  characters: string[] | null;
  props: string[] | null;
  location: string | null;
  estimated_duration: number | null;
}

interface AggregatedAsset {
  name: string;
  category: string;
  description: string | null;
  sceneIds: string[];
  sceneNumbers: string[];
}

export function DirectorAssetBreakdown({ selectedProjectId }: DirectorAssetBreakdownProps) {
  const [activeTab, setActiveTab] = useState<AssetCategory>('character');

  // Fetch scene_assets for the selected project
  const { data: sceneAssets, isLoading: assetsLoading } = useQuery({
    queryKey: ['director-scene-assets-breakdown', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scene_assets')
        .select(`
          id, name, category, description, thumbnail_url, workflow_status, scene_id,
          scenes(scene_number, estimated_duration)
        `)
        .eq('project_id', selectedProjectId)
        .order('name');
      if (error) throw error;
      return (data || []) as SceneAsset[];
    },
    enabled: !!selectedProjectId
  });

  // Fetch scenes for the project
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['director-scenes-breakdown', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location, estimated_duration')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return (data || []) as SceneData[];
    },
    enabled: !!selectedProjectId
  });

  // Fetch shots for the project
  const { data: shots } = useQuery({
    queryKey: ['director-shots-breakdown', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('shots')
        .select('id, shot_code, scene_id, frame_start, frame_end, status')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Derive assets from scenes if scene_assets is empty
  const derivedAssets = useMemo(() => {
    if (sceneAssets && sceneAssets.length > 0) return null;
    if (!scenes || scenes.length === 0) return null;

    const assetMap = new Map<string, AggregatedAsset>();

    scenes.forEach((scene) => {
      if (scene.characters && scene.characters.length > 0) {
        scene.characters.forEach((character) => {
          const key = `character:${character}`;
          const existing = assetMap.get(key);
          if (existing) {
            if (!existing.sceneIds.includes(scene.id)) {
              existing.sceneIds.push(scene.id);
              if (scene.scene_number) existing.sceneNumbers.push(scene.scene_number);
            }
          } else {
            assetMap.set(key, {
              name: character,
              category: 'character',
              description: character,
              sceneIds: [scene.id],
              sceneNumbers: scene.scene_number ? [scene.scene_number] : []
            });
          }
        });
      }

      if (scene.props && scene.props.length > 0) {
        scene.props.forEach((prop) => {
          const key = `prop:${prop}`;
          const existing = assetMap.get(key);
          if (existing) {
            if (!existing.sceneIds.includes(scene.id)) {
              existing.sceneIds.push(scene.id);
              if (scene.scene_number) existing.sceneNumbers.push(scene.scene_number);
            }
          } else {
            assetMap.set(key, {
              name: prop,
              category: 'prop',
              description: prop,
              sceneIds: [scene.id],
              sceneNumbers: scene.scene_number ? [scene.scene_number] : []
            });
          }
        });
      }

      if (scene.location) {
        const key = `environment:${scene.location}`;
        const existing = assetMap.get(key);
        if (existing) {
          if (!existing.sceneIds.includes(scene.id)) {
            existing.sceneIds.push(scene.id);
            if (scene.scene_number) existing.sceneNumbers.push(scene.scene_number);
          }
        } else {
          assetMap.set(key, {
            name: scene.location,
            category: 'environment',
            description: scene.slugline || `Location from script`,
            sceneIds: [scene.id],
            sceneNumbers: scene.scene_number ? [scene.scene_number] : []
          });
        }
      }
    });

    return Array.from(assetMap.values());
  }, [scenes, sceneAssets]);

  // Get assets by category
  const getAssetsByCategory = (category: AssetCategory): AggregatedAsset[] => {
    if (sceneAssets && sceneAssets.length > 0) {
      const categoryAssets = sceneAssets.filter(a => a.category === category);
      
      const assetMap = new Map<string, AggregatedAsset>();

      categoryAssets.forEach(asset => {
        const existing = assetMap.get(asset.name);
        if (existing) {
          if (!existing.sceneIds.includes(asset.scene_id)) {
            existing.sceneIds.push(asset.scene_id);
            if (asset.scenes?.scene_number) {
              existing.sceneNumbers.push(asset.scenes.scene_number);
            }
          }
        } else {
          assetMap.set(asset.name, {
            name: asset.name,
            category: asset.category,
            description: asset.description,
            sceneIds: [asset.scene_id],
            sceneNumbers: asset.scenes?.scene_number ? [asset.scenes.scene_number] : []
          });
        }
      });

      return Array.from(assetMap.values());
    }

    if (derivedAssets) {
      return derivedAssets.filter(a => a.category === category);
    }

    return [];
  };

  const getShotCountForScenes = (sceneIds: string[]) => {
    return shots?.filter(s => sceneIds.includes(s.scene_id)).length || 0;
  };

  const getEstimatedRuntimeForScenes = (sceneIds: string[]) => {
    const linkedScenes = scenes?.filter(s => sceneIds.includes(s.id)) || [];
    
    let totalSeconds = 0;
    linkedScenes.forEach(scene => {
      if (scene.estimated_duration) {
        if (typeof scene.estimated_duration === 'number') {
          totalSeconds += scene.estimated_duration;
        }
      }
    });
    
    if (totalSeconds === 0) return 'N/A';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const isLoading = assetsLoading || scenesLoading;

  const currentAssets = getAssetsByCategory(activeTab);

  if (!selectedProjectId) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Film className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
          <p className="text-muted-foreground">Choose a project to view the complete asset breakdown</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Category Tabs - No VFX */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssetCategory)}>
          <TabsList className="mb-4 w-full justify-start">
            {ASSET_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = getAssetsByCategory(cat.key).length;
              return (
                <TabsTrigger key={cat.key} value={cat.key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {ASSET_CATEGORIES.map(cat => (
            <TabsContent key={cat.key} value={cat.key}>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clapperboard className="h-3.5 w-3.5" />
                          <span>Scenes</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Est. Runtime</span>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No {cat.label.toLowerCase()} found in this project
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentAssets.map((asset, idx) => (
                        <TableRow key={`${asset.name}-${idx}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-muted">
                                <cat.icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{asset.name}</p>
                                {asset.description && asset.description !== asset.name && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {asset.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {asset.sceneIds.length} scene{asset.sceneIds.length !== 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm text-muted-foreground">
                              {getEstimatedRuntimeForScenes(asset.sceneIds)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
