import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Video, Upload, Wand2, Download, Check, AlertTriangle, 
  Play, Loader2, Film, RefreshCw, Link2, User, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MotionExtractorProps {
  projectId: string;
}

interface ProxyModel {
  id: string;
  name: string;
  thumbnail_url: string | null;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
}

interface Storyboard {
  id: string;
  shot_number: string;
  action: string | null;
  scene_id: string;
}

interface MotionClip {
  id: string;
  name: string;
  description: string | null;
  status: string;
  motion_type: string | null;
  has_facial_animation: boolean | null;
  reference_video_thumbnail: string | null;
  duration_seconds: number | null;
  frame_count: number | null;
  animation_file_urls: Record<string, string>;
  is_actor_likeness: boolean | null;
  created_at: string;
  proxy_model_id: string | null;
  scene_id: string | null;
  storyboard_id: string | null;
}

export function MotionExtractor({ projectId }: MotionExtractorProps) {
  const [activeTab, setActiveTab] = useState('extract');
  const [proxyModels, setProxyModels] = useState<ProxyModel[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [motionClips, setMotionClips] = useState<MotionClip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Extraction form state
  const [clipName, setClipName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState<{ url: string; name: string } | null>(null);
  const [selectedProxyModel, setSelectedProxyModel] = useState('');
  const [selectedScene, setSelectedScene] = useState('');
  const [selectedStoryboard, setSelectedStoryboard] = useState('');
  const [motionType, setMotionType] = useState('body');
  const [includeFacial, setIncludeFacial] = useState(false);
  const [isActorLikeness, setIsActorLikeness] = useState(false);
  const [frameStart, setFrameStart] = useState('');
  const [frameEnd, setFrameEnd] = useState('');
  const [notes, setNotes] = useState('');
  
  const [extractionProgress, setExtractionProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (selectedScene) {
      fetchStoryboards(selectedScene);
    } else {
      setStoryboards([]);
      setSelectedStoryboard('');
    }
  }, [selectedScene]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [modelsRes, scenesRes, clipsRes] = await Promise.all([
        supabase
          .from('proxy_models')
          .select('id, name, thumbnail_url')
          .eq('project_id', projectId)
          .in('status', ['ready', 'approved'])
          .order('name'),
        supabase
          .from('scenes')
          .select('id, scene_number, slugline')
          .eq('project_id', projectId)
          .order('scene_number'),
        supabase
          .from('motion_clips')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
      ]);

      if (modelsRes.error) throw modelsRes.error;
      if (scenesRes.error) throw scenesRes.error;
      if (clipsRes.error) throw clipsRes.error;

      setProxyModels(modelsRes.data || []);
      setScenes(scenesRes.data || []);
      setMotionClips((clipsRes.data || []).map(c => ({
        ...c,
        animation_file_urls: c.animation_file_urls as Record<string, string> || {}
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStoryboards = async (sceneId: string) => {
    try {
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, action, scene_id')
        .eq('scene_id', sceneId)
        .order('shot_number');

      if (error) throw error;
      setStoryboards(data || []);
    } catch (error) {
      console.error('Error fetching storyboards:', error);
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid video file (MP4, MOV, or WebM)');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('proxy-assets')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload video');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('proxy-assets')
        .getPublicUrl(fileName);

      setUploadedVideo({ url: publicUrl, name: file.name });
      setVideoUrl(publicUrl);
      toast.success('Video uploaded successfully');
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedVideo = () => {
    setUploadedVideo(null);
    setVideoUrl('');
  };

  const handleExtract = async () => {
    if (!clipName.trim()) {
      toast.error('Please enter a clip name');
      return;
    }

    if (!videoUrl.trim()) {
      toast.error('Please provide a reference video URL');
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(10);

    try {
      setExtractionProgress(30);

      // Call edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('extract-motion', {
        body: {
          projectId,
          clipName,
          videoUrl,
          proxyModelId: selectedProxyModel || null,
          sceneId: selectedScene || null,
          storyboardId: selectedStoryboard || null,
          motionType,
          includeFacial,
          frameRange: frameStart && frameEnd ? { start: parseInt(frameStart), end: parseInt(frameEnd) } : null,
          notes
        }
      });

      if (fnError) throw fnError;

      setExtractionProgress(70);

      // Create motion clip record
      const { error: insertError } = await supabase
        .from('motion_clips')
        .insert({
          project_id: projectId,
          proxy_model_id: selectedProxyModel || null,
          scene_id: selectedScene || null,
          storyboard_id: selectedStoryboard || null,
          name: clipName,
          description: notes || null,
          status: 'extracting',
          reference_video_url: videoUrl,
          motion_type: motionType,
          has_facial_animation: includeFacial,
          is_actor_likeness: isActorLikeness,
          video_frame_range: frameStart && frameEnd ? { start: parseInt(frameStart), end: parseInt(frameEnd), fps: 24 } : {},
          ai_model_used: 'google/gemini-2.5-flash',
          extraction_params: {
            motion_type: motionType,
            include_facial: includeFacial,
            notes
          },
          known_limitations: [
            'Blocking-level animation only',
            'No final acting polish',
            'AI Motion Proxy label'
          ]
        });

      if (insertError) throw insertError;

      setExtractionProgress(100);
      toast.success('Motion extraction initiated');
      
      // Reset form
      setClipName('');
      setVideoUrl('');
      setUploadedVideo(null);
      setSelectedProxyModel('');
      setSelectedScene('');
      setSelectedStoryboard('');
      setMotionType('body');
      setIncludeFacial(false);
      setIsActorLikeness(false);
      setFrameStart('');
      setFrameEnd('');
      setNotes('');
      
      // Refresh list
      fetchData();
      setActiveTab('library');
    } catch (error) {
      console.error('Error extracting motion:', error);
      toast.error('Failed to extract motion');
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'extracting':
        return <Badge className="bg-blue-500/20 text-blue-400">Extracting</Badge>;
      case 'ready':
        return <Badge className="bg-green-500/20 text-green-400">Ready</Badge>;
      case 'retargeted':
        return <Badge className="bg-purple-500/20 text-purple-400">Retargeted</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400">Approved</Badge>;
      case 'exported':
        return <Badge className="bg-cyan-500/20 text-cyan-400">Exported</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            Motion Extraction
          </h2>
          <p className="text-muted-foreground">
            Extract blocking-level animations from reference videos
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="extract" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Extract Motion
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <Film className="h-4 w-4" />
            Motion Library ({motionClips.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="extract" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Source */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Reference Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL *</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://... or upload"
                    disabled={!!uploadedVideo}
                  />
                </div>

                {/* Upload Area */}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => handleVideoUpload(e.target.files)}
                />
                
                {uploadedVideo ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Video className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{uploadedVideo.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {uploadedVideo.url}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeUploadedVideo}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => videoInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleVideoUpload(e.dataTransfer.files);
                    }}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading video...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Drop reference video here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports MP4, MOV, WebM
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Frame Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frameStart">Start Frame</Label>
                    <Input
                      id="frameStart"
                      type="number"
                      value={frameStart}
                      onChange={(e) => setFrameStart(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frameEnd">End Frame</Label>
                    <Input
                      id="frameEnd"
                      type="number"
                      value={frameEnd}
                      onChange={(e) => setFrameEnd(e.target.value)}
                      placeholder="Auto"
                    />
                  </div>
                </div>

                {/* Scene/Shot Linkage */}
                <div className="space-y-2">
                  <Label>Link to Scene</Label>
                  <Select value={selectedScene} onValueChange={setSelectedScene}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scene (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {scenes.map(scene => (
                        <SelectItem key={scene.id} value={scene.id}>
                          {scene.scene_number}: {scene.slugline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedScene && selectedScene !== 'none' && storyboards.length > 0 && (
                  <div className="space-y-2">
                    <Label>Link to Shot</Label>
                    <Select value={selectedStoryboard} onValueChange={setSelectedStoryboard}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shot (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {storyboards.map(sb => (
                          <SelectItem key={sb.id} value={sb.id}>
                            Shot {sb.shot_number}: {sb.action?.slice(0, 40) || 'No action'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extraction Settings */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Extraction Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clipName">Clip Name *</Label>
                  <Input
                    id="clipName"
                    value={clipName}
                    onChange={(e) => setClipName(e.target.value)}
                    placeholder="e.g., Hero_Walk_Cycle_Blocking"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Proxy Model</Label>
                  <Select value={selectedProxyModel} onValueChange={setSelectedProxyModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model to retarget to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Raw Motion)</SelectItem>
                      {proxyModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Motion Type</Label>
                  <Select value={motionType} onValueChange={setMotionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="body">Body Only</SelectItem>
                      <SelectItem value="full">Full Body + Fingers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="facial">Include Facial Animation</Label>
                    <p className="text-xs text-muted-foreground">
                      Extract facial expressions (requires explicit enable)
                    </p>
                  </div>
                  <Switch
                    id="facial"
                    checked={includeFacial}
                    onCheckedChange={setIncludeFacial}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific requirements..."
                    rows={2}
                  />
                </div>

                {/* Export Formats */}
                <div className="space-y-2">
                  <Label>Export Formats (Auto-generated)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">FBX</Badge>
                    <Badge variant="outline">BVH</Badge>
                    <Badge variant="outline">GLB</Badge>
                    <Badge variant="outline">USD</Badge>
                  </div>
                </div>

                {/* Actor Likeness Warning */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <Label htmlFor="likeness" className="text-amber-400">Actor Likeness</Label>
                      <p className="text-xs text-muted-foreground">
                        Does this video contain recognizable actor performance?
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="likeness"
                    checked={isActorLikeness}
                    onCheckedChange={setIsActorLikeness}
                  />
                </div>

                {/* Limitations Warning */}
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-400">AI Motion Proxy Mode</p>
                      <ul className="text-muted-foreground mt-1 space-y-0.5">
                        <li>• Blocking-level timing only</li>
                        <li>• No final acting polish</li>
                        <li>• Skeleton animation export</li>
                        <li>• Labeled as "AI Motion Proxy"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Extract Button */}
                {isExtracting && (
                  <Progress value={extractionProgress} className="h-2" />
                )}
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Motion...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Extract Motion
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          {motionClips.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Motion Clips Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Extract your first motion clip from a reference video
                </p>
                <Button onClick={() => setActiveTab('extract')}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Extract Motion
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {motionClips.map(clip => (
                <Card key={clip.id} className="bg-card/50 border-border/50 overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {clip.reference_video_thumbnail ? (
                      <img
                        src={clip.reference_video_thumbnail}
                        alt={clip.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(clip.status)}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                      {clip.duration_seconds ? `${clip.duration_seconds.toFixed(1)}s` : '--'}
                    </div>
                    {clip.is_actor_likeness && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Likeness
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{clip.name}</h3>
                    {clip.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {clip.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">
                        {clip.motion_type?.toUpperCase() || 'BODY'}
                      </Badge>
                      {clip.has_facial_animation && (
                        <Badge variant="outline" className="text-xs">
                          +FACIAL
                        </Badge>
                      )}
                      {clip.frame_count && (
                        <Badge variant="outline" className="text-xs">
                          {clip.frame_count} frames
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Play className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
