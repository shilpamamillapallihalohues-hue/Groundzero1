import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, Trash2, GalleryHorizontal, Loader2, FolderOpen, Filter, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConceptArtSliderGallery } from '@/components/concept-art/ConceptArtSliderGallery';
import type { ConceptArt } from '@/types/conceptArt';
import { CONCEPT_TYPE_LABELS, ART_STYLE_LABELS } from '@/constants/conceptArtLabels';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProductionRole } from '@/hooks/useProductionRole';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';

export default function ConceptReviews() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  const { role } = useProductionRole();
  const isDirector = role === 'director';
  
  const [showSliderGallery, setShowSliderGallery] = useState(false);
  const [sliderInitialIndex, setSliderInitialIndex] = useState(0);
  const [sliderConcepts, setSliderConcepts] = useState<ConceptArt[]>([]);
  
  // Cascading filters
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [selectedAssetName, setSelectedAssetName] = useState<string>('all');

  const { data: conceptArts, isLoading, refetch } = useQuery({
    queryKey: ['concept-arts-for-review', selectedProjectId, isDirector],
    queryFn: async () => {
      let query = supabase.from('concept_arts').select('*').order('created_at', { ascending: false });
      
      // Directors only see concepts from their selected project
      if (isDirector && selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ConceptArt[];
    },
    enabled: !isDirector || !!selectedProjectId
  });

  // Fetch project assets for the second dropdown
  const { data: projectAssets } = useQuery({
    queryKey: ['project-assets-for-filter', selectedProjectId, selectedAssetType],
    queryFn: async () => {
      if (!selectedProjectId || selectedAssetType === 'all') return [];
      
      const assets: string[] = [];
      
      // Get assets from scenes based on type
      if (selectedAssetType === 'character') {
        const { data: scenes } = await supabase
          .from('scenes')
          .select('characters')
          .eq('project_id', selectedProjectId);
        
        scenes?.forEach(scene => {
          if (scene.characters && Array.isArray(scene.characters)) {
            scene.characters.forEach((char: string) => {
              if (char && !assets.includes(char)) assets.push(char);
            });
          }
        });
        
        // Also get from character_proxies
        const { data: proxies } = await supabase
          .from('character_proxies')
          .select('name')
          .eq('project_id', selectedProjectId);
        
        proxies?.forEach(p => {
          if (p.name && !assets.includes(p.name)) assets.push(p.name);
        });
      } else if (selectedAssetType === 'prop') {
        const { data: scenes } = await supabase
          .from('scenes')
          .select('props')
          .eq('project_id', selectedProjectId);
        
        scenes?.forEach(scene => {
          if (scene.props && Array.isArray(scene.props)) {
            scene.props.forEach((prop: string) => {
              if (prop && !assets.includes(prop)) assets.push(prop);
            });
          }
        });
      } else if (selectedAssetType === 'environment' || selectedAssetType === 'set_architecture') {
        const { data: scenes } = await supabase
          .from('scenes')
          .select('slugline')
          .eq('project_id', selectedProjectId);
        
        scenes?.forEach((scene: any) => {
          if (scene.slugline && !assets.includes(scene.slugline)) assets.push(scene.slugline);
        });
      }
      
      // Also get from concept_arts with matching type
      const { data: conceptArtsData } = await supabase
        .from('concept_arts')
        .select('title')
        .eq('project_id', selectedProjectId)
        .eq('concept_type', selectedAssetType as any);
      
      conceptArtsData?.forEach(c => {
        if (c.title && !assets.includes(c.title)) assets.push(c.title);
      });
      
      return assets.sort();
    },
    enabled: !!selectedProjectId && selectedAssetType !== 'all'
  });

  // Extract unique asset types from existing concepts for the first dropdown
  const assetTypeOptions = useMemo(() => {
    // Use predefined types that match the concept_art_type enum
    return ['character', 'environment', 'prop', 'costume', 'vehicle', 'creature', 'set_architecture', 'fx_concept'];
  }, []);

  // Filter concepts based on selections
  const filteredConcepts = useMemo(() => {
    if (!conceptArts) return [];
    
    return conceptArts.filter(c => {
      if (selectedAssetType !== 'all' && c.concept_type !== selectedAssetType) return false;
      if (selectedAssetName !== 'all') {
        // Match if title contains or equals the selected asset name
        const titleMatch = c.title?.toLowerCase().includes(selectedAssetName.toLowerCase());
        if (!titleMatch) return false;
      }
      return true;
    });
  }, [conceptArts, selectedAssetType, selectedAssetName]);

  // Reset asset name when type changes
  const handleAssetTypeChange = (type: string) => {
    setSelectedAssetType(type);
    setSelectedAssetName('all');
  };

  const clearFilters = () => {
    setSelectedAssetType('all');
    setSelectedAssetName('all');
  };

  const hasActiveFilters = selectedAssetType !== 'all' || selectedAssetName !== 'all';

  // Apply filters to pending and approved
  const pending = filteredConcepts.filter(c => c.review_status === 'pending' || c.review_status === 'pending_review');
  const approved = filteredConcepts.filter(c => c.review_status === 'approved' || c.is_approved);

  const handleApprove = async (conceptId: string) => {
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({
          is_approved: true,
          review_status: 'approved',
          approved_at: new Date().toISOString(),
          status: 'approved'
        })
        .eq('id', conceptId);

      if (error) throw error;
      toast.success('Concept approved!');
      refetch();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve concept');
    }
  };

  const handleReject = async (conceptId: string) => {
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({
          review_status: 'revision_requested',
          status: 'revision_requested'
        })
        .eq('id', conceptId);

      if (error) throw error;
      toast.success('Revision requested');
      refetch();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to request revision');
    }
  };

  const handleDelete = async (conceptId: string) => {
    if (!confirm('Delete this concept art? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('concept_arts')
        .delete()
        .eq('id', conceptId);

      if (error) throw error;
      toast.success('Concept deleted');
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete concept');
    }
  };

  const openGallery = (concepts: ConceptArt[], index: number) => {
    setSliderConcepts(concepts);
    setSliderInitialIndex(index);
    setShowSliderGallery(true);
  };

  // Show project selection prompt for directors without selected project
  if (isDirector && !selectedProjectId) {
    return (
      <MainLayout>
        <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] pb-24">
          <Card className="border-dashed border-2 max-w-md w-full">
            <CardContent className="py-8 md:py-12 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Select a Project</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a project to review concept arts
                </p>
              </div>
              <DirectorProjectSelector className="justify-center" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
        {/* Header with Project Selector for Directors */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
                <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                Concept Reviews
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Review and approve concept art submissions</p>
            </div>
            <div className="flex items-center gap-2">
              {isDirector && <DirectorProjectSelector className="hidden md:flex" />}
              {pending.length > 0 && (
                <Button onClick={() => openGallery(pending, 0)} variant="outline" size="sm" className="hidden md:flex">
                  <GalleryHorizontal className="h-4 w-4 mr-2" />
                  Gallery View
                </Button>
              )}
            </div>
          </div>

          {/* Cascading Asset Filters */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            
            {/* Asset Type Filter */}
            <Select value={selectedAssetType} onValueChange={handleAssetTypeChange}>
              <SelectTrigger className="w-[140px] md:w-[160px] h-9 bg-background">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assetTypeOptions.map(type => (
                  <SelectItem key={type} value={type}>
                    {CONCEPT_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dynamic Asset Name Filter - Only shows when type is selected */}
            {selectedAssetType !== 'all' && (
              <Select value={selectedAssetName} onValueChange={setSelectedAssetName}>
                <SelectTrigger className="w-[160px] md:w-[200px] h-9 bg-background">
                  <SelectValue placeholder="Select Asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {CONCEPT_TYPE_LABELS[selectedAssetType] || selectedAssetType}s</SelectItem>
                  {(projectAssets || []).map((name: string) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            {/* Filter Summary */}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-auto">
                {filteredConcepts.length} of {conceptArts?.length || 0} concepts
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span> ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Approved</span> ({approved.length})
              </TabsTrigger>
            </TabsList>
            
            {/* Mobile Gallery Button */}
            {pending.length > 0 && (
              <Button onClick={() => openGallery(pending, 0)} variant="outline" size="sm" className="md:hidden">
                <GalleryHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                {pending.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {pending.map((concept, idx) => (
                      <Card key={concept.id} className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 active:scale-[0.98] transition-transform">
                        <div 
                          className="aspect-square md:aspect-video relative overflow-hidden bg-muted"
                          onClick={() => openGallery(pending, idx)}
                        >
                          {concept.image_url ? (
                            <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                          )}
                          <Badge className="absolute top-2 left-2 bg-amber-500 text-xs">Pending</Badge>
                        </div>
                        <CardContent className="p-2 md:p-4 space-y-2 md:space-y-3">
                          <div>
                            <p className="font-medium truncate text-xs md:text-sm">{concept.title}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-2">
                                {CONCEPT_TYPE_LABELS[concept.concept_type] || concept.concept_type}
                              </Badge>
                            </div>
                          </div>
                          {/* Mobile: Icons only, Desktop: Full buttons */}
                          <div className="flex gap-1 md:gap-2">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleReject(concept.id); }} className="flex-1 h-8 md:h-9 px-2 md:px-3">
                              <XCircle className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Revise</span>
                            </Button>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApprove(concept.id); }} className="flex-1 h-8 md:h-9 px-2 md:px-3 bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Approve</span>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(concept.id); }} className="h-8 md:h-9 px-2">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No concepts pending review</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approved Concepts</CardTitle>
              </CardHeader>
              <CardContent>
                {approved.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {approved.map((concept, idx) => (
                      <Card key={concept.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 active:scale-[0.98] transition-transform" onClick={() => openGallery(approved, idx)}>
                        <div className="aspect-square md:aspect-video relative overflow-hidden bg-muted">
                          {concept.image_url ? (
                            <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                          )}
                          <Badge className="absolute top-2 left-2 bg-green-500 text-xs">Approved</Badge>
                        </div>
                        <CardContent className="p-2 md:p-4">
                          <p className="font-medium truncate text-xs md:text-sm">{concept.title}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-2">
                              {CONCEPT_TYPE_LABELS[concept.concept_type] || concept.concept_type}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-12 text-muted-foreground">No approved concepts yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Slider Gallery */}
      <ConceptArtSliderGallery
        open={showSliderGallery}
        onOpenChange={setShowSliderGallery}
        concepts={sliderConcepts}
        initialIndex={sliderInitialIndex}
        onConceptUpdated={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['concept-arts-for-review'] });
        }}
      />
    </MainLayout>
  );
}
