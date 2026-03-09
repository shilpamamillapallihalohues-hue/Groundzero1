import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Grid3X3, 
  List, 
  Filter, 
  Check, 
  GitBranch, 
  Clock,
  Trash2,
  Eye,
  Film,
  User,
  MapPin,
  Camera,
  Sun,
  Timer,
  Calendar,
  Package,
  Car,
  Sparkles,
  RefreshCw,
  GalleryHorizontal,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ConceptArt } from '@/types/conceptArt';
import { CONCEPT_TYPE_LABELS, ART_STYLE_LABELS } from '@/constants/conceptArtLabels';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ConceptArtSliderGallery } from './ConceptArtSliderGallery';

interface ConceptArtWallProps {
  projectId: string;
  onSelectConcept?: (concept: ConceptArt) => void;
}

interface ConceptMetadata {
  assetName?: string;
  assetCategory?: string;
  variationPose?: string;
  variationAngle?: string;
  sceneIds?: string[];
  estimatedRuntime?: number;
  technicalSpecs?: {
    artStyle?: string;
    camera?: {
      type?: string;
      lens?: string;
      angle?: string;
    };
    lighting?: {
      keyLight?: string;
      intensity?: string;
      mood?: string;
    };
  };
  isTurnaround?: boolean;
  turnaroundAngle?: string;
  generatedAt?: string;
}

interface SceneInfo {
  id: string;
  scene_number: string;
  slugline: string;
  estimated_duration?: number;
}

interface UniqueAsset {
  name: string;
  category: string;
  count: number;
}

