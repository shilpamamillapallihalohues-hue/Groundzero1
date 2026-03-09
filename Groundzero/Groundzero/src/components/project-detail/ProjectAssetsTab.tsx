import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Upload, Trash2, Download, 
  Box, Tag, Clapperboard, User, MapPin, Palette, Loader2,
  Search, X, FileText, Image as ImageIcon, 
  CheckCircle, Send, Eye, ChevronRight, Shirt, Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';
const ModelViewerWithAnnotations = lazy(() => import('@/components/models/ModelViewerWithAnnotations').then(mod => ({ default: mod.ModelViewerWithAnnotations })));
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

interface ProjectAsset {
  id: string;
  title: string;
  description: string | null;
  asset_type: string;
  file_url: string | null;
  file_name: string | null;
  thumbnail_url: string | null;
  status: string;
  department: string | null;
  tags: string[];
  created_at: string;
  project_id: string;
  approved_by: string | null;
  approved_at: string | null;
  metadata?: {
    runtime?: string;
    polycount?: number;
    format?: string;
    dimensions?: string;
    linked_production_asset_id?: string;
    linked_production_asset_name?: string;
    asset_category?: string;
  };
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
}

interface Character {
  name: string;
  id?: string;
}

interface BreakdownAsset {
  id: string;
  name: string;
  type: 'concept' | 'proxy';
  concept_type?: string;
  description: string | null;
  image_url: string | null;
  status: string | null;
}

interface ProjectAssetsTabProps {
  projectId: string;
}

const ASSET_TYPES = [
  { value: '3d_model', label: '3D Model', icon: Box, accept: '.glb,.gltf,.fbx,.obj' },
  { value: 'reference_image', label: 'Reference Image', icon: ImageIcon, accept: 'image/*' },
  { value: 'texture', label: 'Texture', icon: Palette, accept: 'image/*' },
  { value: 'document', label: 'Document', icon: FileText, accept: '.pdf,.doc,.docx' },
];

const ASSET_CATEGORIES = [
  { value: 'character', label: 'Characters', icon: User, description: 'Character models and rigs' },
  { value: 'creature', label: 'Creatures', icon: Package, description: 'Creatures and animals' },
  { value: 'prop', label: 'Props', icon: Package, description: 'Props and objects' },
  { value: 'environment', label: 'Environments', icon: MapPin, description: 'Locations and sets' },
  { value: 'vehicle', label: 'Vehicles', icon: Box, description: 'Vehicles and transportation' },
  { value: 'fx_element', label: 'FX Elements', icon: Palette, description: 'Visual effects elements' },
  { value: 'other', label: 'Other', icon: Palette, description: 'Other asset types' },
] as const;

type AssetCategory = typeof ASSET_CATEGORIES[number]['value'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/20 text-blue-500',
  review: 'bg-amber-500/20 text-amber-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-destructive/20 text-destructive',
};

