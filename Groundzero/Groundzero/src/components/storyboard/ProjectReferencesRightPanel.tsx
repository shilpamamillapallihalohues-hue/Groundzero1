import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Image, 
  Upload, 
  Link as LinkIcon, 
  X, 
  Loader2,
  User,
  Package,
  MapPin,
  Car,
  Trees,
  Shirt,
  Plus,
  Tag,
  Clapperboard,
  CheckCircle2,
  Palette,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'location', label: 'Location', icon: MapPin, color: 'text-blue-500' },
  { value: 'character', label: 'Character', icon: User, color: 'text-green-500' },
  { value: 'prop', label: 'Prop', icon: Package, color: 'text-yellow-500' },
  { value: 'environment', label: 'Environment', icon: Trees, color: 'text-emerald-500' },
  { value: 'vehicle', label: 'Vehicle', icon: Car, color: 'text-orange-500' },
  { value: 'costume', label: 'Costume', icon: Shirt, color: 'text-pink-500' },
  { value: 'general', label: 'General', icon: Image, color: 'text-muted-foreground' },
];

interface SceneReference {
  id: string;
  scene_id: string;
  project_id: string;
  title: string | null;
  image_url: string;
  source_type: string;
  category: string;
  description: string | null;
  asset_tags: string[] | null;
  created_at: string;
  scenes?: {
    id: string;
    scene_number: string | null;
    slugline: string | null;
    characters?: string[] | null;
    props?: string[] | null;
    location?: string | null;
  };
}

interface ApprovedConcept {
  id: string;
  title: string;
  concept_type: string;
  image_url: string | null;
  art_style: string;
  scene_id: string | null;
  tags: string[] | null;
  scenes?: {
    id: string;
    scene_number: string | null;
    slugline: string | null;
  } | null;
}

