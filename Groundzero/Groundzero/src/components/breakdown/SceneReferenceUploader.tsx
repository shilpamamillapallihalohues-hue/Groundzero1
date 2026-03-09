import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  Image, 
  Loader2, 
  X, 
  Link as LinkIcon,
  MapPin,
  User,
  Package,
  Trees,
  Car,
  Shirt,
  Plus,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES = [
  { value: 'location', label: 'Location', icon: MapPin, color: 'text-blue-400' },
  { value: 'character', label: 'Character', icon: User, color: 'text-green-400' },
  { value: 'prop', label: 'Prop', icon: Package, color: 'text-yellow-400' },
  { value: 'environment', label: 'Environment', icon: Trees, color: 'text-emerald-400' },
  { value: 'vehicle', label: 'Vehicle', icon: Car, color: 'text-orange-400' },
  { value: 'costume', label: 'Costume', icon: Shirt, color: 'text-pink-400' },
  { value: 'general', label: 'General', icon: Image, color: 'text-muted-foreground' },
];

interface SceneReference {
  id: string;
  title: string | null;
  image_url: string;
  source_type: string;
  category: string;
  description: string | null;
  asset_tags: string[] | null;
  created_at: string;
}

interface DynamicSceneAsset {
  name: string;
  category: 'character' | 'prop' | 'location' | 'costume';
}

interface SceneReferenceUploaderProps {
  sceneId: string;
  projectId: string;
  onReferencesChange?: (refs: SceneReference[]) => void;
}

