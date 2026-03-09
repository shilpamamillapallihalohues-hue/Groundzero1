
import { useState, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Image, Upload, Link as LinkIcon, Loader2, Plus, FolderOpen, Video, BookOpen, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useProjectContext } from '@/contexts/ProjectContext';
import ReferenceDocumentsTab from '@/components/references/ReferenceDocumentsTab';
import ReferenceCard from '@/components/references/ReferenceCard';
import ReferenceFilterBar from '@/components/references/ReferenceFilterBar';
import ReferenceCollectionsBar from '@/components/references/ReferenceCollectionsBar';
import FullscreenReferenceViewer from '@/components/references/FullscreenReferenceViewer';
import {
  SceneReference, CATEGORIES, REFERENCE_TYPES,
  isImageFile, isVideoFile, getCategoryInfo,
} from '@/components/references/types';

const ACCEPTED_FILE_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.txt,.rtf,.pptx,.ppt,.xlsx,.xls';

export default function DirectorReferences() {
  const { selectedProjectId: activeProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'documents'>('images');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fullscreenItem, setFullscreenItem] = useState<SceneReference | null>(null);
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRefType, setFilterRefType] = useState('all');
  const [filterCharacter, setFilterCharacter] = useState('all');
  const [filterScene, setFilterScene] = useState('all');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  // Upload form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadRefType, setUploadRefType] = useState('reference_image');
  const [uploadSceneId, setUploadSceneId] = useState<string | null>(null);
  const [uploadAssetTags, setUploadAssetTags] = useState<string[]>([]);
  const [uploadUrlInput, setUploadUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'folder' | 'url'>('file');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Fetch references
  const { data: references = [], isLoading: referencesLoading } = useQuery({
    queryKey: ['director-references', activeProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scene_references')
        .select(`*, scenes(id, scene_number, slugline)`)
        .eq('project_id', activeProjectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SceneReference[];
    },
    enabled: !!activeProjectId,
  });

  // Fetch scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['director-ref-scenes', activeProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location')
        .eq('project_id', activeProjectId!)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  // Dynamic asset tags
  const dynamicAssetTags = useMemo(() => {
    const assets: { name: string; category: string }[] = [];
    scenes.forEach((scene) => {
      if (scene.characters) {
        (scene.characters as string[]).forEach((char) => {
          if (!assets.find((a) => a.name === char)) assets.push({ name: char, category: 'character' });
        });
      }
      if (scene.props) {
        (scene.props as string[]).forEach((prop) => {
          if (!assets.find((a) => a.name === prop)) assets.push({ name: prop, category: 'prop' });
        });
      }
      if (scene.location) {
        if (!assets.find((a) => a.name === scene.location)) assets.push({ name: scene.location as string, category: 'location' });
      }
    });
    return assets;
  }, [scenes]);

  const groupedAssets = useMemo(() => {
    return dynamicAssetTags.reduce((acc, asset) => {
      if (!acc[asset.category]) acc[asset.category] = [];
      acc[asset.category].push(asset.name);
      return acc;
    }, {} as Record<string, string[]>);
  }, [dynamicAssetTags]);

  const characters = useMemo(() => {
    return dynamicAssetTags.filter(a => a.category === 'character').map(a => a.name);
  }, [dynamicAssetTags]);

  // Filter references
  const applyFilters = useCallback((refs: SceneReference[]) => {
    let filtered = refs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.asset_tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterCategory !== 'all') filtered = filtered.filter(r => r.category === filterCategory);
    if (filterRefType !== 'all') filtered = filtered.filter(r => r.reference_type === filterRefType);
    if (filterCharacter !== 'all') filtered = filtered.filter(r => (r.asset_tags || []).includes(filterCharacter));
    if (filterScene !== 'all') filtered = filtered.filter(r => r.scene_id === filterScene);
    if (activeCollectionId) filtered = filtered.filter(r => r.collection_id === activeCollectionId);
    return filtered;
  }, [searchQuery, filterCategory, filterRefType, filterCharacter, filterScene, activeCollectionId]);

  const imageRefs = useMemo(() => applyFilters(references.filter(r => isImageFile(r.image_url))), [references, applyFilters]);
  const videoRefs = useMemo(() => applyFilters(references.filter(r => isVideoFile(r.image_url))), [references, applyFilters]);
  const totalImageCount = references.filter(r => isImageFile(r.image_url)).length;
  const totalVideoCount = references.filter(r => isVideoFile(r.image_url)).length;

  const currentList = activeTab === 'images' ? imageRefs : videoRefs;

  // Upload handlers
  const resetUploadForm = () => {
    setUploadTitle(''); setUploadDescription(''); setUploadCategory('general');
    setUploadRefType('reference_image'); setUploadSceneId(null); setUploadAssetTags([]);
    setUploadUrlInput(''); setUploadMode('file'); setUploadProgress(null); setShowUploadDialog(false);
  };

  const uploadSingleFile = useCallback(async (file: File, title?: string): Promise<boolean> => {
    if (!activeProjectId) return false;
    try {
      const fileName = `projects/${activeProjectId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('reference-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('reference-images').getPublicUrl(uploadData.path);
      const autoCategory = isImageFile(file.name) ? uploadCategory : isVideoFile(file.name) ? 'general' : 'document';
      const { error: refError } = await supabase.from('scene_references').insert({
        scene_id: uploadSceneId || null,
        project_id: activeProjectId,
        title: title || uploadTitle.trim() || file.name,
        description: uploadDescription.trim() || null,
        image_url: publicUrl,
        source_type: 'upload',
        category: autoCategory,
        reference_type: uploadRefType,
        asset_tags: uploadAssetTags.length > 0 ? uploadAssetTags : null,
      });
      if (refError) throw refError;
      return true;
    } catch (error) {
      console.error('Upload error for', file.name, error);
      return false;
    }
  }, [activeProjectId, uploadCategory, uploadRefType, uploadSceneId, uploadTitle, uploadDescription, uploadAssetTags]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !activeProjectId) return;
    setIsUploading(true);
    if (files.length === 1) {
      setUploadProgress({ current: 0, total: 1 });
      const success = await uploadSingleFile(files[0]);
      setUploadProgress({ current: 1, total: 1 });
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['director-references', activeProjectId] });
        toast.success('Reference uploaded!');
        resetUploadForm();
      } else {
        toast.error('Failed to upload reference');
        setUploadProgress(null);
      }
    } else {
      let successCount = 0;
      setUploadProgress({ current: 0, total: files.length });
      for (let i = 0; i < files.length; i++) {
        if (files[i].name.startsWith('.')) continue;
        const success = await uploadSingleFile(files[i], files[i].name);
        if (success) successCount++;
        setUploadProgress({ current: i + 1, total: files.length });
      }
      queryClient.invalidateQueries({ queryKey: ['director-references', activeProjectId] });
      toast.success(`Uploaded ${successCount} of ${files.length} files`);
      resetUploadForm();
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleUrlUpload = async () => {
    if (!uploadUrlInput.trim() || !activeProjectId) { toast.error('Please enter a URL'); return; }
    try { new URL(uploadUrlInput); } catch { toast.error('Please enter a valid URL'); return; }
    setIsUploading(true);
    try {
      const { error } = await supabase.from('scene_references').insert({
        scene_id: uploadSceneId || null,
        project_id: activeProjectId,
        title: uploadTitle.trim() || 'URL Reference',
        description: uploadDescription.trim() || null,
        image_url: uploadUrlInput.trim(),
        source_type: 'url',
        category: uploadCategory,
        reference_type: uploadRefType,
        asset_tags: uploadAssetTags.length > 0 ? uploadAssetTags : null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['director-references', activeProjectId] });
      toast.success('Reference added!');
      resetUploadForm();
    } catch {
      toast.error('Failed to add reference');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleAssetTag = (name: string) => {
    setUploadAssetTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  if (!activeProjectId) {
    return (
      <div className="p-8 text-center">
        <Image className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground">Select a project to view its references.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" />
            Visual Reference Library
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Production-grade reference management for concept art, storyboards, and scene design
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Reference
        </Button>
      </div>

      {/* Collections Bar */}
      <ReferenceCollectionsBar
        projectId={activeProjectId}
        activeCollectionId={activeCollectionId}
        onCollectionChange={setActiveCollectionId}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="images" className="gap-2">
            <Image className="h-4 w-4" /> Images ({imageRefs.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="h-4 w-4" /> Videos ({videoRefs.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <BookOpen className="h-4 w-4" /> Documents
          </TabsTrigger>
        </TabsList>

        {(activeTab === 'images' || activeTab === 'videos') && (
          <div className="mt-4">
            <ReferenceFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterCategory={filterCategory}
              onCategoryChange={setFilterCategory}
              filterRefType={filterRefType}
              onRefTypeChange={setFilterRefType}
              filterCharacter={filterCharacter}
              onCharacterChange={setFilterCharacter}
              filterScene={filterScene}
              onSceneChange={setFilterScene}
              characters={characters}
              scenes={scenes}
              totalCount={activeTab === 'images' ? totalImageCount : totalVideoCount}
              filteredCount={activeTab === 'images' ? imageRefs.length : videoRefs.length}
            />
          </div>
        )}

        <TabsContent value="images" className="mt-4">
          {referencesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : imageRefs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No Images Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Upload reference images to build your visual library.</p>
                <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {imageRefs.map((ref) => (
                <ReferenceCard
                  key={ref.id}
                  reference={ref}
                  onClick={() => setFullscreenItem(ref)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {referencesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : videoRefs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">No Videos Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Upload video references for this project.</p>
                <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {videoRefs.map((ref) => (
                <ReferenceCard key={ref.id} reference={ref} onClick={() => setFullscreenItem(ref)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <ReferenceDocumentsTab projectId={activeProjectId!} />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Upload Reference
            </DialogTitle>
            <DialogDescription>Upload images, videos, documents, or entire folders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ref-title">Title (optional)</Label>
              <Input id="ref-title" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g. Forest mood board" className="bg-secondary/50" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-desc">Description (optional)</Label>
              <Textarea id="ref-desc" value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Brief note..." className="bg-secondary/50 min-h-[60px]" rows={2} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant={uploadMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setUploadMode('file')} className="gap-1">
                <Upload className="h-3 w-3" /> File
              </Button>
              <Button type="button" variant={uploadMode === 'folder' ? 'default' : 'outline'} size="sm" onClick={() => setUploadMode('folder')} className="gap-1">
                <FolderOpen className="h-3 w-3" /> Folder
              </Button>
              <Button type="button" variant={uploadMode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setUploadMode('url')} className="gap-1">
                <LinkIcon className="h-3 w-3" /> URL
              </Button>
            </div>
            {uploadMode === 'url' && (
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input value={uploadUrlInput} onChange={(e) => setUploadUrlInput(e.target.value)} placeholder="https://example.com/image.jpg" className="bg-secondary/50" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== 'document').map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", cat.color.replace('text-', 'bg-'))} /> {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reference Type</Label>
                <Select value={uploadRefType} onValueChange={setUploadRefType}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFERENCE_TYPES.map((rt) => (<SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scene (optional)</Label>
              <Select value={uploadSceneId || 'none'} onValueChange={(v) => setUploadSceneId(v === 'none' ? null : v)}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No scene</SelectItem>
                  {scenes.map((s) => (<SelectItem key={s.id} value={s.id}>Sc {s.scene_number}: {s.slugline}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {/* Asset tags */}
            {Object.keys(groupedAssets).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Tag to Assets</Label>
                <div className="border rounded-md p-2 bg-secondary/30 max-h-24 overflow-y-auto">
                  <div className="space-y-2">
                    {Object.entries(groupedAssets).map(([category, assets]) => (
                      <div key={category}>
                        <p className="text-[10px] text-muted-foreground capitalize mb-1">{category}s</p>
                        <div className="flex flex-wrap gap-1">
                          {assets.map((name) => (
                            <Badge key={name} variant={uploadAssetTags.includes(name) ? 'default' : 'outline'} className="text-[10px] cursor-pointer" onClick={() => toggleAssetTag(name)}>{name}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Progress bar */}
            {uploadProgress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetUploadForm}>Cancel</Button>
              {uploadMode === 'file' ? (
                <>
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} multiple onChange={handleFileUpload} className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="gap-2">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? 'Uploading...' : 'Upload File(s)'}
                  </Button>
                </>
              ) : uploadMode === 'folder' ? (
                <>
                  {/* @ts-ignore */}
                  <input ref={folderInputRef} type="file" {...{ webkitdirectory: '', directory: '' } as any} multiple onChange={handleFileUpload} className="hidden" />
                  <Button onClick={() => folderInputRef.current?.click()} disabled={isUploading} className="gap-2">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                    {isUploading ? 'Uploading...' : 'Select Folder'}
                  </Button>
                </>
              ) : (
                <Button onClick={handleUrlUpload} disabled={isUploading || !uploadUrlInput.trim()} className="gap-2">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  {isUploading ? 'Adding...' : 'Add URL'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Viewer */}
      {fullscreenItem && (
        <FullscreenReferenceViewer
          item={fullscreenItem}
          currentList={currentList}
          currentIndex={currentList.findIndex(r => r.id === fullscreenItem.id)}
          projectId={activeProjectId}
          scenes={scenes}
          groupedAssets={groupedAssets}
          dynamicAssetTags={dynamicAssetTags}
          onClose={() => setFullscreenItem(null)}
          onNavigate={(item) => setFullscreenItem(item)}
        />
      )}
    </div>
  );
}