interface ProjectReferencesRightPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectReferencesRightPanel({ 
  projectId, 
  isOpen,
  onClose
}: ProjectReferencesRightPanelProps) {
  const [activeTab, setActiveTab] = useState<'references' | 'concepts'>('concepts');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedAssetTags, setSelectedAssetTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedReference, setSelectedReference] = useState<SceneReference | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<ApprovedConcept | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch all references for the project
  const { data: references = [], isLoading: referencesLoading } = useQuery({
    queryKey: ['project-all-references', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scene_references')
        .select(`
          *,
          scenes(id, scene_number, slugline, characters, props, location)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SceneReference[];
    },
    enabled: !!projectId && isOpen
  });

  // Fetch approved concept arts
  const { data: approvedConcepts = [], isLoading: conceptsLoading } = useQuery({
    queryKey: ['project-approved-concepts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select(`
          id, title, concept_type, image_url, art_style, scene_id, tags,
          scenes(id, scene_number, slugline)
        `)
        .eq('project_id', projectId)
        .or('is_approved.eq.true,director_approved.eq.true,art_director_approved.eq.true,concept_lead_approved.eq.true')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ApprovedConcept[];
    },
    enabled: !!projectId && isOpen
  });

  // Fetch scenes for the project
  const { data: scenes = [] } = useQuery({
    queryKey: ['project-scenes-refs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location')
        .eq('project_id', projectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && isOpen
  });

  // Dynamic asset tags from all scenes
  const dynamicAssetTags = useMemo(() => {
    const assets: { name: string; category: string }[] = [];
    
    scenes.forEach(scene => {
      // Characters
      if (scene.characters) {
        scene.characters.forEach((char: string) => {
          if (!assets.find(a => a.name === char)) {
            assets.push({ name: char, category: 'character' });
          }
        });
      }
      // Props
      if (scene.props) {
        scene.props.forEach((prop: string) => {
          if (!assets.find(a => a.name === prop)) {
            assets.push({ name: prop, category: 'prop' });
          }
        });
      }
      // Location
      if (scene.location) {
        if (!assets.find(a => a.name === scene.location)) {
          assets.push({ name: scene.location, category: 'location' });
        }
      }
    });
    
    return assets;
  }, [scenes]);

  // Find which scenes a reference or concept is used in based on asset_tags
  const findScenesForAssetTags = (tags: string[] | null) => {
    if (!tags || tags.length === 0) return [];
    
    return scenes.filter(scene => {
      const sceneAssets = [
        ...(scene.characters || []),
        ...(scene.props || []),
        scene.location
      ].filter(Boolean);
      
      return tags.some(tag => sceneAssets.includes(tag));
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `projects/${projectId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(uploadData.path);

      const { error: refError } = await supabase
        .from('scene_references')
        .insert({
          scene_id: selectedSceneId || scenes[0]?.id,
          project_id: projectId,
          title: file.name,
          image_url: publicUrl,
          source_type: 'upload',
          category: selectedCategory,
          asset_tags: selectedAssetTags.length > 0 ? selectedAssetTags : null,
        });

      if (refError) throw refError;

      queryClient.invalidateQueries({ queryKey: ['project-all-references', projectId] });
      toast.success('Reference uploaded!');
      resetUploadForm();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload reference');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      new URL(urlInput);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsUploading(true);
    try {
      const { error: refError } = await supabase
        .from('scene_references')
        .insert({
          scene_id: selectedSceneId || scenes[0]?.id,
          project_id: projectId,
          title: 'URL Reference',
          image_url: urlInput.trim(),
          source_type: 'url',
          category: selectedCategory,
          asset_tags: selectedAssetTags.length > 0 ? selectedAssetTags : null,
        });

      if (refError) throw refError;

      queryClient.invalidateQueries({ queryKey: ['project-all-references', projectId] });
      toast.success('Reference added!');
      resetUploadForm();
    } catch (error) {
      console.error('URL add error:', error);
      toast.error('Failed to add reference');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setShowUploadForm(false);
    setShowUrlInput(false);
    setUrlInput('');
    setSelectedAssetTags([]);
    setSelectedSceneId(null);
  };

  const toggleAssetTag = (assetName: string) => {
    setSelectedAssetTags(prev => 
      prev.includes(assetName) 
        ? prev.filter(t => t !== assetName)
        : [...prev, assetName]
    );
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[6];
  };

  // Group assets by category
  const groupedAssets = useMemo(() => {
    return dynamicAssetTags.reduce((acc, asset) => {
      if (!acc[asset.category]) acc[asset.category] = [];
      acc[asset.category].push(asset.name);
      return acc;
    }, {} as Record<string, string[]>);
  }, [dynamicAssetTags]);

  if (!isOpen) return null;

  return (
    <>
      <div className="w-[450px] border-l border-border bg-card/50 flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Project References</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 32px)' }}>
            <TabsTrigger value="concepts" className="text-xs gap-1">
              <Palette className="h-3 w-3" />
              Concepts ({approvedConcepts.length})
            </TabsTrigger>
            <TabsTrigger value="references" className="text-xs gap-1">
              <Image className="h-3 w-3" />
              References ({references.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="concepts" className="flex-1 overflow-hidden m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {conceptsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : approvedConcepts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Palette className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No approved concepts yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {approvedConcepts.map(concept => (
                      <div
                        key={concept.id}
                        className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedConcept(concept)}
                      >
                        <img
                          src={concept.image_url || '/placeholder.svg'}
                          alt={concept.title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <Badge className="absolute top-1 right-1 text-[8px] py-0 px-1 bg-green-600">
                          <CheckCircle2 className="h-2 w-2 mr-0.5" />
                          Approved
                        </Badge>
                        <div className="absolute bottom-1 left-1 right-1">
                          <p className="text-[10px] text-white truncate font-medium">{concept.title}</p>
                          {concept.scenes && (
                            <p className="text-[8px] text-white/70">Scene {concept.scenes.scene_number}</p>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="references" className="flex-1 overflow-hidden m-0 p-0 flex flex-col">
            {/* Upload Button */}
            <div className="p-4 border-b border-border">
              <Button 
                onClick={() => setShowUploadForm(!showUploadForm)} 
                variant={showUploadForm ? "secondary" : "default"}
                className="w-full"
                size="sm"
              >
                {showUploadForm ? (
                  <><X className="h-3 w-3 mr-1" />Cancel</>
                ) : (
                  <><Plus className="h-3 w-3 mr-1" />Add Reference</>
                )}
              </Button>

              {/* Upload Form */}
              {showUploadForm && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                  {/* Scene Selection (Optional) */}
                  <div className="space-y-1">
                    <Label className="text-xs">Scene (Optional)</Label>
                    <Select value={selectedSceneId || 'all'} onValueChange={(v) => setSelectedSceneId(v === 'all' ? null : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All scenes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All scenes</SelectItem>
                        {scenes.map(scene => (
                          <SelectItem key={scene.id} value={scene.id}>
                            Scene {scene.scene_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className={`h-3 w-3 ${cat.color}`} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Asset Tags */}
                  {Object.keys(groupedAssets).length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Tag to Assets
                      </Label>
                      <ScrollArea className="h-24">
                        <div className="space-y-2">
                          {Object.entries(groupedAssets).map(([category, assets]) => (
                            <div key={category}>
                              <p className="text-[10px] text-muted-foreground capitalize mb-1">{category}s</p>
                              <div className="flex flex-wrap gap-1">
                                {assets.map(name => (
                                  <Badge
                                    key={name}
                                    variant={selectedAssetTags.includes(name) ? "default" : "outline"}
                                    className="cursor-pointer text-[10px] py-0"
                                    onClick={() => toggleAssetTag(name)}
                                  >
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Upload Methods */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-1 h-7 text-xs"
                    >
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                      Upload
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="flex-1 h-7 text-xs"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      URL
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {showUrlInput && (
                    <div className="flex gap-1">
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste image URL..."
                        className="h-7 text-xs flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                      />
                      <Button size="sm" onClick={handleUrlSubmit} disabled={isUploading} className="h-7 px-2">
                        {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* References List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {referencesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : references.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No references yet</p>
                    <p className="text-xs">Upload references for AI generation</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {references.map(ref => {
                      const catInfo = getCategoryInfo(ref.category);
                      return (
                        <div
                          key={ref.id}
                          className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                          onClick={() => setSelectedReference(ref)}
                        >
                          <img
                            src={ref.image_url}
                            alt={ref.title || 'Reference'}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <Badge 
                            variant="secondary" 
                            className="absolute top-1 left-1 text-[8px] py-0 px-1 gap-0.5"
                          >
                            <catInfo.icon className={`h-2.5 w-2.5 ${catInfo.color}`} />
                          </Badge>
                          {ref.scenes && (
                            <Badge variant="outline" className="absolute top-1 right-1 text-[8px] py-0 px-1 bg-background/80">
                              Sc {ref.scenes.scene_number}
                            </Badge>
                          )}
                          {ref.asset_tags && ref.asset_tags.length > 0 && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className="flex flex-wrap gap-0.5">
                                {ref.asset_tags.slice(0, 2).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-[8px] py-0 px-1 bg-background/80">
                                    {tag}
                                  </Badge>
                                ))}
                                {ref.asset_tags.length > 2 && (
                                  <Badge variant="outline" className="text-[8px] py-0 px-1 bg-background/80">
                                    +{ref.asset_tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reference Detail Dialog */}
      <Dialog open={!!selectedReference} onOpenChange={(open) => { if (!open) { setSelectedReference(null); setImageZoom(1); } }}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reference Details</DialogTitle>
            <DialogDescription>View where this reference is used in your project</DialogDescription>
          </DialogHeader>
          {selectedReference && (
            <div className="space-y-4">
              {/* Image with zoom controls */}
              <div className="relative bg-muted/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-center p-2 border-b border-border bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                      disabled={imageZoom <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[60px] text-center">{Math.round(imageZoom * 100)}%</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                      disabled={imageZoom >= 3}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setImageZoom(1)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="flex items-center justify-center p-4 min-h-[500px]" style={{ overflow: 'auto' }}>
                    <img
                      src={selectedReference.image_url}
                      alt={selectedReference.title || 'Reference'}
                      className="max-w-none rounded-lg transition-transform duration-200"
                      style={{ 
                        transform: `scale(${imageZoom})`,
                        transformOrigin: 'center center'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                </ScrollArea>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const catInfo = getCategoryInfo(selectedReference.category);
                      return (
                        <Badge variant="outline" className="gap-1">
                          <catInfo.icon className={`h-3 w-3 ${catInfo.color}`} />
                          {catInfo.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                {selectedReference.asset_tags && selectedReference.asset_tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tagged Assets</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedReference.asset_tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Primary Scene</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="gap-1">
                      <Clapperboard className="h-3 w-3" />
                      Scene {selectedReference.scenes?.scene_number}
                    </Badge>
                    <span className="text-sm text-muted-foreground truncate">
                      {selectedReference.scenes?.slugline}
                    </span>
                  </div>
                </div>

                {/* Scenes using this reference (via asset tags) */}
                {selectedReference.asset_tags && selectedReference.asset_tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Used in Scenes</Label>
                    <div className="mt-1 space-y-1">
                      {findScenesForAssetTags(selectedReference.asset_tags).map(scene => (
                        <div key={scene.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          <Clapperboard className="h-3 w-3 text-primary" />
                          <span className="font-medium">Scene {scene.scene_number}</span>
                          <span className="text-muted-foreground truncate">{scene.slugline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Concept Detail Dialog */}
      <Dialog open={!!selectedConcept} onOpenChange={(open) => { if (!open) { setSelectedConcept(null); setImageZoom(1); } }}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approved Concept</DialogTitle>
            <DialogDescription>View concept art details and usage</DialogDescription>
          </DialogHeader>
          {selectedConcept && (
            <div className="space-y-4">
              {/* Image with zoom controls */}
              <div className="relative bg-muted/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-center p-2 border-b border-border bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                      disabled={imageZoom <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[60px] text-center">{Math.round(imageZoom * 100)}%</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                      disabled={imageZoom >= 3}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setImageZoom(1)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="flex items-center justify-center p-4 min-h-[500px]" style={{ overflow: 'auto' }}>
                    <img
                      src={selectedConcept.image_url || '/placeholder.svg'}
                      alt={selectedConcept.title}
                      className="max-w-none rounded-lg transition-transform duration-200"
                      style={{ 
                        transform: `scale(${imageZoom})`,
                        transformOrigin: 'center center'
                      }}
                    />
                  </div>
                </ScrollArea>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedConcept.title}</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Badge variant="outline" className="mt-1 capitalize">{selectedConcept.concept_type}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Art Style</Label>
                    <Badge variant="secondary" className="mt-1 capitalize">{selectedConcept.art_style}</Badge>
                  </div>
                </div>

                {selectedConcept.tags && selectedConcept.tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedConcept.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedConcept.scenes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Primary Scene</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="gap-1">
                        <Clapperboard className="h-3 w-3" />
                        Scene {selectedConcept.scenes.scene_number}
                      </Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        {selectedConcept.scenes.slugline}
                      </span>
                    </div>
                  </div>
                )}

                {/* Scenes using this concept (via tags) */}
                {selectedConcept.tags && selectedConcept.tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Referenced in Scenes</Label>
                    <div className="mt-1 space-y-1">
                      {findScenesForAssetTags(selectedConcept.tags).map(scene => (
                        <div key={scene.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                          <Clapperboard className="h-3 w-3 text-primary" />
                          <span className="font-medium">Scene {scene.scene_number}</span>
                          <span className="text-muted-foreground truncate">{scene.slugline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