export function SceneReferenceUploader({ sceneId, projectId, onReferencesChange }: SceneReferenceUploaderProps) {
  const [references, setReferences] = useState<SceneReference[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedAssetTags, setSelectedAssetTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch scene data for dynamic assets (characters, props, location, costumes)
  const { data: sceneData } = useQuery({
    queryKey: ['scene-data-for-reference-tagging', sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('characters, props, location, costumes')
        .eq('id', sceneId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId
  });

  // Build dynamic scene assets from scene data
  const dynamicSceneAssets: DynamicSceneAsset[] = useMemo(() => {
    if (!sceneData) return [];
    
    const assets: DynamicSceneAsset[] = [];
    
    // Add characters
    if (sceneData.characters && Array.isArray(sceneData.characters)) {
      sceneData.characters.forEach((char: string) => {
        if (char) assets.push({ name: char, category: 'character' });
      });
    }
    
    // Add props
    if (sceneData.props && Array.isArray(sceneData.props)) {
      sceneData.props.forEach((prop: string) => {
        if (prop) assets.push({ name: prop, category: 'prop' });
      });
    }
    
    // Add location
    if (sceneData.location) {
      assets.push({ name: sceneData.location, category: 'location' });
    }
    
    // Add costumes
    if (sceneData.costumes && Array.isArray(sceneData.costumes)) {
      sceneData.costumes.forEach((costume: string) => {
        if (costume) assets.push({ name: costume, category: 'costume' });
      });
    }
    
    return assets;
  }, [sceneData]);

  // Group assets by category for display
  const groupedAssets = useMemo(() => {
    const grouped: Record<string, string[]> = {
      character: [],
      prop: [],
      location: [],
      costume: [],
    };
    
    dynamicSceneAssets.forEach(asset => {
      if (grouped[asset.category]) {
        grouped[asset.category].push(asset.name);
      }
    });
    
    return grouped;
  }, [dynamicSceneAssets]);

  // Get all unique asset names for tagging
  const allAssetNames = useMemo(() => 
    dynamicSceneAssets.map(a => a.name),
    [dynamicSceneAssets]
  );

  // Load existing references
  useEffect(() => {
    loadReferences();
  }, [sceneId]);

  const loadReferences = async () => {
    if (!sceneId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scene_references')
        .select('*')
        .eq('scene_id', sceneId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferences(data || []);
      onReferencesChange?.(data || []);
    } catch (error) {
      console.error('Error loading references:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAssetTag = (name: string) => {
    setSelectedAssetTags(prev => 
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileName = `scenes/${sceneId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(uploadData.path);

      // Save to database
      const { data: refData, error: refError } = await supabase
        .from('scene_references')
        .insert({
          scene_id: sceneId,
          project_id: projectId,
          title: file.name,
          image_url: publicUrl,
          source_type: 'upload',
          category: selectedCategory,
          asset_tags: selectedAssetTags.length > 0 ? selectedAssetTags : null,
        })
        .select()
        .single();

      if (refError) throw refError;

      const newRef: SceneReference = refData;
      const updated = [newRef, ...references];
      setReferences(updated);
      onReferencesChange?.(updated);
      setSelectedAssetTags([]);
      toast.success('Reference uploaded!');
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
      toast.error('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsUploading(true);
    try {
      // Save URL reference to database
      const { data: refData, error: refError } = await supabase
        .from('scene_references')
        .insert({
          scene_id: sceneId,
          project_id: projectId,
          title: 'URL Reference',
          image_url: urlInput.trim(),
          source_type: 'url',
          category: selectedCategory,
          asset_tags: selectedAssetTags.length > 0 ? selectedAssetTags : null,
        })
        .select()
        .single();

      if (refError) throw refError;

      const newRef: SceneReference = refData;
      const updated = [newRef, ...references];
      setReferences(updated);
      onReferencesChange?.(updated);
      setUrlInput('');
      setShowUrlInput(false);
      setSelectedAssetTags([]);
      toast.success('Reference added from URL!');
    } catch (error) {
      console.error('URL add error:', error);
      toast.error('Failed to add reference');
    } finally {
      setIsUploading(false);
    }
  };

  const removeReference = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scene_references')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = references.filter(r => r.id !== id);
      setReferences(updated);
      onReferencesChange?.(updated);
      toast.success('Reference removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove reference');
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[6];
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Image className="h-4 w-4 text-primary" />
          Scene References
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selector */}
        <div className="flex items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px] h-8">
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-8"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="h-8"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            URL
          </Button>
        </div>

        {/* Dynamic Asset Tags Section - Grouped by Category */}
        {allAssetNames.length > 0 && (
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs">
              <Tag className="h-3 w-3" />
              Tag to Scene Assets
            </Label>
            
            {/* Characters */}
            {groupedAssets.character.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> Characters
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {groupedAssets.character.map(name => (
                    <Badge
                      key={`char-${name}`}
                      variant={selectedAssetTags.includes(name) ? "default" : "outline"}
                      className="cursor-pointer text-xs border-green-500/30 hover:border-green-500"
                      onClick={() => toggleAssetTag(name)}
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Props */}
            {groupedAssets.prop.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-yellow-400 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Props
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {groupedAssets.prop.map(name => (
                    <Badge
                      key={`prop-${name}`}
                      variant={selectedAssetTags.includes(name) ? "default" : "outline"}
                      className="cursor-pointer text-xs border-yellow-500/30 hover:border-yellow-500"
                      onClick={() => toggleAssetTag(name)}
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Location */}
            {groupedAssets.location.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {groupedAssets.location.map(name => (
                    <Badge
                      key={`loc-${name}`}
                      variant={selectedAssetTags.includes(name) ? "default" : "outline"}
                      className="cursor-pointer text-xs border-blue-500/30 hover:border-blue-500"
                      onClick={() => toggleAssetTag(name)}
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Costumes */}
            {groupedAssets.costume.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-pink-400 flex items-center gap-1">
                  <Shirt className="h-3 w-3" /> Costumes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {groupedAssets.costume.map(name => (
                    <Badge
                      key={`costume-${name}`}
                      variant={selectedAssetTags.includes(name) ? "default" : "outline"}
                      className="cursor-pointer text-xs border-pink-500/30 hover:border-pink-500"
                      onClick={() => toggleAssetTag(name)}
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {selectedAssetTags.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Selected: {selectedAssetTags.join(', ')}
              </div>
            )}
          </div>
        )}

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
              placeholder="Paste image URL from Google, Pinterest, etc..."
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <Button 
              size="sm" 
              onClick={handleUrlSubmit} 
              disabled={isUploading}
              className="h-8"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowUrlInput(false); setUrlInput(''); }}
              className="h-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Reference Grid */}
        {references.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {references.map(ref => {
              const catInfo = getCategoryInfo(ref.category);
              return (
                <div
                  key={ref.id}
                  className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted/30"
                >
                  <img
                    src={ref.image_url}
                    alt={ref.title || 'Reference'}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Category Badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-1 left-1 text-xs py-0 px-1.5 gap-1"
                  >
                    <catInfo.icon className={`h-2.5 w-2.5 ${catInfo.color}`} />
                    {catInfo.label}
                  </Badge>

                  {/* Source Badge */}
                  {ref.source_type === 'url' && (
                    <Badge 
                      variant="outline" 
                      className="absolute top-1 right-6 text-xs py-0 px-1 bg-background/80"
                    >
                      <LinkIcon className="h-2 w-2" />
                    </Badge>
                  )}

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-0.5 right-0.5 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 hover:bg-destructive text-white"
                    onClick={() => removeReference(ref.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  {/* Asset Tags & Title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ref.asset_tags && ref.asset_tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mb-0.5">
                        {ref.asset_tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[8px] py-0 px-1 bg-background/60 text-white border-white/30">
                            {tag}
                          </Badge>
                        ))}
                        {ref.asset_tags.length > 2 && (
                          <Badge variant="outline" className="text-[8px] py-0 px-1 bg-background/60 text-white border-white/30">
                            +{ref.asset_tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-white truncate">{ref.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No references yet</p>
            <p className="text-xs mt-1">Upload images or add URLs for location, characters, props, etc.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
