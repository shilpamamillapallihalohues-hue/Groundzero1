import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Palette, Image, Clock, Film, Search, Loader2, User, Package, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectContext } from '@/contexts/ProjectContext';
import { FullscreenConceptReview } from '@/components/director/FullscreenConceptReview';
import { toast } from 'sonner';

export default function DirectorConceptReview() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAsset, setFilterAsset] = useState('all');
  const [selectedConceptIndex, setSelectedConceptIndex] = useState<number>(-1);
  const [popupOpen, setPopupOpen] = useState(false);

  // Fetch only assigned projects for director - with caching
  const { data: projects } = useQuery({
    queryKey: ['director-assigned-projects-concepts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get projects assigned to director
      const client = supabase as any;
      const { data: assignments } = await client
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = (assignments || []).map((a: any) => a.project_id);

      if (projectIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Auto-select first project if none selected
  useMemo(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  // Fetch concepts pending director approval - optimized select
  const { data: concepts, isLoading } = useQuery({
    queryKey: ['director-concept-review', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, description, concept_type, art_style, status, is_approved, director_approved, created_at, project_id, scene_id, prompt')
        .eq('project_id', selectedProjectId)
        .eq('director_approved', false)
        .not('image_url', 'is', null)
        .not('status', 'in', '("approved","rejected")')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch scenes for runtime calculation - with caching
  const { data: scenes } = useQuery({
    queryKey: ['director-scenes-runtime', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location, estimated_duration')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - scenes don't change often
  });

  // Extract unique asset names from scenes for the filter dropdown
  const assetOptions = useMemo(() => {
    const assets: { name: string; type: 'character' | 'prop' | 'environment' }[] = [];
    const seenNames = new Set<string>();

    scenes?.forEach(scene => {
      // Characters
      if (scene.characters) {
        const chars = Array.isArray(scene.characters) 
          ? scene.characters 
          : String(scene.characters).split(',').map(c => c.trim());
        chars.forEach(char => {
          const normalized = char.toLowerCase();
          if (char && !seenNames.has(normalized)) {
            seenNames.add(normalized);
            assets.push({ name: char, type: 'character' });
          }
        });
      }
      
      // Props
      if (scene.props) {
        const props = Array.isArray(scene.props) 
          ? scene.props 
          : String(scene.props).split(',').map(p => p.trim());
        props.forEach(prop => {
          const normalized = prop.toLowerCase();
          if (prop && !seenNames.has(normalized)) {
            seenNames.add(normalized);
            assets.push({ name: prop, type: 'prop' });
          }
        });
      }
      
      // Locations
      if (scene.location) {
        const normalized = scene.location.toLowerCase();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          assets.push({ name: scene.location, type: 'environment' });
        }
      }
    });

    return assets.sort((a, b) => a.name.localeCompare(b.name));
  }, [scenes]);

  // Filtered asset options based on selected category
  const filteredAssetOptions = useMemo(() => {
    if (filterCategory === 'all') return assetOptions;
    return assetOptions.filter(a => a.type === filterCategory);
  }, [assetOptions, filterCategory]);

  // Calculate asset runtime and scene presence
  const assetStats = useMemo(() => {
    const stats: Record<string, { sceneCount: number; totalRuntime: number; scenes: string[] }> = {};
    
    scenes?.forEach(scene => {
      const duration = scene.estimated_duration || 2;
      
      // Characters
      if (scene.characters) {
        const chars = Array.isArray(scene.characters) 
          ? scene.characters 
          : String(scene.characters).split(',').map(c => c.trim());
        chars.forEach(char => {
          if (!stats[char]) stats[char] = { sceneCount: 0, totalRuntime: 0, scenes: [] };
          stats[char].sceneCount++;
          stats[char].totalRuntime += duration;
          stats[char].scenes.push(scene.slugline || `Scene ${scene.scene_number}`);
        });
      }
      
      // Props
      if (scene.props) {
        const props = Array.isArray(scene.props) 
          ? scene.props 
          : String(scene.props).split(',').map(p => p.trim());
        props.forEach(prop => {
          if (!stats[prop]) stats[prop] = { sceneCount: 0, totalRuntime: 0, scenes: [] };
          stats[prop].sceneCount++;
          stats[prop].totalRuntime += duration;
          stats[prop].scenes.push(scene.slugline || `Scene ${scene.scene_number}`);
        });
      }
      
      // Locations
      if (scene.location) {
        if (!stats[scene.location]) stats[scene.location] = { sceneCount: 0, totalRuntime: 0, scenes: [] };
        stats[scene.location].sceneCount++;
        stats[scene.location].totalRuntime += duration;
        stats[scene.location].scenes.push(scene.slugline || `Scene ${scene.scene_number}`);
      }
    });
    
    return stats;
  }, [scenes]);

  // Filter concepts
  const filteredConcepts = useMemo(() => {
    let result = concepts || [];
    
    if (searchQuery) {
      result = result.filter(c => 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.concept_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterCategory !== 'all') {
      result = result.filter(c => c.concept_type === filterCategory);
    }

    // Filter by specific asset name
    if (filterAsset !== 'all') {
      result = result.filter(c => 
        c.title?.toLowerCase() === filterAsset.toLowerCase()
      );
    }
    
    return result;
  }, [concepts, searchQuery, filterCategory, filterAsset]);

  // Reset asset filter when category changes
  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    setFilterAsset('all');
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          director_approved: true, 
          director_approved_at: new Date().toISOString(),
          status: 'approved',
          review_status: 'approved'
        })
        .eq('id', conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concept approved');
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      setPopupOpen(false);
    },
    onError: () => toast.error('Failed to approve concept'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          director_approved: false, 
          status: 'revision_requested',
          review_status: 'revision_requested'
        })
        .eq('id', conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Revision requested');
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      setPopupOpen(false);
    },
    onError: () => toast.error('Failed to request revision'),
  });

  const handleConceptClick = (index: number) => {
    setSelectedConceptIndex(index);
    setPopupOpen(true);
  };

  // Get current concept with stats
  const currentConcept = selectedConceptIndex >= 0 && filteredConcepts[selectedConceptIndex]
    ? {
        ...filteredConcepts[selectedConceptIndex],
        stats: assetStats[filteredConcepts[selectedConceptIndex].title] || { sceneCount: 0, totalRuntime: 0, scenes: [] }
      }
    : null;

  // All concepts with stats for navigation
  const conceptsWithStats = filteredConcepts.map(c => ({
    ...c,
    stats: assetStats[c.title] || { sceneCount: 0, totalRuntime: 0, scenes: [] }
  }));

  if (isLoading && selectedProjectId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]">
              <Film className="h-4 w-4 mr-2" />
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
          
          {selectedProjectId && (
            <Badge variant={filteredConcepts.length > 0 ? 'destructive' : 'secondary'}>
              {filteredConcepts.length} pending
            </Badge>
          )}
        </div>

        {selectedProjectId && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search concepts..."
                className="pl-9 w-[180px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="character">
                  <span className="flex items-center gap-2">
                    <User className="h-3 w-3" /> Characters
                  </span>
                </SelectItem>
                <SelectItem value="prop">
                  <span className="flex items-center gap-2">
                    <Package className="h-3 w-3" /> Props
                  </span>
                </SelectItem>
                <SelectItem value="environment">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Environments
                  </span>
                </SelectItem>
                <SelectItem value="costume">Costumes</SelectItem>
                <SelectItem value="vehicle">Vehicles</SelectItem>
                <SelectItem value="creature">Creatures</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Asset Name Filter - Populated from project breakdown */}
            <Select value={filterAsset} onValueChange={setFilterAsset}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {filteredAssetOptions.map(asset => (
                  <SelectItem key={asset.name} value={asset.name}>
                    <span className="flex items-center gap-2">
                      {asset.type === 'character' && <User className="h-3 w-3 text-blue-500" />}
                      {asset.type === 'prop' && <Package className="h-3 w-3 text-amber-500" />}
                      {asset.type === 'environment' && <MapPin className="h-3 w-3 text-green-500" />}
                      {asset.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters button */}
            {(filterCategory !== 'all' || filterAsset !== 'all' || searchQuery) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterCategory('all');
                  setFilterAsset('all');
                  setSearchQuery('');
                }}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedProjectId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Director Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredConcepts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredConcepts.map((concept, index) => {
                  const stats = assetStats[concept.title] || { sceneCount: 0, totalRuntime: 0 };
                  return (
                    <Card 
                      key={concept.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                      onClick={() => handleConceptClick(index)}
                    >
                      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative">
                        {concept.image_url ? (
                          <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                        ) : (
                          <Image className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <CardContent className="p-3 space-y-2">
                        <p className="font-medium text-sm truncate">{concept.title}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">{concept.concept_type}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{concept.art_style}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            {stats.sceneCount} scenes
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {stats.totalRuntime}min
                          </span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectMutation.mutate(concept.id);
                            }}
                            disabled={rejectMutation.isPending}
                          >
                            {rejectMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            Revise
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              approveMutation.mutate(concept.id);
                            }}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No concepts pending review</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Select a Project</h3>
            <p className="text-sm text-muted-foreground">Choose a project to review concepts</p>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Review */}
      <FullscreenConceptReview
        open={popupOpen}
        onOpenChange={(open) => {
          setPopupOpen(open);
          if (!open) setSelectedConceptIndex(-1);
        }}
        concept={currentConcept}
        concepts={conceptsWithStats}
        currentIndex={selectedConceptIndex}
        onNavigate={setSelectedConceptIndex}
      />
    </div>
  );
}
