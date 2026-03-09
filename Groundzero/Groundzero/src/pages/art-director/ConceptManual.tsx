import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Image, Tag, X, Loader2, Check, ChevronRight, Clock, Film } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

const CONCEPT_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment / Location' },
  { value: 'costume', label: 'Costume' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'creature', label: 'Creature' },
];

export default function ConceptManual() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cascading selection state
  const [conceptType, setConceptType] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [description, setDescription] = useState('');

  // Fetch projects
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

  // Fetch scenes with assets
  const { data: scenes } = useQuery({
    queryKey: ['ad-scenes-with-assets', activeProjectId],
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

  // Extract assets by type from scenes with scene count and runtime
  const assetsByType = useMemo(() => {
    const result: Record<string, { name: string; sceneCount: number; totalRuntime: number }[]> = {
      character: [],
      prop: [],
      environment: [],
      costume: [],
      vehicle: [],
      creature: [],
    };

    const assetMap: Record<string, Record<string, { sceneIds: Set<string>; totalRuntime: number }>> = {
      character: {},
      prop: {},
      environment: {},
      costume: {},
      vehicle: {},
      creature: {},
    };

    scenes?.forEach(scene => {
      const duration = scene.estimated_duration || 2;

      // Characters
      if (scene.characters) {
        const charData = scene.characters as string | string[];
        const chars = Array.isArray(charData) 
          ? charData 
          : String(charData).split(',').map(c => c.trim());
        chars.forEach(c => {
          if (c) {
            if (!assetMap.character[c]) {
              assetMap.character[c] = { sceneIds: new Set(), totalRuntime: 0 };
            }
            assetMap.character[c].sceneIds.add(scene.id);
            assetMap.character[c].totalRuntime += duration;
          }
        });
      }

      // Props
      if (scene.props) {
        const propData = scene.props as string | string[];
        const props = Array.isArray(propData) 
          ? propData 
          : String(propData).split(',').map(p => p.trim());
        props.forEach(p => {
          if (p) {
            if (!assetMap.prop[p]) {
              assetMap.prop[p] = { sceneIds: new Set(), totalRuntime: 0 };
            }
            assetMap.prop[p].sceneIds.add(scene.id);
            assetMap.prop[p].totalRuntime += duration;
          }
        });
      }

      // Locations/Environments
      if (scene.location) {
        if (!assetMap.environment[scene.location]) {
          assetMap.environment[scene.location] = { sceneIds: new Set(), totalRuntime: 0 };
        }
        assetMap.environment[scene.location].sceneIds.add(scene.id);
        assetMap.environment[scene.location].totalRuntime += duration;
      }
      if (scene.slugline && scene.slugline !== scene.location) {
        if (!assetMap.environment[scene.slugline]) {
          assetMap.environment[scene.slugline] = { sceneIds: new Set(), totalRuntime: 0 };
        }
        assetMap.environment[scene.slugline].sceneIds.add(scene.id);
        assetMap.environment[scene.slugline].totalRuntime += duration;
      }
    });

    // Convert maps to arrays
    Object.keys(assetMap).forEach(type => {
      result[type] = Object.entries(assetMap[type]).map(([name, data]) => ({
        name,
        sceneCount: data.sceneIds.size,
        totalRuntime: data.totalRuntime,
      })).sort((a, b) => a.name.localeCompare(b.name));
    });

    return result;
  }, [scenes]);

  // Get assets for selected type
  const assetsForType = useMemo(() => {
    return conceptType ? assetsByType[conceptType] || [] : [];
  }, [conceptType, assetsByType]);

  // Get selected asset data
  const selectedAssetData = useMemo(() => {
    return assetsForType.find(a => a.name === selectedAsset);
  }, [selectedAsset, assetsForType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Reset dependent selections when type changes
  const handleTypeChange = (type: string) => {
    setConceptType(type);
    setSelectedAsset('');
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!activeProjectId) throw new Error('No project selected');
      if (!selectedFile) throw new Error('No file selected');
      if (!conceptType) throw new Error('Please select concept type');
      if (!selectedAsset) throw new Error('Please select an asset to tag');

      setIsUploading(true);

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${activeProjectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('reference-images')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(filePath);

      // Save to concept_arts table
      const { error: insertError } = await supabase
        .from('concept_arts')
        .insert({
          project_id: activeProjectId,
          title: selectedAsset,
          concept_type: conceptType as any,
          description: description || `Manual upload for ${selectedAsset}`,
          image_url: publicUrl,
          tags: [selectedAsset],
          status: 'draft',
          art_style: 'mixed',
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Concept uploaded and tagged successfully!');
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
      setIsUploading(false);
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setConceptType('');
      setSelectedAsset('');
      setDescription('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload concept');
      setIsUploading(false);
    },
  });

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-7 w-7 text-primary" />
            Manual Concept Upload
          </h1>
          <p className="text-muted-foreground">Upload and tag concept art to project assets</p>
        </div>

        <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[280px]">
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

      {activeProjectId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Upload & Tag Concept
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: File Upload */}
              <div className="space-y-6">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Image File</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    {previewUrl ? (
                      <div className="relative">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB</p>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Description (Optional) */}
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    rows={3}
                    placeholder="Add notes about this concept..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Right: Asset Tagging via Dropdowns */}
              <div className="space-y-6">
                {/* Step 1: Concept Type Dropdown */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full px-2">1</Badge>
                    Select Type
                  </Label>
                  <Select value={conceptType} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="What type of asset is this?" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONCEPT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Asset Dropdown (filtered by type) */}
                {conceptType && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-2">2</Badge>
                      Select {CONCEPT_TYPES.find(t => t.value === conceptType)?.label}
                    </Label>
                    {assetsForType.length > 0 ? (
                      <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${conceptType} to tag`} />
                        </SelectTrigger>
                        <SelectContent>
                          {assetsForType.map((asset, idx) => (
                            <SelectItem key={idx} value={asset.name}>
                              {asset.name} ({asset.sceneCount} scenes, {asset.totalRuntime} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                        No {conceptType}s found in project scenes. Upload anyway or check your script breakdown.
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Asset Info */}
                {selectedAssetData && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedAsset}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            {selectedAssetData.sceneCount} scenes
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {selectedAssetData.totalRuntime} min
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selection Summary */}
                {(conceptType || selectedAsset) && (
                  <Card className="bg-muted/50">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Tagging to:</span>
                        {conceptType && (
                          <Badge variant="secondary">
                            {CONCEPT_TYPES.find(t => t.value === conceptType)?.label}
                          </Badge>
                        )}
                        {conceptType && selectedAsset && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        {selectedAsset && (
                          <Badge>{selectedAsset}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upload Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => uploadMutation.mutate()}
                  disabled={isUploading || !selectedFile || !conceptType || !selectedAsset}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Upload & Tag Concept
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
            <p className="text-muted-foreground">Choose a project to upload concept art.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
