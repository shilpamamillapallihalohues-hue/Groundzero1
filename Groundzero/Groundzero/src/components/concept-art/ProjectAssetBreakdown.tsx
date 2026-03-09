import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, User, MapPin, Car, Sparkles, Clock, Film, Clapperboard, RefreshCw,
  Pencil, Trash2, Merge, Split, ArrowRight, Plus, Save, X, ExternalLink, Image, Check, Layers
} from 'lucide-react';
import { VariantCombiner } from './VariantCombiner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ConceptArtDetailDialog } from './ConceptArtDetailDialog';
import type { ConceptArt } from '@/types/conceptArt';

interface Project {
  id: string;
  title: string;
}

interface ProjectAssetBreakdownProps {
  projects?: Project[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

type AssetCategory = 'character' | 'prop' | 'environment' | 'vehicle' | 'fx';

const ASSET_CATEGORIES: { key: AssetCategory; label: string; icon: React.ElementType }[] = [
  { key: 'character', label: 'Characters', icon: User },
  { key: 'prop', label: 'Props', icon: Package },
  { key: 'environment', label: 'Environments', icon: MapPin },
  { key: 'vehicle', label: 'Vehicles', icon: Car },
  { key: 'fx', label: 'VFX', icon: Sparkles },
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
  thumbnail_url: string | null;
  workflow_status: string | null;
  sceneIds: string[];
  sceneNumbers: string[];
  assetIds?: string[];
}

export function ProjectAssetBreakdown({ projects, selectedProjectId, onProjectChange }: ProjectAssetBreakdownProps) {
  const [activeTab, setActiveTab] = useState<AssetCategory>('character');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AggregatedAsset | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [mergedName, setMergedName] = useState('');
  const [splitNames, setSplitNames] = useState<string[]>(['', '']);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ConceptArt | null>(null);
  const [showConceptDetail, setShowConceptDetail] = useState(false);
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);
  const [combineVariants, setCombineVariants] = useState<ConceptArt[]>([]);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch scene_assets for the selected project
  const { data: sceneAssets, isLoading: assetsLoading } = useQuery({
    queryKey: ['project-scene-assets-breakdown', selectedProjectId],
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
    queryKey: ['project-scenes-breakdown', selectedProjectId],
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
  const { data: shots, isLoading: shotsLoading } = useQuery({
    queryKey: ['project-shots-breakdown', selectedProjectId],
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

  // Fetch concept arts for the project
  const { data: conceptArts = [] } = useQuery({
    queryKey: ['project-concept-arts-breakdown', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ConceptArt[];
    },
    enabled: !!selectedProjectId
  });

  // Mutation to populate scene_assets from scenes data
  const populateAssetsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId || !scenes || scenes.length === 0) {
        throw new Error('No scenes available');
      }

      const assetsToInsert: Array<{
        project_id: string;
        scene_id: string;
        name: string;
        category: string;
        description: string;
        workflow_status: 'not_started' | 'in_progress' | 'internal_review' | 'director_review' | 'approved' | 'locked';
      }> = [];

      scenes.forEach((scene) => {
        if (scene.characters && scene.characters.length > 0) {
          scene.characters.forEach((character) => {
              assetsToInsert.push({
                project_id: selectedProjectId,
                scene_id: scene.id,
                name: character,
                category: 'character',
                description: character,
              workflow_status: 'not_started'
            });
          });
        }

        if (scene.props && scene.props.length > 0) {
          scene.props.forEach((prop) => {
            assetsToInsert.push({
              project_id: selectedProjectId,
              scene_id: scene.id,
              name: prop,
              category: 'prop',
              description: prop,
              workflow_status: 'not_started'
            });
          });
        }

        if (scene.location) {
          assetsToInsert.push({
            project_id: selectedProjectId,
            scene_id: scene.id,
            name: scene.location,
            category: 'environment',
            description: scene.slugline || scene.location,
            workflow_status: 'not_started'
          });
        }
      });

      if (assetsToInsert.length === 0) {
        throw new Error('No assets found in scenes');
      }

      const { error } = await supabase
        .from('scene_assets')
        .insert(assetsToInsert);

      if (error) throw error;

      return assetsToInsert.length;
    },
    onSuccess: (count) => {
      toast.success(`Populated ${count} assets from script breakdown`);
      queryClient.invalidateQueries({ queryKey: ['project-scene-assets-breakdown', selectedProjectId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to populate assets');
    }
  });

  // Edit asset mutation
  const editAssetMutation = useMutation({
    mutationFn: async ({ assetIds, name, description }: { assetIds: string[]; name: string; description: string }) => {
      const { error } = await supabase
        .from('scene_assets')
        .update({ name, description })
        .in('id', assetIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset updated successfully');
      setEditDialogOpen(false);
      setEditingAsset(null);
      queryClient.invalidateQueries({ queryKey: ['project-scene-assets-breakdown', selectedProjectId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update asset');
    }
  });

  // Merge assets mutation
  const mergeAssetsMutation = useMutation({
    mutationFn: async ({ assetNames, newName }: { assetNames: string[]; newName: string }) => {
      // Update all selected assets to have the new merged name
      const { error } = await supabase
        .from('scene_assets')
        .update({ name: newName })
        .eq('project_id', selectedProjectId)
        .in('name', assetNames);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assets merged successfully');
      setMergeDialogOpen(false);
      setSelectedAssets([]);
      setMergedName('');
      queryClient.invalidateQueries({ queryKey: ['project-scene-assets-breakdown', selectedProjectId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to merge assets');
    }
  });

  // Split asset mutation
  const splitAssetMutation = useMutation({
    mutationFn: async ({ originalName, newNames }: { originalName: string; newNames: string[] }) => {
      // Get all scene_assets with the original name
      const { data: assetsToSplit, error: fetchError } = await supabase
        .from('scene_assets')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('name', originalName);
      
      if (fetchError) throw fetchError;
      if (!assetsToSplit || assetsToSplit.length === 0) throw new Error('No assets found');

      // For each new name, create copies of the original assets
      const validNames = newNames.filter(n => n.trim());
      
      // Update existing to first name
      await supabase
        .from('scene_assets')
        .update({ name: validNames[0] })
        .eq('project_id', selectedProjectId)
        .eq('name', originalName);

      // Create new entries for additional split names
      for (let i = 1; i < validNames.length; i++) {
        const newAssets = assetsToSplit.map(a => ({
          project_id: a.project_id,
          scene_id: a.scene_id,
          name: validNames[i],
          category: a.category,
          description: `Split from ${originalName}`,
          workflow_status: a.workflow_status
        }));
        
        const { error } = await supabase.from('scene_assets').insert(newAssets);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Asset split successfully');
      setSplitDialogOpen(false);
      setEditingAsset(null);
      setSplitNames(['', '']);
      queryClient.invalidateQueries({ queryKey: ['project-scene-assets-breakdown', selectedProjectId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to split asset');
    }
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
              thumbnail_url: null,
              workflow_status: null,
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
              thumbnail_url: null,
              workflow_status: null,
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
            thumbnail_url: null,
            workflow_status: null,
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
          existing.assetIds?.push(asset.id);
        } else {
          assetMap.set(asset.name, {
            name: asset.name,
            category: asset.category,
            description: asset.description,
            thumbnail_url: asset.thumbnail_url,
            workflow_status: asset.workflow_status,
            sceneIds: [asset.scene_id],
            sceneNumbers: asset.scenes?.scene_number ? [asset.scenes.scene_number] : [],
            assetIds: [asset.id]
          });
        }
      });

      return Array.from(assetMap.values());
    }

    if (derivedAssets) {
      return derivedAssets
        .filter(a => a.category === category)
        .map(a => ({
          ...a,
          thumbnail_url: null,
          workflow_status: 'from_script' as string | null
        }));
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

  // Get concepts for a specific asset by name
  const getConceptsForAsset = (assetName: string): ConceptArt[] => {
    return conceptArts.filter(concept => {
      // Check metadata for asset name
      const metadata = concept.metadata as Record<string, unknown> | null;
      if (metadata?.assetName) {
        return (metadata.assetName as string).toLowerCase() === assetName.toLowerCase();
      }
      // Fallback: check title contains asset name
      return concept.title.toLowerCase().includes(assetName.toLowerCase());
    });
  };

  const handleToggleAssetExpand = (e: React.MouseEvent, assetName: string) => {
    e.stopPropagation();
    setExpandedAsset(prev => prev === assetName ? null : assetName);
  };

  const handleConceptClick = (e: React.MouseEvent, concept: ConceptArt) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Concept clicked:', concept.id, concept.title);
    // Set concept first, then open dialog
    setSelectedConcept(concept);
    // Use setTimeout to ensure state is updated before opening dialog
    setTimeout(() => {
      setShowConceptDetail(true);
    }, 0);
  };

  const handleApproveFromDetail = async (concept: ConceptArt) => {
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({ is_approved: !concept.is_approved })
        .eq('id', concept.id);
      if (error) throw error;
      toast.success(concept.is_approved ? 'Approval removed' : 'Concept approved');
      queryClient.invalidateQueries({ queryKey: ['project-concept-arts-breakdown', selectedProjectId] });
      setSelectedConcept(prev => prev ? { ...prev, is_approved: !prev.is_approved } : null);
    } catch (error) {
      toast.error('Failed to update approval status');
    }
  };

  const handleEnhanceConcept = async (concept: ConceptArt, enhancePrompt: string) => {
    try {
      const metadata = concept.metadata as Record<string, unknown> | null;
      
      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          projectId: concept.project_id,
          sceneId: concept.scene_id,
          conceptType: concept.concept_type,
          artStyle: concept.art_style,
          prompt: `${concept.generated_prompt || concept.description || ''}\n\nEnhancement: ${enhancePrompt}`,
          description: concept.description,
          title: `${concept.title} (Enhanced)`,
          referenceImageUrl: concept.image_url,
          metadata: {
            ...metadata,
            enhancedFrom: concept.id,
            enhancePrompt: enhancePrompt,
          },
        },
      });

      if (error) throw error;

      toast.success('Enhanced concept generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['project-concept-arts-breakdown', selectedProjectId] });
      setShowConceptDetail(false);
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error(error.message || 'Failed to enhance concept');
      throw error;
    }
  };

  const handleAssetClick = (asset: AggregatedAsset) => {
    const params = new URLSearchParams({
      name: asset.name,
      category: asset.category,
      description: asset.description || '',
      projectId: selectedProjectId || '',
      sceneIds: asset.sceneIds.join(',')
    });
    navigate(`/preprod/concept/asset-generation?${params.toString()}`);
  };

  const handleEditClick = (e: React.MouseEvent, asset: AggregatedAsset) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setEditForm({ name: asset.name, description: asset.description || '' });
    setEditDialogOpen(true);
  };

  const handleSplitClick = (e: React.MouseEvent, asset: AggregatedAsset) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setSplitNames([asset.name, '']);
    setSplitDialogOpen(true);
  };

  const handleSelectAsset = (assetName: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets(prev => [...prev, assetName]);
    } else {
      setSelectedAssets(prev => prev.filter(n => n !== assetName));
    }
  };

  const handleMergeSelected = () => {
    if (selectedAssets.length < 2) {
      toast.error('Select at least 2 assets to merge');
      return;
    }
    setMergedName(selectedAssets[0]);
    setMergeDialogOpen(true);
  };

  const isLoading = assetsLoading || scenesLoading || shotsLoading;
  const usingDerivedAssets = (!sceneAssets || sceneAssets.length === 0) && derivedAssets && derivedAssets.length > 0;

  const totalAssets = useMemo(() => {
    if (sceneAssets && sceneAssets.length > 0) {
      return new Set(sceneAssets.map(a => a.name)).size;
    }
    if (derivedAssets) {
      return new Set(derivedAssets.map(a => a.name)).size;
    }
    return 0;
  }, [sceneAssets, derivedAssets]);

  const totalScenes = scenes?.length || 0;
  const totalShots = shots?.length || 0;

  return (
    <div className="space-y-6">
      {/* Project Selection Header */}
      {projects && onProjectChange && (
        <div className="flex items-center gap-4">
          <Select value={selectedProjectId} onValueChange={onProjectChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!selectedProjectId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a project to view the asset breakdown
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Info banner when using derived assets */}
          {usingDerivedAssets && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Package className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Showing assets from Script Breakdown
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click on any asset to generate concept art. Click "Create Asset Entries" to enable editing.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => populateAssetsMutation.mutate()}
                    disabled={populateAssetsMutation.isPending}
                    className="gap-2"
                  >
                    {populateAssetsMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Create Asset Entries
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalAssets}</p>
                    <p className="text-sm text-muted-foreground">Unique Assets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Clapperboard className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalScenes}</p>
                    <p className="text-sm text-muted-foreground">Total Scenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Film className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalShots}</p>
                    <p className="text-sm text-muted-foreground">Total Shots</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ASSET_CATEGORIES.reduce((acc, cat) => acc + getAssetsByCategory(cat.key).length, 0)}</p>
                    <p className="text-sm text-muted-foreground">Asset Instances</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          {selectedAssets.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{selectedAssets.length} selected</Badge>
                    <span className="text-sm text-muted-foreground">
                      {selectedAssets.slice(0, 3).join(', ')}{selectedAssets.length > 3 ? '...' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAssets([])}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleMergeSelected} disabled={selectedAssets.length < 2}>
                      <Merge className="h-4 w-4 mr-1" />
                      Merge Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Asset Category Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssetCategory)} className="space-y-4">
            <TabsList>
              {ASSET_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.key} value={cat.key} className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" />
                  {cat.label} ({getAssetsByCategory(cat.key).length})
                </TabsTrigger>
              ))}
            </TabsList>

            {ASSET_CATEGORIES.map((cat) => (
              <TabsContent key={cat.key} value={cat.key}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <cat.icon className="h-5 w-5" />
                      {cat.label} Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : getAssetsByCategory(cat.key).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Scenes</TableHead>
                            <TableHead className="text-center">Shots</TableHead>
                            <TableHead className="text-center">Est. Runtime</TableHead>
                            <TableHead>Scene Numbers</TableHead>
                            <TableHead className="w-32">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getAssetsByCategory(cat.key).map((asset, idx) => {
                            const assetConcepts = getConceptsForAsset(asset.name);
                            const isExpanded = expandedAsset === asset.name;
                            
                            return (
                              <>
                                <TableRow 
                                  key={`${asset.name}-${idx}`}
                                  className="cursor-pointer hover:bg-muted/50 group"
                                  onClick={() => handleAssetClick(asset)}
                                >
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox 
                                      checked={selectedAssets.includes(asset.name)}
                                      onCheckedChange={(checked) => handleSelectAsset(asset.name, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                      {asset.thumbnail_url ? (
                                        <img 
                                          src={asset.thumbnail_url} 
                                          alt={asset.name}
                                          className="w-10 h-10 rounded object-cover"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                          <cat.icon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium flex items-center gap-2">
                                          {asset.name}
                                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </p>
                                        {asset.description && (
                                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {asset.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={asset.workflow_status === 'approved' ? 'default' : 'secondary'}>
                                      {asset.workflow_status || 'pending'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{asset.sceneIds.length}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{getShotCountForScenes(asset.sceneIds)}</Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="text-muted-foreground flex items-center justify-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {getEstimatedRuntimeForScenes(asset.sceneIds)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {asset.sceneNumbers.sort((a, b) => Number(a) - Number(b)).slice(0, 5).map((num) => (
                                        <Badge key={num} variant="secondary" className="text-xs">
                                          Sc {num}
                                        </Badge>
                                      ))}
                                      {asset.sceneNumbers.length > 5 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{asset.sceneNumbers.length - 5}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                      {assetConcepts.length > 0 && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8"
                                          onClick={(e) => handleToggleAssetExpand(e, asset.name)}
                                        >
                                          <Image className={`h-4 w-4 ${isExpanded ? 'text-primary' : ''}`} />
                                          <span className="sr-only">View concepts</span>
                                        </Button>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={(e) => handleEditClick(e, asset)}
                                        disabled={usingDerivedAssets}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={(e) => handleSplitClick(e, asset)}
                                        disabled={usingDerivedAssets}
                                      >
                                        <Split className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => handleAssetClick(asset)}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                
                                {/* Expanded row showing generated concepts */}
                                {isExpanded && assetConcepts.length > 0 && (
                                  <TableRow key={`${asset.name}-concepts-${idx}`}>
                                    <TableCell colSpan={8} className="bg-muted/30 p-4">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <h4 className="text-sm font-medium flex items-center gap-2">
                                            <Image className="h-4 w-4" />
                                            Generated Concepts ({assetConcepts.length})
                                          </h4>
                                          <div className="flex items-center gap-2">
                                            {assetConcepts.length >= 2 && (
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                  setCombineVariants(assetConcepts);
                                                  setCombineDialogOpen(true);
                                                }}
                                              >
                                                <Layers className="h-4 w-4 mr-1" />
                                                Combine Variants
                                              </Button>
                                            )}
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => handleAssetClick(asset)}
                                            >
                                              <Plus className="h-4 w-4 mr-1" />
                                              Generate More
                                            </Button>
                                          </div>
                                        </div>
                                        <ScrollArea className="w-full">
                                          <div className="flex gap-3 pb-2">
                                            {assetConcepts.slice(0, 10).map((concept) => (
                                              <div
                                                key={concept.id}
                                                className="relative shrink-0 w-32 cursor-pointer group/concept"
                                                onClick={(e) => handleConceptClick(e, concept)}
                                              >
                                                <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary transition-colors">
                                                  {concept.image_url ? (
                                                    <img
                                                      src={concept.image_url}
                                                      alt={concept.title}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                      <Image className="h-8 w-8" />
                                                    </div>
                                                  )}
                                                  {concept.is_approved && (
                                                    <div className="absolute top-1 right-1">
                                                      <Badge className="bg-green-500 text-xs px-1 py-0">
                                                        <Check className="h-3 w-3" />
                                                      </Badge>
                                                    </div>
                                                  )}
                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/concept:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-xs text-white">View Details</span>
                                                  </div>
                                                </div>
                                                <p className="text-xs text-center mt-1 truncate">
                                                  {(concept.metadata as Record<string, unknown>)?.turnaroundAngle as string || concept.art_style}
                                                </p>
                                              </div>
                                            ))}
                                            {assetConcepts.length > 10 && (
                                              <div className="shrink-0 w-32 aspect-square rounded-lg bg-muted/50 border border-dashed border-border flex items-center justify-center">
                                                <span className="text-sm text-muted-foreground">
                                                  +{assetConcepts.length - 10} more
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </ScrollArea>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center py-12 text-muted-foreground">
                        No {cat.label.toLowerCase()} found in this project
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset name and description. Changes will apply to all instances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input 
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editingAsset?.assetIds) {
                  editAssetMutation.mutate({
                    assetIds: editingAsset.assetIds,
                    name: editForm.name,
                    description: editForm.description
                  });
                }
              }}
              disabled={editAssetMutation.isPending}
            >
              {editAssetMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Assets</DialogTitle>
            <DialogDescription>
              Combine {selectedAssets.length} assets into one. All scene associations will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assets to Merge</Label>
              <div className="flex flex-wrap gap-2">
                {selectedAssets.map(name => (
                  <Badge key={name} variant="secondary">{name}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Merged Name</Label>
              <Input 
                value={mergedName}
                onChange={(e) => setMergedName(e.target.value)}
                placeholder="Enter the merged asset name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => mergeAssetsMutation.mutate({ assetNames: selectedAssets, newName: mergedName })}
              disabled={mergeAssetsMutation.isPending || !mergedName.trim()}
            >
              {mergeAssetsMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Merge className="h-4 w-4 mr-2" />}
              Merge Assets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Asset</DialogTitle>
            <DialogDescription>
              Divide "{editingAsset?.name}" into multiple separate assets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Split into (add names)</Label>
              {splitNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input 
                    value={name}
                    onChange={(e) => {
                      const newNames = [...splitNames];
                      newNames[idx] = e.target.value;
                      setSplitNames(newNames);
                    }}
                    placeholder={`Asset ${idx + 1} name`}
                  />
                  {idx > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSplitNames(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSplitNames(prev => [...prev, ''])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editingAsset) {
                  splitAssetMutation.mutate({ originalName: editingAsset.name, newNames: splitNames });
                }
              }}
              disabled={splitAssetMutation.isPending || splitNames.filter(n => n.trim()).length < 2}
            >
              {splitAssetMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Split className="h-4 w-4 mr-2" />}
              Split Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concept Art Detail Dialog */}
      <ConceptArtDetailDialog
        open={showConceptDetail}
        onOpenChange={(open) => {
          setShowConceptDetail(open);
          if (!open) {
            // Refresh concepts when dialog closes
            queryClient.invalidateQueries({ queryKey: ['project-concept-arts-breakdown', selectedProjectId] });
          }
        }}
        concept={selectedConcept}
        onApprove={handleApproveFromDetail}
        onEnhance={handleEnhanceConcept}
        showActions={true}
      />

      {/* Variant Combiner Dialog */}
      {selectedProjectId && (
        <VariantCombiner
          open={combineDialogOpen}
          onOpenChange={setCombineDialogOpen}
          variants={combineVariants}
          projectId={selectedProjectId}
          onCombineComplete={(newConcept) => {
            queryClient.invalidateQueries({ queryKey: ['project-concept-arts-breakdown', selectedProjectId] });
            toast.success('Combined variant created!');
          }}
        />
      )}
    </div>
  );
}
