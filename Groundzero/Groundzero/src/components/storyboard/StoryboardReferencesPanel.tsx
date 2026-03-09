import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Clapperboard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    scene_number: string | null;
    slugline: string | null;
  };
}

interface SceneAsset {
  id: string;
  name: string;
  category: string;
  scene_id: string;
}

interface StoryboardReferencesPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectReference?: (ref: SceneReference) => void;
}

export function StoryboardReferencesPanel({ 
  projectId, 
  isOpen, 
  onClose,
  onSelectReference 
}: StoryboardReferencesPanelProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedAssetTags, setSelectedAssetTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch all references for the project
  const { data: references = [], isLoading: referencesLoading } = useQuery({
    queryKey: ['project-references', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scene_references')
        .select(`
          *,
          scenes(scene_number, slugline)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SceneReference[];
    },
    enabled: !!projectId && isOpen
  });

  // Fetch scenes for the project
  const { data: scenes = [] } = useQuery({
    queryKey: ['project-scenes-for-references', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', projectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && isOpen
  });

  // Fetch scene assets for tagging
  const { data: sceneAssets = [] } = useQuery({
    queryKey: ['scene-assets-for-tagging', projectId, selectedSceneId],
    queryFn: async () => {
      let query = supabase
        .from('scene_assets')
        .select('id, name, category, scene_id')
        .eq('project_id', projectId);
      
      if (selectedSceneId) {
        query = query.eq('scene_id', selectedSceneId);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && isOpen
  });

  // Group references by scene
  const referencesByScene = references.reduce((acc, ref) => {
    const sceneNum = ref.scenes?.scene_number || 'unassigned';
    if (!acc[sceneNum]) acc[sceneNum] = [];
    acc[sceneNum].push(ref);
    return acc;
  }, {} as Record<string, SceneReference[]>);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSceneId) {
      toast.error('Please select a scene first');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `scenes/${selectedSceneId}/${Date.now()}-${file.name}`;
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
          scene_id: selectedSceneId,
          project_id: projectId,
          title: file.name,
          image_url: publicUrl,
          source_type: 'upload',
          category: selectedCategory,
          asset_tags: selectedAssetTags.length > 0 ? selectedAssetTags : null,
        });

      if (refError) throw refError;

      queryClient.invalidateQueries({ queryKey: ['project-references', projectId] });
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
    if (!urlInput.trim() || !selectedSceneId) {
      toast.error('Please enter a URL and select a scene');
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
          scene_id: selectedSceneId,
          project_id: projectId,
          title: 'URL Reference',
          image_url: urlInput.trim(),
          source_type: 'url',
          category: selectedCategory,
          asset_tags: selectedAssetTags.length > 0 ? selectedAssetTags : null,
        });

      if (refError) throw refError;

      queryClient.invalidateQueries({ queryKey: ['project-references', projectId] });
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

  // Get unique asset names
  const uniqueAssets = Array.from(new Set(sceneAssets.map(a => a.name)));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Project References
          </SheetTitle>
          <SheetDescription>
            All scene references organized by scene. These are used for storyboard generation.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Add Reference Button */}
          <Button 
            onClick={() => setShowUploadForm(!showUploadForm)} 
            variant={showUploadForm ? "secondary" : "default"}
            className="w-full"
          >
            {showUploadForm ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Reference
              </>
            )}
          </Button>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              {/* Scene Selection */}
              <div className="space-y-2">
                <Label>Scene</Label>
                <Select value={selectedSceneId || ''} onValueChange={setSelectedSceneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scene" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes.map(scene => (
                      <SelectItem key={scene.id} value={scene.id}>
                        <div className="flex items-center gap-2">
                          <Clapperboard className="h-3 w-3" />
                          Scene {scene.scene_number}: {scene.slugline?.substring(0, 30)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
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
              {selectedSceneId && uniqueAssets.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Tag to Assets (optional)
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {uniqueAssets.map(name => (
                      <Badge
                        key={name}
                        variant={selectedAssetTags.includes(name) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleAssetTag(name)}
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Methods */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !selectedSceneId}
                  className="flex-1"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  disabled={!selectedSceneId}
                  className="flex-1"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Add URL
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* URL Input */}
              {showUrlInput && (
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  />
                  <Button size="sm" onClick={handleUrlSubmit} disabled={isUploading}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* References List */}
          <ScrollArea className="h-[calc(100vh-350px)]">
            {referencesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : references.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No references yet</p>
                <p className="text-sm mt-1">Add references to use in storyboard generation</p>
              </div>
            ) : (
              <div className="space-y-6 pr-4">
                {Object.entries(referencesByScene).sort((a, b) => {
                  if (a[0] === 'unassigned') return 1;
                  if (b[0] === 'unassigned') return -1;
                  return Number(a[0]) - Number(b[0]);
                }).map(([sceneNum, sceneRefs]) => (
                  <div key={sceneNum}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clapperboard className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {sceneNum === 'unassigned' ? 'Unassigned' : `Scene ${sceneNum}`}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {sceneRefs.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {sceneRefs.map(ref => {
                        const catInfo = getCategoryInfo(ref.category);
                        return (
                          <div
                            key={ref.id}
                            className="relative group rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                            onClick={() => onSelectReference?.(ref)}
                          >
                            <img
                              src={ref.image_url}
                              alt={ref.title || 'Reference'}
                              className="w-full h-20 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Category Badge */}
                            <Badge 
                              variant="secondary" 
                              className="absolute top-1 left-1 text-[10px] py-0 px-1 gap-0.5"
                            >
                              <catInfo.icon className={`h-2.5 w-2.5 ${catInfo.color}`} />
                            </Badge>

                            {/* Asset Tags */}
                            {ref.asset_tags && ref.asset_tags.length > 0 && (
                              <div className="absolute bottom-1 left-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
