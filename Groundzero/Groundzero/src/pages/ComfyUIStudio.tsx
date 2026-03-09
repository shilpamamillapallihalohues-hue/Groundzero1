import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DynamicWorkflowUI } from '@/components/comfyui/DynamicWorkflowUI';
import {
  Image,
  Wand2,
  Layers,
  Box,
  Palette,
  ZoomIn,
  Scissors,
  Loader2,
  Upload,
  Download,
  Play,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Server,
  FileJson,
  Link2
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
}

type FeatureType = 'txt2img' | 'img2img' | 'depth' | 'normals' | 'style_transfer' | 'upscale' | 'rembg' | 'controlnet';
type StudioTab = 'presets' | 'custom';

const features = [
  { id: 'txt2img', name: 'Text to Image', icon: Image, description: 'Generate images from text prompts' },
  { id: 'img2img', name: 'Image to Image', icon: Wand2, description: 'Transform existing images' },
  { id: 'depth', name: 'Depth Map', icon: Layers, description: 'Extract depth information' },
  { id: 'normals', name: 'Normal Map', icon: Box, description: 'Generate surface normals' },
  { id: 'style_transfer', name: 'Style Transfer', icon: Palette, description: 'Apply artistic styles' },
  { id: 'upscale', name: 'Upscale', icon: ZoomIn, description: 'Enhance image resolution' },
  { id: 'rembg', name: 'Remove Background', icon: Scissors, description: 'Create transparent backgrounds' },
  { id: 'controlnet', name: 'ControlNet Pose', icon: Sparkles, description: 'Pose-guided generation' },
];

