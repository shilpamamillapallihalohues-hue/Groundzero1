
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  X, ZoomIn, ZoomOut, RotateCcw, Pencil, Trash2, Save, Loader2,
  ChevronLeft, ChevronRight, Sparkles, Check, Plus, Eye, Tag,
  AlertCircle, Crop, Video, File, Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  SceneReference, ReferenceRegion,
  CATEGORIES, REFERENCE_TYPES, ASPECT_LOCK_OPTIONS,
  getCategoryInfo, getRefTypeLabel, isImageFile, isVideoFile,
} from './types';
import RegionSelector from './RegionSelector';
import ReferenceUsagePreview from './ReferenceUsagePreview';

interface FullscreenViewerProps {
  item: SceneReference;
  currentList: SceneReference[];
  currentIndex: number;
  projectId: string;
  scenes: { id: string; scene_number: string | null; slugline: string | null; characters?: string[] | null; props?: string[] | null; location?: string | null }[];
  groupedAssets: Record<string, string[]>;
  dynamicAssetTags: { name: string; category: string }[];
  onClose: () => void;
  onNavigate: (item: SceneReference) => void;
}

export default function FullscreenReferenceViewer({
  item, currentList, currentIndex, projectId, scenes,
  groupedAssets, dynamicAssetTags, onClose, onNavigate,
}: FullscreenViewerProps) {
  const queryClient = useQueryClient();
  const [imageZoom, setImageZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [editRefType, setEditRefType] = useState('reference_image');
  const [editSceneId, setEditSceneId] = useState<string | null>(null);
  const [editAssetTags, setEditAssetTags] = useState<string[]>([]);
  const [editAspectLocks, setEditAspectLocks] = useState<string[]>([]);

  // Region selection
  const [regionMode, setRegionMode] = useState(false);

  // AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Always show the right panel
  const [activePanel, setActivePanel] = useState<'metadata' | 'regions' | 'usage'>('metadata');

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ['reference-regions', item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reference_regions')
        .select('*')
        .eq('reference_id', item.id)
        .order('created_at');
      if (error) throw error;
      return (data || []) as unknown as ReferenceRegion[];
    },
  });

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentList[currentIndex - 1]);
        setImageZoom(1);
        setPanOffset({ x: 0, y: 0 });
      }
      if (e.key === 'ArrowRight' && currentIndex < currentList.length - 1) {
        onNavigate(currentList[currentIndex + 1]);
        setImageZoom(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, currentList, onClose, onNavigate]);

  const startEditing = useCallback(() => {
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditCategory(item.category || 'general');
    setEditRefType(item.reference_type || 'reference_image');
    setEditSceneId(item.scene_id);
    setEditAssetTags((item.asset_tags || []).filter(t => !t.startsWith('aspect:')));
    setEditAspectLocks((item.asset_tags || []).filter(t => t.startsWith('aspect:')).map(t => t.replace('aspect:', '')));
    setAiSuggestions(null);
    setIsEditing(true);
  }, [item]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const aspectTags = editAspectLocks.map(a => `aspect:${a}`);
      const allTags = [...editAssetTags.filter(t => !t.startsWith('aspect:')), ...aspectTags];
      const { error } = await supabase
        .from('scene_references')
        .update({
          title: editTitle.trim() || null,
          description: editDescription.trim() || null,
          category: editCategory,
          reference_type: editRefType,
          scene_id: editSceneId,
          asset_tags: allTags.length > 0 ? allTags : null,
        })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-references', projectId] });
      toast.success('Reference updated!');
      setIsEditing(false);
    },
    onError: () => toast.error('Failed to save'),
  });

  const handleDelete = async () => {
    const { error } = await supabase.from('scene_references').delete().eq('id', item.id);
    if (error) { toast.error('Failed to delete'); return; }
    queryClient.invalidateQueries({ queryKey: ['director-references', projectId] });
    toast.success('Reference deleted');
    onClose();
  };

  const handleSaveRegion = async (regionData: { x: number; y: number; width: number; height: number }, label: string) => {
    const { error } = await supabase.from('reference_regions').insert({
      reference_id: item.id,
      project_id: projectId,
      label,
      region_data: regionData as any,
      category: item.category,
    });
    if (error) { toast.error('Failed to save region'); throw error; }
    queryClient.invalidateQueries({ queryKey: ['reference-regions', item.id] });
    toast.success(`Region "${label}" saved`);
  };

  const handleAiSuggest = async () => {
    setIsAnalyzing(true);
    setAiSuggestions(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-reference', {
        body: {
          imageUrl: item.image_url,
          action: 'both',
          scenes: scenes.map(s => ({ id: s.id, scene_number: s.scene_number, slugline: s.slugline, characters: s.characters, props: s.props, location: s.location })),
          availableAssets: dynamicAssetTags,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Analysis failed');
      const suggestions = data.suggestedTags || {};
      setAiSuggestions({
        category: suggestions.category,
        referenceType: suggestions.referenceType,
        suggestedSceneId: suggestions.suggestedSceneId,
        suggestedSceneReason: suggestions.suggestedSceneReason,
        suggestedAssetTags: suggestions.suggestedAssetTags || [],
        suggestedTitle: suggestions.suggestedTitle,
        suggestedDescription: suggestions.suggestedDescription,
        productionNotes: data.productionNotes,
        autoTags: data.autoTags,
      });
      toast.success('AI analysis complete');
    } catch (err: any) {
      toast.error(err?.message || 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAllSuggestions = async () => {
    if (!aiSuggestions) return;
    const newTitle = aiSuggestions.suggestedTitle || editTitle;
    const newDesc = aiSuggestions.suggestedDescription || editDescription;
    const newCat = aiSuggestions.category || editCategory;
    const newRef = aiSuggestions.referenceType || editRefType;
    const newScene = aiSuggestions.suggestedSceneId || editSceneId;
    let newTags = editAssetTags;
    if (aiSuggestions.suggestedAssetTags?.length > 0) {
      newTags = Array.from(new Set([...editAssetTags, ...aiSuggestions.suggestedAssetTags]));
    }
    setEditTitle(newTitle);
    setEditDescription(newDesc);
    setEditCategory(newCat);
    setEditRefType(newRef);
    if (aiSuggestions.suggestedSceneId) setEditSceneId(aiSuggestions.suggestedSceneId);
    setEditAssetTags(newTags);

    const aspectTags = editAspectLocks.map(a => `aspect:${a}`);
    const allTags = [...newTags.filter((t: string) => !t.startsWith('aspect:')), ...aspectTags];
    try {
      const { error } = await supabase.from('scene_references').update({
        title: (newTitle || '').trim() || null,
        description: (newDesc || '').trim() || null,
        category: newCat,
        reference_type: newRef,
        scene_id: newScene,
        asset_tags: allTags.length > 0 ? allTags : null,
      }).eq('id', item.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['director-references', projectId] });
      toast.success('AI suggestions applied & saved!');
    } catch {
      toast.error('Failed to save suggestions');
    }
  };

  const toggleTag = (name: string) => {
    setEditAssetTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  // Pan handlers for zoomed images
  const handlePanStart = (e: React.MouseEvent) => {
    if (imageZoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handlePanEnd = () => setIsPanning(false);

  const catInfo = getCategoryInfo(item.category);

  // Left panel items: same-category references for navigation
  const sameCategoryItems = currentList.filter(r => r.category === item.category && r.id !== item.id).slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="font-semibold truncate max-w-[300px]">{item.title || 'Reference'}</h3>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1", catInfo.color.replace('text-', 'bg-'))} />
            {catInfo.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] shrink-0">{getRefTypeLabel(item.reference_type)}</Badge>
          <span className="text-xs text-muted-foreground shrink-0">{currentIndex + 1} / {currentList.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {isImageFile(item.image_url) && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(imageZoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageZoom(z => Math.min(4, z + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setImageZoom(1); setPanOffset({ x: 0, y: 0 }); }}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button
                variant={regionMode ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setRegionMode(!regionMode)}
                title="Region selection tool"
              >
                <Crop className="h-4 w-4" />
              </Button>
            </>
          )}
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            variant={isEditing ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => isEditing ? setIsEditing(false) : startEditing()}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main content: 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Navigation thumbnails */}
        <div className="w-20 lg:w-24 border-r border-border bg-card/50 shrink-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-1.5 space-y-1.5">
              {currentList.map((ref, idx) => (
                <button
                  key={ref.id}
                  className={cn(
                    "w-full aspect-square rounded-md overflow-hidden border-2 transition-all",
                    ref.id === item.id ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-border opacity-60 hover:opacity-100"
                  )}
                  onClick={() => { onNavigate(ref); setImageZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                >
                  {isImageFile(ref.image_url) ? (
                    <img src={ref.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/30">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel: Image viewer */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-muted/10">
          {/* Nav arrows */}
          {currentIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-card flex items-center justify-center transition-colors"
              onClick={() => { onNavigate(currentList[currentIndex - 1]); setImageZoom(1); setPanOffset({ x: 0, y: 0 }); }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {currentIndex < currentList.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border hover:bg-card flex items-center justify-center transition-colors"
              onClick={() => { onNavigate(currentList[currentIndex + 1]); setImageZoom(1); setPanOffset({ x: 0, y: 0 }); }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {regionMode && isImageFile(item.image_url) ? (
            <div className="max-w-[80%] max-h-[90%] overflow-auto">
              <RegionSelector
                imageUrl={item.image_url}
                isActive={regionMode}
                onToggle={() => setRegionMode(!regionMode)}
                onSaveRegion={handleSaveRegion}
                existingRegions={regions}
              />
            </div>
          ) : isVideoFile(item.image_url) ? (
            <video src={item.image_url} controls autoPlay className="max-w-full max-h-[90%] rounded-lg" />
          ) : isImageFile(item.image_url) ? (
            <div
              className={cn("overflow-hidden", imageZoom > 1 && "cursor-grab active:cursor-grabbing")}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
            >
              <img
                src={item.image_url}
                alt={item.title || 'Reference'}
                className="max-w-full max-h-[90vh] object-contain transition-transform duration-150 select-none"
                style={{ transform: `scale(${imageZoom}) translate(${panOffset.x / imageZoom}px, ${panOffset.y / imageZoom}px)` }}
                draggable={false}
              />
            </div>
          ) : (
            <div className="text-center p-8">
              <File className="h-16 w-16 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-2">{item.title}</p>
              <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Open Document</a>
            </div>
          )}
        </div>

        {/* Right Panel: Metadata & tagging */}
        <div className="w-80 lg:w-96 border-l border-border bg-card shrink-0">
          <div className="flex border-b border-border">
            {(['metadata', 'regions', 'usage'] as const).map((tab) => (
              <button
                key={tab}
                className={cn(
                  "flex-1 px-3 py-2.5 text-xs font-medium capitalize transition-colors",
                  activePanel === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActivePanel(tab)}
              >
                {tab === 'regions' ? `Regions (${regions.length})` : tab}
              </button>
            ))}
          </div>

          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="p-4 space-y-4">
              {activePanel === 'metadata' && (
                <>
                  {/* AI Suggest */}
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={handleAiSuggest}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isAnalyzing ? 'Analyzing...' : 'AI Suggest Tags'}
                    </Button>
                  )}

                  {/* AI Suggestions */}
                  {aiSuggestions && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" /> AI Suggestions
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary" onClick={applyAllSuggestions}>
                          <Check className="h-3 w-3" /> Apply All
                        </Button>
                      </div>
                      {aiSuggestions.suggestedTitle && (
                        <button className="w-full text-left rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 hover:bg-accent/50 transition-colors" onClick={() => { setEditTitle(aiSuggestions.suggestedTitle); toast.success('Title applied'); }}>
                          <span className="text-[10px] text-muted-foreground">Title</span>
                          <p className="text-xs font-medium truncate">{aiSuggestions.suggestedTitle}</p>
                        </button>
                      )}
                      {aiSuggestions.suggestedDescription && (
                        <button className="w-full text-left rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 hover:bg-accent/50 transition-colors" onClick={() => { setEditDescription(aiSuggestions.suggestedDescription); toast.success('Description applied'); }}>
                          <span className="text-[10px] text-muted-foreground">Description</span>
                          <p className="text-xs line-clamp-2">{aiSuggestions.suggestedDescription}</p>
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {aiSuggestions.category && (
                          <button className={cn("rounded-md border px-2.5 py-1.5 text-left hover:bg-accent/50 transition-colors", editCategory === aiSuggestions.category ? "border-primary/50 bg-primary/10" : "border-border/50 bg-background/50")} onClick={() => { setEditCategory(aiSuggestions.category); toast.success('Category applied'); }}>
                            <span className="text-[10px] text-muted-foreground">Category</span>
                            <p className="text-xs font-medium capitalize">{aiSuggestions.category}</p>
                          </button>
                        )}
                        {aiSuggestions.referenceType && (
                          <button className={cn("rounded-md border px-2.5 py-1.5 text-left hover:bg-accent/50 transition-colors", editRefType === aiSuggestions.referenceType ? "border-primary/50 bg-primary/10" : "border-border/50 bg-background/50")} onClick={() => { setEditRefType(aiSuggestions.referenceType); toast.success('Type applied'); }}>
                            <span className="text-[10px] text-muted-foreground">Type</span>
                            <p className="text-xs font-medium">{getRefTypeLabel(aiSuggestions.referenceType)}</p>
                          </button>
                        )}
                      </div>
                      {aiSuggestions.suggestedSceneId && (
                        <button className={cn("w-full text-left rounded-md border px-2.5 py-1.5 hover:bg-accent/50 transition-colors", editSceneId === aiSuggestions.suggestedSceneId ? "border-primary/50 bg-primary/10" : "border-border/50 bg-background/50")} onClick={() => { setEditSceneId(aiSuggestions.suggestedSceneId); toast.success('Scene applied'); }}>
                          <span className="text-[10px] text-muted-foreground">Scene Match</span>
                          <p className="text-xs font-medium">{(() => { const s = scenes.find(s => s.id === aiSuggestions.suggestedSceneId); return s ? `Sc ${s.scene_number}: ${s.slugline}` : 'Scene suggested'; })()}</p>
                          {aiSuggestions.suggestedSceneReason && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{aiSuggestions.suggestedSceneReason}</p>}
                        </button>
                      )}
                      {aiSuggestions.suggestedAssetTags?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground">Asset Tags</span>
                          <div className="flex flex-wrap gap-1">
                            {aiSuggestions.suggestedAssetTags.map((tag: string) => (
                              <Badge key={tag} variant={editAssetTags.includes(tag) ? 'default' : 'outline'} className="text-[10px] cursor-pointer gap-1" onClick={() => { toggleTag(tag); toast.success(editAssetTags.includes(tag) ? `Removed "${tag}"` : `Added "${tag}"`); }}>
                                {editAssetTags.includes(tag) ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />} {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {aiSuggestions.productionNotes && (
                        <div className="rounded-md bg-background/50 border border-border/50 p-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1"><AlertCircle className="h-2.5 w-2.5" /> Production Notes</span>
                          <p className="text-[11px] text-foreground/80 leading-relaxed">{aiSuggestions.productionNotes}</p>
                        </div>
                      )}
                      {aiSuggestions.autoTags && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-muted-foreground">Visual Tags</span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(aiSuggestions.autoTags).flatMap(([key, vals]) =>
                              ((vals as string[]) || []).slice(0, 2).map((v: string) => (
                                <Badge key={`${key}-${v}`} variant="secondary" className="text-[9px] py-0">{v}</Badge>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isEditing ? (
                    <>
                      <Separator />
                      <h4 className="font-semibold text-sm flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> Edit Reference</h4>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Title</Label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Reference title" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description..." className="min-h-[60px] text-sm" rows={2} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Category</Label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                        <Label className="text-xs">Reference Type</Label>
                        <Select value={editRefType} onValueChange={setEditRefType}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REFERENCE_TYPES.map((rt) => (<SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Scene</Label>
                        <Select value={editSceneId || 'none'} onValueChange={(v) => setEditSceneId(v === 'none' ? null : v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No scene</SelectItem>
                            {scenes.map((s) => (<SelectItem key={s.id} value={s.id}>Sc {s.scene_number}: {s.slugline}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Asset tags */}
                      {Object.keys(groupedAssets).length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" /> Assets</Label>
                          <ScrollArea className="h-28 border rounded-md p-2 bg-secondary/30">
                            <div className="space-y-2">
                              {Object.entries(groupedAssets).map(([category, assets]) => (
                                <div key={category}>
                                  <p className="text-[10px] text-muted-foreground capitalize mb-1">{category}s</p>
                                  <div className="flex flex-wrap gap-1">
                                    {assets.map((name) => (
                                      <Badge key={name} variant={editAssetTags.includes(name) ? 'default' : 'outline'} className="text-[10px] cursor-pointer" onClick={() => toggleTag(name)}>{name}</Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      {/* Aspect Locks */}
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" /> Locked Aspects</Label>
                        <p className="text-[10px] text-muted-foreground">Visual aspects locked in this reference</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ASPECT_LOCK_OPTIONS.map((a) => (
                            <Badge
                              key={a.value}
                              variant={editAspectLocks.includes(a.value) ? 'default' : 'outline'}
                              className="text-[10px] cursor-pointer gap-1"
                              title={a.description}
                              onClick={() => setEditAspectLocks(prev => prev.includes(a.value) ? prev.filter(v => v !== a.value) : [...prev, a.value])}
                            >
                              {editAspectLocks.includes(a.value) ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />} {a.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-1 gap-2" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Read-only metadata view */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Title</p>
                          <p className="text-sm font-medium">{item.title || 'Untitled'}</p>
                        </div>
                        {item.description && (
                          <div>
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{item.description}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Category</p>
                            <Badge variant="secondary" className="text-xs mt-1">{catInfo.label}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <Badge variant="outline" className="text-xs mt-1">{getRefTypeLabel(item.reference_type)}</Badge>
                          </div>
                        </div>
                        {item.scenes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Scene</p>
                            <Badge variant="glass" className="text-xs mt-1">Sc {item.scenes.scene_number}: {item.scenes.slugline}</Badge>
                          </div>
                        )}
                        {item.asset_tags && item.asset_tags.filter(t => !t.startsWith('aspect:')).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Asset Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {item.asset_tags.filter(t => !t.startsWith('aspect:')).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.asset_tags && item.asset_tags.filter(t => t.startsWith('aspect:')).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Locked Aspects</p>
                            <div className="flex flex-wrap gap-1">
                              {item.asset_tags.filter(t => t.startsWith('aspect:')).map(tag => (
                                <Badge key={tag} variant="gold" className="text-[10px]">{tag.replace('aspect:', '')}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-xs">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Separator />
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={startEditing}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Metadata
                      </Button>
                    </>
                  )}
                </>
              )}

              {activePanel === 'regions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Crop className="h-4 w-4 text-primary" /> Region References
                    </h4>
                    <Button variant={regionMode ? 'default' : 'outline'} size="sm" className="h-7 text-xs gap-1.5" onClick={() => setRegionMode(!regionMode)}>
                      <Crop className="h-3 w-3" /> {regionMode ? 'Drawing...' : 'Select Region'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select specific areas of this image to save as sub-references (e.g., crown design, weapon detail).
                  </p>
                  {regions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No regions selected yet. Use the region tool to select areas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {regions.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/20">
                          <Crop className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{r.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.round(r.region_data.width)}% × {Math.round(r.region_data.height)}%
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[9px] shrink-0">{getCategoryInfo(r.category).label}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activePanel === 'usage' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-primary" /> Usage & Links
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Where this reference is being used across the project.
                  </p>
                  <ReferenceUsagePreview referenceId={item.id} projectId={projectId} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