export function ConceptArtWall({ projectId, onSelectConcept }: ConceptArtWallProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [selectedConcept, setSelectedConcept] = useState<ConceptArt | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showSliderGallery, setShowSliderGallery] = useState(false);
  const [sliderInitialIndex, setSliderInitialIndex] = useState(0);
  const [sceneInfo, setSceneInfo] = useState<SceneInfo | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch concept arts for the project - optimized with select only needed fields
  const { data: concepts = [], isLoading: loading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['concept-arts-wall', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Select only necessary columns to reduce payload and query time
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, description, concept_type, art_style, image_url, is_approved, status, version, branch_name, scene_id, metadata, tags, created_at, prompt, generated_prompt')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100); // Reduced limit for faster initial load

      if (error) {
        console.error('ConceptArtWall: Supabase error:', error);
        throw error;
      }
      
      // Transform the data to match our type - handle nullables properly
      const transformedData: ConceptArt[] = (data || []).map(item => ({
        ...item,
        project_id: projectId, // Add back project_id since we know it
        concept_type: item.concept_type as ConceptArt['concept_type'],
        art_style: item.art_style as ConceptArt['art_style'],
        tags: item.tags || [],
        metadata: (item.metadata as Record<string, unknown>) || {},
        is_approved: item.is_approved ?? false,
        branch_name: item.branch_name || 'main',
        updated_at: item.created_at, // Use created_at as fallback
      }));
      
      return transformedData;
    },
    enabled: !!projectId,
    staleTime: 60000, // Cache for 60 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once to fail faster
  });

  // Extract unique assets from concept metadata for dynamic filtering
  const uniqueAssets = useMemo((): UniqueAsset[] => {
    const assetMap = new Map<string, UniqueAsset>();
    
    concepts.forEach(concept => {
      const metadata = getMetadata(concept);
      const assetName = metadata.assetName || getAssetNameFromTitle(concept.title);
      const category = metadata.assetCategory || concept.concept_type;
      
      if (assetName && assetName !== 'Unknown') {
        const key = assetName.toLowerCase();
        if (assetMap.has(key)) {
          assetMap.get(key)!.count++;
        } else {
          assetMap.set(key, { name: assetName, category, count: 1 });
        }
      }
    });
    
    return Array.from(assetMap.values()).sort((a, b) => b.count - a.count);
  }, [concepts]);

  // Fetch scene info when a concept is selected
  useEffect(() => {
    if (selectedConcept?.scene_id) {
      fetchSceneInfo(selectedConcept.scene_id);
    } else {
      setSceneInfo(null);
    }
  }, [selectedConcept]);

  const fetchSceneInfo = async (sceneId: string) => {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, estimated_duration')
        .eq('id', sceneId)
        .single();

      if (error) throw error;
      setSceneInfo(data);
    } catch (error) {
      console.error('Error fetching scene info:', error);
    }
  };

  const handleApprove = async (concept: ConceptArt) => {
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          is_approved: !concept.is_approved,
          approved_at: !concept.is_approved ? new Date().toISOString() : null,
          status: !concept.is_approved ? 'approved' : 'draft'
        })
        .eq('id', concept.id);

      if (error) throw error;
      
      // Refetch to update the list
      refetch();
      
      // Update selected concept if it's the one being modified
      if (selectedConcept?.id === concept.id) {
        setSelectedConcept(prev => prev ? { ...prev, is_approved: !prev.is_approved, status: !prev.is_approved ? 'approved' : 'draft' } : null);
      }
      
      toast.success(concept.is_approved ? 'Approval removed' : 'Concept approved!');
    } catch (error) {
      console.error('Error updating concept:', error);
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (conceptId: string) => {
    if (!confirm('Delete this concept art?')) return;
    
    try {
      const { error } = await supabase
        .from('concept_arts')
        .delete()
        .eq('id', conceptId);

      if (error) throw error;
      
      refetch();
      if (selectedConcept?.id === conceptId) {
        setShowDetail(false);
        setSelectedConcept(null);
      }
      toast.success('Concept deleted');
    } catch (error) {
      console.error('Error deleting concept:', error);
      toast.error('Failed to delete');
    }
  };

  const getMetadata = (concept: ConceptArt): ConceptMetadata => {
    return (concept.metadata as ConceptMetadata) || {};
  };

  const getAssetNameFromTitle = (title: string): string => {
    // Try to extract from title patterns like "AssetName - Variant 1" or "AssetName - Front View"
    const titleParts = title.split(' - ');
    if (titleParts.length > 1 && !titleParts[0].includes('Concept')) {
      return titleParts[0].trim();
    }
    return title;
  };

  const getAssetName = (concept: ConceptArt): string => {
    const metadata = getMetadata(concept);
    if (metadata.assetName) return metadata.assetName;
    return getAssetNameFromTitle(concept.title);
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'character': return User;
      case 'prop': return Package;
      case 'environment': return MapPin;
      case 'vehicle': return Car;
      case 'fx': return Sparkles;
      default: return Sparkles;
    }
  };

  const filteredConcepts = useMemo(() => {
    return concepts.filter(c => {
      if (filterType !== 'all' && c.concept_type !== filterType) return false;
      if (filterStyle !== 'all' && c.art_style !== filterStyle) return false;
      
      // Filter by asset name
      if (filterAsset !== 'all') {
        const assetName = getAssetName(c).toLowerCase();
        if (assetName !== filterAsset.toLowerCase()) return false;
      }
      
      return true;
    });
  }, [concepts, filterType, filterStyle, filterAsset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading concepts...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">Failed to load concepts</p>
          <p className="text-sm text-muted-foreground mt-2">
            {queryError instanceof Error ? queryError.message : 'An unexpected error occurred'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Asset Filter - Dynamic dropdown based on project assets */}
          <Select value={filterAsset} onValueChange={setFilterAsset}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets ({concepts.length})</SelectItem>
              {uniqueAssets.map((asset) => (
                <SelectItem key={asset.name} value={asset.name}>
                  {asset.name} ({asset.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(CONCEPT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Style Filter */}
          <Select value={filterStyle} onValueChange={setFilterStyle}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Styles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Styles</SelectItem>
              {Object.entries(ART_STYLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon"
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredConcepts.length > 0) {
                setSliderInitialIndex(0);
                setShowSliderGallery(true);
              }
            }}
            disabled={filteredConcepts.length === 0}
            title="Slideshow Gallery"
          >
            <GalleryHorizontal className="h-4 w-4 mr-2" />
            Gallery View
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {filteredConcepts.length} of {concepts.length} concepts</span>
        {filterAsset !== 'all' && (
          <Badge variant="outline" className="gap-1">
            {filterAsset}
            <button onClick={() => setFilterAsset('all')} className="ml-1 hover:text-foreground">×</button>
          </Badge>
        )}
      </div>

      {/* Concept Grid/List */}
      {filteredConcepts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {concepts.length === 0 
                ? "No concept art yet. Generate your first concept!" 
                : "No concepts match your filters."}
            </p>
            {concepts.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Go to Project Breakdown → Concept Art to generate concepts for your assets.
              </p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredConcepts.map(concept => {
            const metadata = getMetadata(concept);
            return (
              <Card 
                key={concept.id} 
                className={`group cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                  concept.is_approved ? 'ring-2 ring-green-500/50' : ''
                }`}
                onClick={() => {
                  const idx = filteredConcepts.findIndex(c => c.id === concept.id);
                  setSliderInitialIndex(idx >= 0 ? idx : 0);
                  setShowSliderGallery(true);
                }}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
                  {concept.image_url ? (
                    <img 
                      src={concept.image_url} 
                      alt={concept.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">No image</span>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(concept);
                        }}>
                          <Check className="h-3 w-3 mr-1" />
                          {concept.is_approved ? 'Approved' : 'Approve'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(concept.id);
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {concept.is_approved && (
                      <Badge className="bg-green-500/90">Approved</Badge>
                    )}
                    {concept.version > 1 && (
                      <Badge variant="outline" className="bg-background/80">
                        <GitBranch className="h-3 w-3 mr-1" />
                        v{concept.version}
                      </Badge>
                    )}
                    {metadata.isTurnaround && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-500">
                        Turnaround
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm truncate">{getAssetName(concept)}</h4>
                  {metadata.turnaroundAngle && (
                    <p className="text-xs text-muted-foreground truncate">{metadata.turnaroundAngle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {(concept.concept_type && CONCEPT_TYPE_LABELS[concept.concept_type]) || concept.concept_type || 'Unknown'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(concept.art_style && ART_STYLE_LABELS[concept.art_style]) || concept.art_style || 'Unknown'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConcepts.map(concept => {
            const metadata = getMetadata(concept);
            return (
              <Card 
                key={concept.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary/50"
                onClick={() => {
                  const idx = filteredConcepts.findIndex(c => c.id === concept.id);
                  setSliderInitialIndex(idx >= 0 ? idx : 0);
                  setShowSliderGallery(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-14 rounded overflow-hidden bg-muted shrink-0">
                      {concept.image_url && (
                        <img 
                          src={concept.image_url} 
                          alt={concept.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{getAssetName(concept)}</h4>
                      {metadata.turnaroundAngle && (
                        <p className="text-xs text-muted-foreground">{metadata.turnaroundAngle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{(concept.concept_type && CONCEPT_TYPE_LABELS[concept.concept_type]) || concept.concept_type || 'Unknown'}</Badge>
                        <Badge variant="outline">{(concept.art_style && ART_STYLE_LABELS[concept.art_style]) || concept.art_style || 'Unknown'}</Badge>
                        {concept.is_approved && <Badge className="bg-green-500">Approved</Badge>}
                        {metadata.isTurnaround && (
                          <Badge variant="outline" className="text-blue-500">Turnaround</Badge>
                        )}
                        {metadata.estimatedRuntime !== undefined && metadata.estimatedRuntime > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {metadata.estimatedRuntime}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      {new Date(concept.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enhanced Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConcept && getAssetName(selectedConcept)}
              {selectedConcept?.is_approved && (
                <Badge className="bg-green-500">Approved</Badge>
              )}
              {(() => {
                const meta = selectedConcept ? getMetadata(selectedConcept) : null;
                return meta?.isTurnaround && (
                  <Badge variant="outline" className="text-blue-500">Turnaround Sheet</Badge>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedConcept && (
            <ScrollArea className="max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-4">
                {/* Image Section */}
                <div className="space-y-4">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    {selectedConcept.image_url && (
                      <img 
                        src={selectedConcept.image_url} 
                        alt={selectedConcept.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(selectedConcept)} className="flex-1">
                      <Check className="h-4 w-4 mr-2" />
                      {selectedConcept.is_approved ? 'Remove Approval' : 'Approve'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => onSelectConcept?.(selectedConcept)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Use as Reference
                    </Button>
                  </div>
                </div>
                
                {/* Details Section */}
                <div className="space-y-4">
                  {/* Asset Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">Asset Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <p className="text-sm font-medium">{(selectedConcept.concept_type && CONCEPT_TYPE_LABELS[selectedConcept.concept_type]) || selectedConcept.concept_type || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Art Style</p>
                          <p className="text-sm font-medium">{(selectedConcept.art_style && ART_STYLE_LABELS[selectedConcept.art_style]) || selectedConcept.art_style || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Scene Info */}
                  {sceneInfo && (
                    <>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">Scene Information</h3>
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                          <div className="flex items-center gap-2">
                            <Film className="h-4 w-4 text-primary" />
                            <span className="font-medium">Scene {sceneInfo.scene_number}</span>
                          </div>
                          <p className="text-sm">{sceneInfo.slugline}</p>
                          {sceneInfo.estimated_duration && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Timer className="h-4 w-4" />
                              <span>Est. Runtime: {sceneInfo.estimated_duration} minutes</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  {/* Metadata Info */}
                  {(() => {
                    const metadata = getMetadata(selectedConcept);
                    if (!metadata.assetName && !metadata.estimatedRuntime && !metadata.technicalSpecs) return null;
                    
                    return (
                      <>
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm text-muted-foreground">Production Details</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {metadata.assetName && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Asset</p>
                                  <p className="text-sm font-medium">{metadata.assetName}</p>
                                </div>
                              </div>
                            )}
                            {metadata.estimatedRuntime !== undefined && metadata.estimatedRuntime > 0 && (
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Screen Time</p>
                                  <p className="text-sm font-medium">{metadata.estimatedRuntime} min</p>
                                </div>
                              </div>
                            )}
                            {metadata.variationPose && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Pose</p>
                                  <p className="text-sm font-medium capitalize">{metadata.variationPose}</p>
                                </div>
                              </div>
                            )}
                            {metadata.variationAngle && (
                              <div className="flex items-center gap-2">
                                <Camera className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Camera Angle</p>
                                  <p className="text-sm font-medium capitalize">{metadata.variationAngle}</p>
                                </div>
                              </div>
                            )}
                            {metadata.turnaroundAngle && (
                              <div className="flex items-center gap-2">
                                <Camera className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Turnaround View</p>
                                  <p className="text-sm font-medium">{metadata.turnaroundAngle}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Technical Specs */}
                          {metadata.technicalSpecs && (
                            <div className="mt-3 space-y-2">
                              {metadata.technicalSpecs.camera && (
                                <div className="p-2 rounded bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Camera</p>
                                  <p className="text-xs">
                                    {[
                                      metadata.technicalSpecs.camera.type,
                                      metadata.technicalSpecs.camera.lens,
                                      metadata.technicalSpecs.camera.angle
                                    ].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                              )}
                              {metadata.technicalSpecs.lighting && (
                                <div className="p-2 rounded bg-muted/30">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Lighting</p>
                                  <p className="text-xs">
                                    {[
                                      metadata.technicalSpecs.lighting.keyLight,
                                      metadata.technicalSpecs.lighting.intensity,
                                      metadata.technicalSpecs.lighting.mood
                                    ].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    );
                  })()}
                  
                  {/* Description */}
                  {selectedConcept.description && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">Description</h3>
                      <p className="text-sm">{selectedConcept.description}</p>
                    </div>
                  )}
                  
                  {/* AI Prompt */}
                  {selectedConcept.generated_prompt && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">AI Prompt Used</h3>
                      <p className="text-xs bg-muted p-3 rounded max-h-32 overflow-auto">{selectedConcept.generated_prompt}</p>
                    </div>
                  )}
                  
                  {/* Seed & Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {selectedConcept.seed && (
                      <span>Seed: <code className="font-mono">{selectedConcept.seed}</code></span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(selectedConcept.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Slider Gallery */}
      <ConceptArtSliderGallery
        open={showSliderGallery}
        onOpenChange={setShowSliderGallery}
        concepts={filteredConcepts}
        initialIndex={sliderInitialIndex}
        onConceptUpdated={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['concept-arts-wall'] });
        }}
        onNavigateToBreakdown={() => {
          setShowSliderGallery(false);
          navigate(`/preprod/concept/breakdown?project=${projectId}`);
        }}
      />
    </div>
  );
}