export default function ComfyUIStudio() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [studioTab, setStudioTab] = useState<StudioTab>('presets');
  const [activeFeature, setActiveFeature] = useState<FeatureType>('txt2img');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [serverUrl, setServerUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ngrokUrl, setNgrokUrl] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Generation parameters
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputImageName, setInputImageName] = useState('');
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);
  const [upscaleFactor, setUpscaleFactor] = useState(2);
  const [controlnetType, setControlnetType] = useState<'openpose' | 'canny' | 'depth' | 'lineart'>('openpose');
  const [saveToProject, setSaveToProject] = useState(false);

  // Results
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('comfyui_server_url');
    const savedNgrok = localStorage.getItem('comfyui_ngrok_url');
    if (savedUrl) {
      setServerUrl(savedUrl);
      checkConnection(savedUrl);
    }
    if (savedNgrok) {
      setNgrokUrl(savedNgrok);
    }

    // Fetch projects
    const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, title');
      if (data) setProjects(data);
    };
    fetchProjects();
  }, []);

  const handleConnectNgrok = useCallback(async () => {
    if (!ngrokUrl.trim()) {
      toast.error('Please enter your ngrok URL');
      return;
    }

    setIsTestingConnection(true);
    
    // Clean up the URL
    let cleanUrl = ngrokUrl.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    cleanUrl = cleanUrl.replace(/\/$/, '');

    try {
      const { data } = await supabase.functions.invoke('comfyui-image-generate', {
        body: { action: 'test_connection', serverUrl: cleanUrl }
      });
      
      if (data?.connected || data?.success) {
        setServerUrl(cleanUrl);
        setIsConnected(true);
        localStorage.setItem('comfyui_server_url', cleanUrl);
        localStorage.setItem('comfyui_ngrok_url', ngrokUrl);
        toast.success('Connected to ComfyUI via ngrok!');
      } else {
        setIsConnected(false);
        toast.error('Could not connect to ComfyUI. Make sure it\'s running and ngrok is forwarding correctly.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to ComfyUI server');
    } finally {
      setIsTestingConnection(false);
    }
  }, [ngrokUrl]);

  const checkConnection = async (url: string) => {
    try {
      const { data } = await supabase.functions.invoke('comfyui-image-generate', {
        body: { action: 'test_connection', serverUrl: url }
      });
      setIsConnected(data?.connected || data?.success || false);
    } catch {
      setIsConnected(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'input' | 'style') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (type === 'input') {
        setInputImage(base64);
        setInputImageName(file.name);
      } else {
        setStyleImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!serverUrl) {
      toast.error('Please configure ComfyUI server URL in External Tools');
      return;
    }

    if (!isConnected) {
      toast.error('ComfyUI server is not connected');
      return;
    }

    // Validation based on feature type
    if (['txt2img', 'img2img', 'style_transfer', 'controlnet'].includes(activeFeature) && !prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (['img2img', 'depth', 'normals', 'upscale', 'rembg', 'controlnet'].includes(activeFeature) && !inputImage) {
      toast.error('Please upload an input image');
      return;
    }

    if (activeFeature === 'style_transfer' && !styleImage) {
      toast.error('Please upload a style reference image');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Queuing workflow...');
    setResultImage(null);

    try {
      // Map feature types to edge function action names
      const actionMap: Record<FeatureType, string> = {
        'txt2img': 'generate_image',
        'img2img': 'generate_image',
        'depth': 'generate_depth',
        'normals': 'generate_normals',
        'style_transfer': 'style_transfer',
        'upscale': 'upscale',
        'rembg': 'remove_background',
        'controlnet': 'generate_image',
      };

      const body: any = {
        action: actionMap[activeFeature],
        serverUrl,
        prompt,
        negativePrompt,
        width,
        height,
        steps,
        cfg: cfgScale,
      };

      // Map inputImage to imageUrl for edge function
      if (inputImage) body.imageUrl = inputImage;
      if (styleImage) body.styleImage = styleImage;
      if (activeFeature === 'img2img') {
        body.workflowType = 'img2img';
        body.denoisingStrength = denoisingStrength;
      }
      if (activeFeature === 'upscale') body.upscaleFactor = upscaleFactor;
      if (activeFeature === 'controlnet') {
        body.controlnetImage = inputImage;
        body.controlnetType = controlnetType;
      }

      setProcessingStatus('Processing...');

      const { data, error } = await supabase.functions.invoke('comfyui-image-generate', { body });

      if (error) throw error;

      if (data?.taskId) {
        // Poll for completion
        await pollForResult(data.taskId);
      } else if (data?.imageUrls?.length > 0 || data?.imageUrl || data?.image) {
        const imageResult = data.imageUrls?.[0] || data.imageUrl || data.image;
        setResultImage(imageResult);
        setProcessingStatus('Complete!');
        toast.success('Generation complete!');
        
        if (saveToProject && selectedProjectId) {
          await saveToProjectAsset(data.imageUrl || data.image);
        }
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Generation failed');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollForResult = async (promptId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      setProcessingStatus(`Processing... (${attempts}/${maxAttempts})`);

      try {
        const { data } = await supabase.functions.invoke('comfyui-image-generate', {
          body: { action: 'get_status', serverUrl, taskId: promptId }
        });

        if (data?.status === 'completed' && data?.imageUrls?.length > 0) {
          setResultImage(data.imageUrls[0]);
          setProcessingStatus('Complete!');
          toast.success('Generation complete!');
          
          if (saveToProject && selectedProjectId) {
            await saveToProjectAsset(data.imageUrls[0]);
          }
          return;
        } else if (data?.status === 'failed') {
          throw new Error(data?.error || 'Generation failed');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }

    throw new Error('Generation timed out');
  };

  const saveToProjectAsset = async (imageUrl: string) => {
    try {
      const { error } = await supabase.from('concept_arts').insert({
        project_id: selectedProjectId,
        title: `ComfyUI ${activeFeature} - ${new Date().toLocaleString()}`,
        description: prompt || `Generated using ${activeFeature}`,
        image_url: imageUrl,
        prompt: prompt,
        status: 'draft'
      });

      if (error) throw error;
      toast.success('Saved to project!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save to project');
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `comfyui-${activeFeature}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler for custom workflow generation
  const handleCustomWorkflowGenerate = useCallback(async (workflow: any) => {
    if (!serverUrl) {
      toast.error('Please connect to ComfyUI server first');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Sending workflow to ComfyUI...');
    setResultImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('comfyui-image-generate', {
        body: {
          action: 'run_custom_workflow',
          serverUrl,
          workflow,
        }
      });

      if (error) throw error;

      if (data?.taskId) {
        await pollForResult(data.taskId);
      } else if (data?.imageUrls?.length > 0 || data?.imageUrl || data?.image) {
        const imageResult = data.imageUrls?.[0] || data.imageUrl || data.image;
        setResultImage(imageResult);
        setProcessingStatus('Complete!');
        toast.success('Custom workflow complete!');
        
        if (saveToProject && selectedProjectId) {
          await saveToProjectAsset(imageResult);
        }
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Custom workflow error:', error);
      toast.error(error.message || 'Workflow execution failed');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  }, [serverUrl, saveToProject, selectedProjectId]);

  if (isLoading || !isAuthenticated) return null;

  const currentFeature = features.find(f => f.id === activeFeature);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              ComfyUI Studio
            </h1>
            <p className="text-muted-foreground">
              Local AI-powered image processing with ComfyUI
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
              {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>

            {/* Project Selector */}
            <div className="flex items-center gap-2">
              <Switch checked={saveToProject} onCheckedChange={setSaveToProject} id="save-project" />
              <Label htmlFor="save-project" className="text-sm">Save to project</Label>
            </div>
            {saveToProject && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Connection Section */}
        <Card className={isConnected ? "border-green-500/30 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {isConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Link2 className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium">
                    {isConnected ? 'Connected to ComfyUI' : 'Connect to ComfyUI via ngrok'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isConnected 
                      ? `Server: ${serverUrl}` 
                      : 'Enter your ngrok URL to connect to your local ComfyUI server'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="https://xxxx-xxx-xxx.ngrok-free.app"
                    value={ngrokUrl}
                    onChange={(e) => setNgrokUrl(e.target.value)}
                    className="max-w-md"
                  />
                  <Button 
                    onClick={handleConnectNgrok}
                    disabled={isTestingConnection || !ngrokUrl.trim()}
                    variant={isConnected ? "outline" : "default"}
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : isConnected ? (
                      'Reconnect'
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
                
                {!isConnected && (
                  <p className="text-xs text-muted-foreground">
                    Run <code className="bg-muted px-1 py-0.5 rounded">ngrok http 8188</code> on your local machine to expose ComfyUI
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={studioTab} onValueChange={(v) => setStudioTab(v as StudioTab)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="presets" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Preset Features
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <FileJson className="h-4 w-4" />
              Custom Workflows
            </TabsTrigger>
          </TabsList>

          {/* Preset Features Tab */}
          <TabsContent value="presets" className="mt-0">

        <div className="grid grid-cols-12 gap-6">
          {/* Feature Selection */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {features.map(feature => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(feature.id as FeatureType)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      activeFeature === feature.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <feature.icon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">{feature.name}</p>
                      <p className="text-xs opacity-70">{feature.description}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Parameters */}
          <div className="col-span-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentFeature && <currentFeature.icon className="h-5 w-5" />}
                  {currentFeature?.name}
                </CardTitle>
                <CardDescription>{currentFeature?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt (for applicable features) */}
                {['txt2img', 'img2img', 'style_transfer', 'controlnet'].includes(activeFeature) && (
                  <>
                    <div>
                      <Label>Prompt</Label>
                      <Textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe what you want to generate..."
                        className="mt-1 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <Label>Negative Prompt (optional)</Label>
                      <Textarea
                        value={negativePrompt}
                        onChange={e => setNegativePrompt(e.target.value)}
                        placeholder="What to avoid..."
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* Input Image Upload */}
                {['img2img', 'depth', 'normals', 'upscale', 'rembg', 'controlnet'].includes(activeFeature) && (
                  <div>
                    <Label>Input Image</Label>
                    <div className="mt-1 border-2 border-dashed rounded-lg p-4 text-center">
                      {inputImage ? (
                        <div className="space-y-2">
                          <img src={inputImage} alt="Input" className="max-h-40 mx-auto rounded" />
                          <p className="text-sm text-muted-foreground">{inputImageName}</p>
                          <Button size="sm" variant="outline" onClick={() => setInputImage(null)}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            Upload Image
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload(e, 'input')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Style Image for Style Transfer */}
                {activeFeature === 'style_transfer' && (
                  <div>
                    <Label>Style Reference Image</Label>
                    <div className="mt-1 border-2 border-dashed rounded-lg p-4 text-center">
                      {styleImage ? (
                        <div className="space-y-2">
                          <img src={styleImage} alt="Style" className="max-h-40 mx-auto rounded" />
                          <Button size="sm" variant="outline" onClick={() => setStyleImage(null)}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <Button size="sm" variant="outline" onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleFileUpload(e as any, 'style');
                            input.click();
                          }}>
                            Upload Style Image
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ControlNet Type */}
                {activeFeature === 'controlnet' && (
                  <div>
                    <Label>ControlNet Type</Label>
                    <Select value={controlnetType} onValueChange={(v: any) => setControlnetType(v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openpose">OpenPose (Body Pose)</SelectItem>
                        <SelectItem value="canny">Canny (Edge Detection)</SelectItem>
                        <SelectItem value="depth">Depth</SelectItem>
                        <SelectItem value="lineart">Line Art</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Size Controls */}
                {['txt2img', 'img2img', 'style_transfer', 'controlnet'].includes(activeFeature) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Width: {width}px</Label>
                      <Slider
                        value={[width]}
                        onValueChange={([v]) => setWidth(v)}
                        min={512}
                        max={2048}
                        step={64}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Height: {height}px</Label>
                      <Slider
                        value={[height]}
                        onValueChange={([v]) => setHeight(v)}
                        min={512}
                        max={2048}
                        step={64}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}

                {/* Steps & CFG */}
                {['txt2img', 'img2img', 'style_transfer', 'controlnet'].includes(activeFeature) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Steps: {steps}</Label>
                      <Slider
                        value={[steps]}
                        onValueChange={([v]) => setSteps(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>CFG Scale: {cfgScale}</Label>
                      <Slider
                        value={[cfgScale]}
                        onValueChange={([v]) => setCfgScale(v)}
                        min={1}
                        max={20}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}

                {/* Denoising Strength for img2img */}
                {activeFeature === 'img2img' && (
                  <div>
                    <Label>Denoising Strength: {denoisingStrength}</Label>
                    <Slider
                      value={[denoisingStrength]}
                      onValueChange={([v]) => setDenoisingStrength(v)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher = more creative, Lower = more faithful to original
                    </p>
                  </div>
                )}

                {/* Upscale Factor */}
                {activeFeature === 'upscale' && (
                  <div>
                    <Label>Upscale Factor</Label>
                    <Select value={upscaleFactor.toString()} onValueChange={v => setUpscaleFactor(parseInt(v))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="4">4x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing || !isConnected}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {processingStatus}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>

                {/* Generation Progress */}
                <GenerationProgress
                  isGenerating={isProcessing}
                  status={isProcessing ? 'generating' : 'idle'}
                  statusText={processingStatus || 'Processing with ComfyUI...'}
                />
              </CardContent>
            </Card>
          </div>

          {/* Result */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>Generated output will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                {resultImage ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <img src={resultImage} alt="Result" className="w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={downloadImage} variant="outline" className="flex-1 gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      {selectedProjectId && (
                        <Button onClick={() => saveToProjectAsset(resultImage)} variant="outline" className="flex-1 gap-2">
                          <Upload className="h-4 w-4" />
                          Save to Project
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Image className="h-12 w-12 mb-2 opacity-20" />
                    <p>No result yet</p>
                    <p className="text-sm">Generate something to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          {/* Custom Workflows Tab */}
          <TabsContent value="custom" className="mt-0">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <DynamicWorkflowUI
                  serverUrl={serverUrl}
                  isConnected={isConnected}
                  onGenerate={handleCustomWorkflowGenerate}
                  isProcessing={isProcessing}
                />
              </div>
              
              {/* Result Panel for Custom Workflows */}
              <div className="col-span-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Result</CardTitle>
                    <CardDescription>Workflow output will appear here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {resultImage ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden bg-muted/30">
                          <img src={resultImage} alt="Result" className="w-full" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={downloadImage} variant="outline" className="flex-1 gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                          {selectedProjectId && (
                            <Button onClick={() => saveToProjectAsset(resultImage)} variant="outline" className="flex-1 gap-2">
                              <Upload className="h-4 w-4" />
                              Save to Project
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Image className="h-12 w-12 mb-2 opacity-20" />
                        <p>No result yet</p>
                        <p className="text-sm">Run a workflow to see output here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