export function ProjectAssetsTab({ projectId }: ProjectAssetsTabProps) {
  const { role, isAdmin } = useUserRole();
  const canApprove = isAdmin || ['director', 'producer', 'hod', 'super_user'].includes(role || '');
  
  const [selectedAsset, setSelectedAsset] = useState<ProjectAsset | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Upload workflow state
  const [uploadStep, setUploadStep] = useState<'type' | 'category' | 'select' | 'details'>('type');
  const [formAssetType, setFormAssetType] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formLinkedAssetId, setFormLinkedAssetId] = useState('');
  const [formLinkedAssetName, setFormLinkedAssetName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formTags, setFormTags] = useState<string[]>([]);

  // Fetch assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['project-assets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_deliverables')
        .select('*')
        .eq('project_id', projectId)
        .in('asset_type', ['3d_model', 'model', 'reference_image', 'texture', 'document'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ProjectAsset[];
    },
  });

  // Fetch scenes for tagging
  const { data: scenes = [] } = useQuery({
    queryKey: ['project-scenes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', projectId)
        .order('scene_number');

      if (error) throw error;
      return (data || []) as Scene[];
    },
  });

  // Fetch characters from scenes
  const { data: characters = [] } = useQuery({
    queryKey: ['project-characters', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('characters')
        .eq('project_id', projectId);

      if (error) throw error;
      
      const allCharacters = new Set<string>();
      data?.forEach(scene => {
        if (scene.characters) {
          (scene.characters as string[]).forEach(c => allCharacters.add(c));
        }
      });
      
      return Array.from(allCharacters).map(name => ({ name })) as Character[];
    },
  });

  // Fetch breakdown assets for linking (from scenes breakdown + concept_arts + character_proxies)
  const { data: breakdownAssets = [], isLoading: breakdownLoading } = useQuery({
    queryKey: ['breakdown-assets', projectId, formCategory],
    queryFn: async () => {
      if (!projectId || !formCategory || formCategory === 'other') return [];
      
      const assets: BreakdownAsset[] = [];
      const seenNames = new Set<string>();
      
      // First, fetch breakdown items from scenes table (these are the parsed script items)
      if (formCategory === 'character' || formCategory === 'prop') {
        const { data: scenes, error: scenesError } = await supabase
          .from('scenes')
          .select('id, scene_number, characters, props')
          .eq('project_id', projectId);
        
        if (scenesError) {
          console.error('Error fetching scenes:', scenesError);
        }
        
        if (scenes) {
          scenes.forEach(scene => {
            if (formCategory === 'character' && scene.characters) {
              (scene.characters as string[]).forEach(charName => {
                const normalizedName = charName.toLowerCase().trim();
                if (!seenNames.has(normalizedName) && charName.trim()) {
                  seenNames.add(normalizedName);
                  assets.push({
                    id: `breakdown-char-${normalizedName}`,
                    name: charName.trim(),
                    type: 'concept',
                    concept_type: 'character',
                    description: `Character from scene ${scene.scene_number}`,
                    image_url: null,
                    status: 'breakdown',
                  });
                }
              });
            }
            if (formCategory === 'prop' && scene.props) {
              (scene.props as string[]).forEach(propName => {
                const normalizedName = propName.toLowerCase().trim();
                if (!seenNames.has(normalizedName) && propName.trim()) {
                  seenNames.add(normalizedName);
                  assets.push({
                    id: `breakdown-prop-${normalizedName}`,
                    name: propName.trim(),
                    type: 'concept',
                    concept_type: 'prop',
                    description: `Prop from scene ${scene.scene_number}`,
                    image_url: null,
                    status: 'breakdown',
                  });
                }
              });
            }
          });
        }
      }
      
      // Map form category to concept_type for concept_arts
      const conceptTypeMap: Record<string, string> = {
        'character': 'character',
        'creature': 'creature',
        'prop': 'prop',
        'environment': 'environment',
        'vehicle': 'vehicle',
        'fx_element': 'vfx',
      };
      
      const conceptType = conceptTypeMap[formCategory];
      
      if (conceptType) {
        // Fetch from concept_arts table (generated concepts)
        const { data: concepts, error: conceptsError } = await supabase
          .from('concept_arts')
          .select('id, title, concept_type, description, image_url, status')
          .eq('project_id', projectId)
          .eq('concept_type', conceptType as any)
          .order('title');
        
        if (conceptsError) {
          console.error('Error fetching concept arts:', conceptsError);
        }
        
        if (concepts) {
          concepts.forEach(c => {
            const normalizedName = c.title.toLowerCase().trim();
            // Only add if not already in breakdown
            if (!seenNames.has(normalizedName)) {
              seenNames.add(normalizedName);
              assets.push({
                id: c.id,
                name: c.title,
                type: 'concept',
                concept_type: c.concept_type,
                description: c.description,
                image_url: c.image_url,
                status: c.status,
              });
            }
          });
        }
      }
      
      // For characters, also fetch from character_proxies
      if (formCategory === 'character') {
        const { data: proxies, error: proxiesError } = await supabase
          .from('character_proxies')
          .select('id, name, front_view_url, status')
          .eq('project_id', projectId)
          .order('name');
        
        if (proxiesError) {
          console.error('Error fetching character proxies:', proxiesError);
        }
        
        if (proxies) {
          proxies.forEach(p => {
            const normalizedName = p.name.toLowerCase().trim();
            if (!seenNames.has(normalizedName)) {
              seenNames.add(normalizedName);
              assets.push({
                id: p.id,
                name: p.name,
                type: 'proxy',
                description: null,
                image_url: p.front_view_url,
                status: p.status,
              });
            }
          });
        }
      }
      
      // Sort alphabetically by name
      return assets.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!projectId && !!formCategory && formCategory !== 'other',
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle || !formAssetType) {
        throw new Error('Please fill in all required fields');
      }

      let fileUrl = null;
      let fileName = null;

      if (formFile) {
        const fileExt = formFile.name.split('.').pop();
        const filePath = `${projectId}/assets/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project-deliverables')
          .upload(filePath, formFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('project-deliverables')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = formFile.name;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      // Build tags including linked asset info
      const allTags = [...formTags];
      if (formCategory) {
        allTags.push(`category:${formCategory}`);
      }
      if (formLinkedAssetName) {
        allTags.push(`linked:${formLinkedAssetName}`);
      }

      const insertPayload: Record<string, unknown> = {
        project_id: projectId,
        title: formTitle,
        description: formDescription || null,
        asset_type: formAssetType,
        department: 'General',
        file_url: fileUrl,
        file_name: fileName,
        tags: allTags,
        status: 'pending',
        created_by: profile?.id || null,
        metadata: {
          asset_category: formCategory,
          linked_production_asset_id: formLinkedAssetId || null,
          linked_production_asset_name: formLinkedAssetName || null,
        },
      };

      // @ts-ignore
      const { error } = await supabase
        .from('project_deliverables')
        .insert(insertPayload as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset uploaded successfully');
      setUploadDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload asset');
    },
  });

  // Send for approval mutation
  const sendForApprovalMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from('project_deliverables')
        .update({ status: 'review' })
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset sent for approval');
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: () => {
      toast.error('Failed to send for approval');
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      const { error } = await supabase
        .from('project_deliverables')
        .update({ 
          status: 'approved',
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset approved');
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: () => {
      toast.error('Failed to approve asset');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from('project_deliverables')
        .update({ status: 'rejected' })
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset rejected');
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: () => {
      toast.error('Failed to reject asset');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from('project_deliverables')
        .delete()
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset deleted');
      setSelectedAsset(null);
      setViewerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: () => {
      toast.error('Failed to delete asset');
    },
  });

  // Update tags mutation
  const updateTagsMutation = useMutation({
    mutationFn: async ({ assetId, tags }: { assetId: string; tags: string[] }) => {
      const { error } = await supabase
        .from('project_deliverables')
        .update({ tags })
        .eq('id', assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tags updated');
      setTagDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: () => {
      toast.error('Failed to update tags');
    },
  });

  const resetForm = () => {
    setUploadStep('type');
    setFormAssetType('');
    setFormCategory('');
    setFormLinkedAssetId('');
    setFormLinkedAssetName('');
    setFormTitle('');
    setFormDescription('');
    setFormFile(null);
    setFormTags([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFile(file);
      if (!formTitle) {
        setFormTitle(file.name.split('.')[0].replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSelectAssetType = (type: string) => {
    setFormAssetType(type);
    if (type === '3d_model') {
      setUploadStep('category');
    } else {
      setUploadStep('details');
    }
  };

  const handleSelectCategory = (category: string) => {
    setFormCategory(category);
    if (category === 'other') {
      setUploadStep('details');
    } else {
      setUploadStep('select');
    }
  };

  const handleSelectBreakdownAsset = (asset: BreakdownAsset | null) => {
    if (asset) {
      setFormLinkedAssetId(asset.id);
      setFormLinkedAssetName(asset.name);
      setFormTitle(asset.name);
    } else {
      setFormLinkedAssetId('');
      setFormLinkedAssetName('');
    }
    setUploadStep('details');
  };

  const filteredAssets = assets.filter(asset => {
    const matchesType = assetTypeFilter === 'all' || asset.asset_type === assetTypeFilter;
    const matchesSearch = !searchQuery || 
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getAssetIcon = (type: string) => {
    const assetType = ASSET_TYPES.find(t => t.value === type);
    return assetType?.icon || Box;
  };

  if (assetsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Assets</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage 3D models, textures, and references
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {uploadStep === 'type' && 'Select Asset Type'}
                {uploadStep === 'category' && 'Select Category'}
                {uploadStep === 'select' && 'Link to Project Asset'}
                {uploadStep === 'details' && 'Upload Details'}
              </DialogTitle>
              <DialogDescription>
                {uploadStep === 'type' && 'What type of asset are you uploading?'}
                {uploadStep === 'category' && 'What category does this 3D model belong to?'}
                {uploadStep === 'select' && 'Select an existing asset to link, or skip to upload a new one'}
                {uploadStep === 'details' && 'Provide details and upload your file'}
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Asset Type Selection */}
            {uploadStep === 'type' && (
              <div className="grid grid-cols-2 gap-3 py-4">
                {ASSET_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.value}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectAssetType(type.value)}
                    >
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <Icon className="h-8 w-8 text-primary" />
                        <span className="font-medium text-sm">{type.label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Step 2: Category Selection (for 3D models) */}
            {uploadStep === 'category' && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {ASSET_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <Card
                        key={cat.value}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleSelectCategory(cat.value)}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                          <Icon className="h-6 w-6 text-primary" />
                          <span className="font-medium text-sm">{cat.label}</span>
                          <span className="text-xs text-muted-foreground">{cat.description}</span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setUploadStep('type')}>
                  Back
                </Button>
              </div>
            )}

            {/* Step 3: Select Breakdown Asset to Link */}
            {uploadStep === 'select' && (
              <div className="space-y-4 py-4">
                <ScrollArea className="h-[300px] border rounded-lg">
                  {breakdownLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-spin" />
                      <p className="text-muted-foreground">Loading {formCategory} assets...</p>
                    </div>
                  ) : breakdownAssets.length > 0 ? (
                    <div className="p-2 space-y-2">
                      {breakdownAssets.map(asset => (
                        <Card
                          key={asset.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => handleSelectBreakdownAsset(asset)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            {asset.image_url ? (
                              <img 
                                src={asset.image_url} 
                                alt={asset.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <Box className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{asset.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {asset.type === 'concept' ? 'Concept Art' : 'Character Proxy'}
                                </Badge>
                                {asset.status && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {asset.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No {formCategory} assets in this project yet</p>
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setUploadStep('category')}>
                    Back
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleSelectBreakdownAsset(null)}>
                    Skip & Upload New
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Upload Details */}
            {uploadStep === 'details' && (
              <div className="space-y-4 py-4">
                {/* Show linked asset info */}
                {formLinkedAssetName && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Linking to:</p>
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{formLinkedAssetName}</span>
                      <Badge variant="outline" className="text-xs capitalize">{formCategory}</Badge>
                    </div>
                  </div>
                )}

                <div>
                  <Label>File *</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept={ASSET_TYPES.find(t => t.value === formAssetType)?.accept || '*'}
                    onChange={handleFileChange}
                  />
                  {formFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formFile.name} ({(formFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Asset name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe this asset..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {uploadStep === 'details' && (
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  if (formAssetType === '3d_model') {
                    setUploadStep(formCategory === 'other' ? 'category' : 'select');
                  } else {
                    setUploadStep('type');
                  }
                }}>
                  Back
                </Button>
                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploadMutation.isPending || !formFile || !formTitle}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ASSET_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload 3D models, textures, or reference images
            </p>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload First Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map(asset => {
            const AssetIcon = getAssetIcon(asset.asset_type);
            const is3D = asset.asset_type === '3d_model' || asset.asset_type === 'model';
            const metadata = asset.metadata as ProjectAsset['metadata'];
            
            return (
              <Card
                key={asset.id}
                className={cn(
                  "overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                  selectedAsset?.id === asset.id && "ring-2 ring-primary"
                )}
                onClick={() => {
                  setSelectedAsset(asset);
                  if (is3D && asset.file_url) {
                    setViewerOpen(true);
                  }
                }}
              >
                {/* Preview */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {asset.thumbnail_url ? (
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : is3D ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Box className="h-12 w-12 text-primary/50" />
                    </div>
                  ) : asset.file_url && asset.asset_type === 'reference_image' ? (
                    <img
                      src={asset.file_url}
                      alt={asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AssetIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2">
                    <Badge className={STATUS_COLORS[asset.status] || STATUS_COLORS.pending}>
                      {asset.status?.replace('_', ' ') || 'Pending'}
                    </Badge>
                  </div>
                  
                  {is3D && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Box className="h-3 w-3" />
                        3D
                      </Badge>
                      {metadata?.asset_category && (
                        <Badge variant="outline" className="text-xs capitalize bg-background/80">
                          {metadata.asset_category}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-medium line-clamp-1">{asset.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {metadata?.linked_production_asset_name || asset.description || asset.file_name || 'No description'}
                    </p>
                  </div>

                  {/* Tags */}
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag.replace('category:', '').replace('linked:', '')}
                        </Badge>
                      ))}
                      {asset.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{asset.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {asset.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendForApprovalMutation.mutate(asset.id);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    )}
                    {asset.status === 'review' && canApprove && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            approveMutation.mutate(asset.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectMutation.mutate(asset.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {asset.status === 'approved' && (
                      <Badge variant="secondary" className="flex-1 justify-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAsset(asset);
                        setTagDialogOpen(true);
                      }}
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                    {is3D && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                          setViewerOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 3D Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <div className="flex h-full">
            {/* Viewer */}
            <div className="flex-1 flex flex-col">
              <DialogHeader className="p-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-primary" />
                  {selectedAsset?.title}
                  <Badge className={STATUS_COLORS[selectedAsset?.status || 'pending']}>
                    {selectedAsset?.status?.replace('_', ' ')}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1">
                {selectedAsset?.file_url && (
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                    <ModelViewerWithAnnotations
                      modelUrl={selectedAsset.file_url}
                      deliverableId={selectedAsset.id}
                      projectId={projectId}
                      modelName={selectedAsset.title}
                      height="100%"
                      canEdit={true}
                    />
                  </Suspense>
                )}
              </div>
              
              {/* Approval Actions for Directors */}
              {selectedAsset?.status === 'review' && canApprove && (
                <div className="p-4 border-t flex items-center gap-2 bg-muted/50">
                  <p className="text-sm text-muted-foreground flex-1">
                    This asset is awaiting your approval
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => rejectMutation.mutate(selectedAsset.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button onClick={() => approveMutation.mutate(selectedAsset.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve Asset
                  </Button>
                </div>
              )}
            </div>

            {/* Details Panel */}
            <div className="w-80 border-l flex flex-col shrink-0 bg-card/50">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Asset Details</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                {selectedAsset && (
                  <div className="space-y-4">
                    {/* Linked Asset Info */}
                    {(selectedAsset.metadata as any)?.linked_production_asset_name && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Linked to:</p>
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {(selectedAsset.metadata as any).linked_production_asset_name}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm">{selectedAsset.description || 'No description'}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">File</Label>
                      <p className="text-sm">{selectedAsset.file_name}</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Badge className={STATUS_COLORS[selectedAsset.status]}>
                        {selectedAsset.status?.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Scenes where used */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Used in Scenes</Label>
                      <div className="mt-1 space-y-1">
                        {selectedAsset.tags?.filter(t => t.startsWith('scene:')).length ? (
                          selectedAsset.tags
                            .filter(t => t.startsWith('scene:'))
                            .map(t => (
                              <Badge key={t} variant="secondary" className="text-xs mr-1">
                                <Clapperboard className="h-3 w-3 mr-1" />
                                {t.replace('scene:', '')}
                              </Badge>
                            ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Not linked to any scene</p>
                        )}
                      </div>
                    </div>

                    {/* Characters */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Characters</Label>
                      <div className="mt-1 space-y-1">
                        {selectedAsset.tags?.filter(t => t.startsWith('character:')).length ? (
                          selectedAsset.tags
                            .filter(t => t.startsWith('character:'))
                            .map(t => (
                              <Badge key={t} variant="secondary" className="text-xs mr-1">
                                <User className="h-3 w-3 mr-1" />
                                {t.replace('character:', '')}
                              </Badge>
                            ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Not linked to any character</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p className="text-sm">
                        {new Date(selectedAsset.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setTagDialogOpen(true)}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        Manage Tags
                      </Button>
                      {selectedAsset.file_url && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(selectedAsset.file_url!, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          if (confirm('Delete this asset?')) {
                            deleteMutation.mutate(selectedAsset.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Asset
                      </Button>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tag Asset</DialogTitle>
            <DialogDescription>
              Link this asset to characters, scenes, props, or locations
            </DialogDescription>
          </DialogHeader>
          
          {selectedAsset && (
            <Tabs defaultValue="scene" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="scene">Scenes</TabsTrigger>
                <TabsTrigger value="character">Characters</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="scene" className="mt-4">
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {scenes.length > 0 ? (
                    <div className="space-y-2">
                      {scenes.map(scene => {
                        const tagValue = `scene:${scene.slugline}`;
                        const isChecked = selectedAsset.tags?.includes(tagValue);
                        return (
                          <div
                            key={scene.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentTags = selectedAsset.tags || [];
                                const newTags = checked
                                  ? [...currentTags, tagValue]
                                  : currentTags.filter(t => t !== tagValue);
                                updateTagsMutation.mutate({
                                  assetId: selectedAsset.id,
                                  tags: newTags,
                                });
                                setSelectedAsset({ ...selectedAsset, tags: newTags });
                              }}
                            />
                            <Clapperboard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Scene {scene.scene_number}: {scene.slugline}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No scenes in this project
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="character" className="mt-4">
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {characters.length > 0 ? (
                    <div className="space-y-2">
                      {characters.map(char => {
                        const tagValue = `character:${char.name}`;
                        const isChecked = selectedAsset.tags?.includes(tagValue);
                        return (
                          <div
                            key={char.name}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const currentTags = selectedAsset.tags || [];
                                const newTags = checked
                                  ? [...currentTags, tagValue]
                                  : currentTags.filter(t => t !== tagValue);
                                updateTagsMutation.mutate({
                                  assetId: selectedAsset.id,
                                  tags: newTags,
                                });
                                setSelectedAsset({ ...selectedAsset, tags: newTags });
                              }}
                            />
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{char.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No characters found in scenes
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="custom" className="mt-4 space-y-4">
                <div>
                  <Label>Add Custom Tags</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Enter tag name..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const value = input.value.trim();
                          if (value) {
                            const currentTags = selectedAsset.tags || [];
                            if (!currentTags.includes(value)) {
                              const newTags = [...currentTags, value];
                              updateTagsMutation.mutate({
                                assetId: selectedAsset.id,
                                tags: newTags,
                              });
                              setSelectedAsset({ ...selectedAsset, tags: newTags });
                            }
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Current Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAsset.tags?.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 cursor-pointer"
                        onClick={() => {
                          const newTags = selectedAsset.tags?.filter(t => t !== tag) || [];
                          updateTagsMutation.mutate({
                            assetId: selectedAsset.id,
                            tags: newTags,
                          });
                          setSelectedAsset({ ...selectedAsset, tags: newTags });
                        }}
                      >
                        {tag}
                        <X className="h-3 w-3" />
                      </Badge>
                    )) || <span className="text-sm text-muted-foreground">No tags</span>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button onClick={() => setTagDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}