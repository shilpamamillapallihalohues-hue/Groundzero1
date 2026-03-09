import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Loader2, 
  Box, 
  Sparkles, 
  Video,
  ExternalLink,
  RefreshCw,
  Server,
  Terminal,
  Copy,
  CheckCircle2,
  Image,
  Layers,
  Palette,
  Wand2,
  Scissors,
  ZoomIn,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  secretKey: string;
  docsUrl: string;
  features: string[];
  setupSteps: string[];
}

const tools: ToolConfig[] = [
  {
    id: 'tencent',
    name: 'Tencent Cloud (Hunyuan-3D)',
    description: 'Cloud-based Image-to-3D generation using Tencent Hunyuan-3D. Generate high-quality 3D models from images.',
    icon: Box,
    secretKey: 'TENCENT_SECRET_ID',
    docsUrl: 'https://cloud.tencent.com/document/product/1729',
    features: [
      'Image-to-3D model generation',
      'High-quality mesh output',
      'GLB and OBJ export formats',
      'PBR texture support',
      'Cloud-based (no local GPU required)'
    ],
    setupSteps: [
      'Create a Tencent Cloud account at cloud.tencent.com',
      'Enable the Hunyuan 3D service in your console',
      'Go to API Key Management in your account',
      'Create a new SecretId and SecretKey pair',
      'Enter both keys below and save'
    ]
  },
  {
    id: 'tencent_secret',
    name: 'Tencent Secret Key',
    description: 'Secondary key for Tencent Cloud authentication.',
    icon: Key,
    secretKey: 'TENCENT_SECRET_KEY',
    docsUrl: 'https://cloud.tencent.com/document/product/1729',
    features: [],
    setupSteps: []
  },
  {
    id: 'meshy',
    name: 'Meshy AI',
    description: '3D model generation from images and text. Create proxy models, characters, and props.',
    icon: Box,
    secretKey: 'MESHY_API_KEY',
    docsUrl: 'https://docs.meshy.ai/',
    features: [
      'Image-to-3D model generation',
      'Text-to-3D model generation',
      'PBR texture generation',
      'Multiple export formats (GLB, FBX, OBJ)'
    ],
    setupSteps: [
      'Create an account at meshy.ai',
      'Navigate to API Keys in your dashboard',
      'Generate a new API key',
      'Paste the key below and save'
    ]
  },
  {
    id: 'tripo',
    name: 'Tripo AI',
    description: 'High-quality 3D model generation with advanced topology control and PBR textures.',
    icon: Box,
    secretKey: 'TRIPO_API_KEY',
    docsUrl: 'https://platform.tripo3d.ai/',
    features: [
      'Image-to-3D model generation',
      'Text-to-3D model generation',
      'Face limit control for poly optimization',
      'Multiple export formats (GLB, FBX, OBJ, USDZ)'
    ],
    setupSteps: [
      'Create an account at tripo3d.ai',
      'Go to the Developer Platform',
      'Generate an API key from your dashboard',
      'Paste the key below and save'
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini AI',
    description: 'Google\'s advanced AI for image generation and multimodal tasks.',
    icon: Sparkles,
    secretKey: 'GEMINI_API_KEY',
    docsUrl: 'https://ai.google.dev/',
    features: [
      'High-quality image generation',
      'Style-consistent outputs',
      'Reference image support',
      'Fast generation speeds'
    ],
    setupSteps: [
      'Go to Google AI Studio (ai.google.dev)',
      'Sign in with your Google account',
      'Click "Get API key" and create a new key',
      'Paste the key below and save'
    ]
  },
  {
    id: 'deepmotion',
    name: 'DeepMotion',
    description: 'AI-powered motion capture from video. Extract animations for characters.',
    icon: Video,
    secretKey: 'DEEPMOTION_API_KEY',
    docsUrl: 'https://www.deepmotion.com/developers',
    features: [
      'Video-to-animation extraction',
      'Full body motion capture',
      'Facial animation support',
      'Multiple skeleton formats'
    ],
    setupSteps: [
      'Create an account at deepmotion.com',
      'Go to Developer Portal',
      'Generate an API key from your dashboard',
      'Paste the key below and save'
    ]
  }
];

interface ComfyUIFeature {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiredNodes: string[];
  setupInstructions: { step: string; command?: string }[];
  usageNotes: string;
  modelDownloads?: { name: string; url: string; path: string }[];
}

interface SystemRequirement {
  name: string;
  version: string;
  critical: boolean;
  installCommand?: string;
  notes: string;
}

const systemRequirements: SystemRequirement[] = [
  {
    name: 'Python',
    version: '3.10 - 3.12',
    critical: true,
    notes: 'Python 3.10+ required. Python 3.13 may have compatibility issues with some nodes.'
  },
  {
    name: 'PyTorch',
    version: '2.6.0+ (MANDATORY)',
    critical: true,
    installCommand: 'pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --upgrade',
    notes: '🚨 SECURITY FIX REQUIRED: PyTorch 2.6+ is MANDATORY due to CVE-2025-32434 vulnerability. MiDaS depth maps, BAE normal maps, and ALL ControlNet preprocessors will FAIL with "torch.load" error without this update. Run the upgrade command and restart ComfyUI.'
  },
  {
    name: 'CUDA Toolkit',
    version: '12.1+ (recommended)',
    critical: false,
    notes: 'Required for GPU acceleration. Match CUDA version with PyTorch installation.'
  },
  {
    name: 'ComfyUI',
    version: 'Latest from GitHub',
    critical: true,
    installCommand: 'git clone https://github.com/comfyanonymous/ComfyUI.git',
    notes: 'Clone the latest version. Update regularly with git pull.'
  },
  {
    name: 'ComfyUI-Manager',
    version: 'Latest',
    critical: true,
    installCommand: 'cd ComfyUI/custom_nodes && git clone https://github.com/ltdrdata/ComfyUI-Manager.git',
    notes: 'Essential for installing custom nodes. Provides GUI for node management.'
  },
  {
    name: 'ComfyUI-ControlNet-Aux',
    version: 'Latest',
    critical: true,
    installCommand: 'Install via ComfyUI Manager → Install Custom Nodes → Search "comfyui_controlnet_aux"',
    notes: 'CRITICAL for Depth/Normal maps. Contains MiDaS, BAE, OpenPose, Canny, and other preprocessors. Auto-downloads models on first use.'
  },
  {
    name: 'transformers',
    version: 'Latest',
    critical: true,
    installCommand: 'pip install transformers --upgrade',
    notes: 'HuggingFace transformers library. Required for MiDaS, BAE, and other preprocessors.'
  },
  {
    name: 'huggingface_hub',
    version: 'Latest',
    critical: false,
    installCommand: 'pip install huggingface_hub[hf_xet]',
    notes: 'Optional: Install with hf_xet for faster model downloads from HuggingFace.'
  },
  {
    name: 'ComfyUI-rembg',
    version: 'Latest',
    critical: false,
    installCommand: 'Install via ComfyUI Manager → Install Custom Nodes → Search "rembg"',
    notes: 'Required for background removal. Auto-downloads u2net model on first use.'
  },
  {
    name: 'Windows Developer Mode',
    version: 'N/A',
    critical: false,
    notes: 'Enable Developer Mode in Windows Settings for symlink support. Reduces disk space for cached models.'
  }
];

const comfyuiFeatures: ComfyUIFeature[] = [
  {
    id: 'txt2img',
    name: 'Text-to-Image Generation',
    icon: Image,
    description: 'Generate images from text prompts using Stable Diffusion models.',
    requiredNodes: ['CheckpointLoaderSimple', 'CLIPTextEncode', 'KSampler', 'VAEDecode', 'SaveImage'],
    setupInstructions: [
      { step: 'Download SDXL checkpoint from HuggingFace', command: 'wget https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors -P ComfyUI/models/checkpoints/' },
      { step: 'Optional: Download SDXL Refiner for higher quality', command: 'wget https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors -P ComfyUI/models/checkpoints/' },
      { step: 'Optional: Download VAE for better colors', command: 'wget https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors -P ComfyUI/models/vae/' },
      { step: 'Optional: Add LoRA models for style control', command: 'Place .safetensors LoRA files in ComfyUI/models/loras/' }
    ],
    modelDownloads: [
      { name: 'SDXL Base 1.0', url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0', path: 'ComfyUI/models/checkpoints/' }
    ],
    usageNotes: 'Use in ComfyUI Studio or Concept Art Generator with ComfyUI provider selected. Supports prompts up to 77 tokens.'
  },
  {
    id: 'img2img',
    name: 'Image-to-Image Transformation',
    icon: Wand2,
    description: 'Modify existing images using prompts while preserving structure.',
    requiredNodes: ['LoadImage', 'VAEEncode', 'KSampler', 'VAEDecode', 'SaveImage'],
    setupInstructions: [
      { step: 'Same checkpoint as txt2img required (SDXL recommended)' },
      { step: 'Images are loaded automatically from SceneCraft' },
      { step: 'Adjust denoising strength to control transformation amount (0.3-0.7 recommended)' }
    ],
    usageNotes: 'Use for costume changes, style variations, aging effects, and iterating on existing concept art. Lower denoising = more faithful to original.'
  },
  {
    id: 'depth',
    name: 'Depth Map Generation',
    icon: Layers,
    description: 'Extract depth maps from images for 3D prep and parallax effects.',
    requiredNodes: ['LoadImage', 'MiDaS-DepthMapPreprocessor', 'SaveImage'],
    setupInstructions: [
      { step: '⚠️ CRITICAL: Upgrade PyTorch to 2.6+', command: 'pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --upgrade' },
      { step: '⚠️ CRITICAL: Upgrade transformers library', command: 'pip install transformers --upgrade' },
      { step: 'Install ComfyUI-ControlNet-Aux from ComfyUI Manager' },
      { step: 'Open ComfyUI Manager (Manager button in UI)' },
      { step: 'Click "Install Custom Nodes"' },
      { step: 'Search for "ComfyUI-ControlNet-Aux" and install' },
      { step: 'Restart ComfyUI after installation', command: 'python main.py --enable-cors-header --listen 0.0.0.0' },
      { step: 'MiDaS/ZoeDepth models download automatically on first use (~400MB)' }
    ],
    usageNotes: 'Outputs PNG depth maps for camera movement simulation, parallax effects, and geometry prep for 3D pipelines. Requires PyTorch 2.6+ due to security CVE.'
  },
  {
    id: 'normals',
    name: 'Normal Map Generation',
    icon: Box,
    description: 'Generate surface normal maps for texturing and lighting.',
    requiredNodes: ['LoadImage', 'BAE-NormalMapPreprocessor', 'SaveImage'],
    setupInstructions: [
      { step: '⚠️ CRITICAL: Upgrade PyTorch to 2.6+', command: 'pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --upgrade' },
      { step: 'Install ComfyUI-ControlNet-Aux from ComfyUI Manager (same as depth)' },
      { step: 'BAE model downloads automatically on first use (~200MB)' },
      { step: 'Alternative: Use DSINE for more detailed normals' }
    ],
    usageNotes: 'Use for texture baking, shader previews, game-engine material prep, and lighting tests in 3D software.'
  },
  {
    id: 'style_transfer',
    name: 'Style Transfer',
    icon: Palette,
    description: 'Apply artistic styles to images while preserving content.',
    requiredNodes: ['LoadImage', 'VAEEncode', 'CLIPTextEncode', 'KSampler', 'VAEDecode', 'SaveImage'],
    setupInstructions: [
      { step: 'Same setup as img2img' },
      { step: 'For reference-based style transfer, install IP-Adapter:' },
      { step: 'Install from ComfyUI Manager: Search "ComfyUI_IPAdapter_plus"' },
      { step: 'Download IP-Adapter model', command: 'wget https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter_sdxl.safetensors -P ComfyUI/models/ipadapter/' },
      { step: 'Download CLIP Vision model', command: 'wget https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/image_encoder/model.safetensors -P ComfyUI/models/clip_vision/' }
    ],
    usageNotes: 'Use for franchise-wide style consistency, art-direction changes, and applying reference image styles to new content.'
  },
  {
    id: 'upscale',
    name: 'Upscaling & Enhancement',
    icon: ZoomIn,
    description: 'Upscale images to higher resolution with AI enhancement.',
    requiredNodes: ['LoadImage', 'UpscaleModelLoader', 'ImageUpscaleWithModel', 'SaveImage'],
    setupInstructions: [
      { step: 'Download RealESRGAN upscaler (4x)', command: 'wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth -P ComfyUI/models/upscale_models/' },
      { step: 'Alternative: Download ESRGAN for anime/illustration', command: 'wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth -P ComfyUI/models/upscale_models/' },
      { step: 'Alternative: Download 4x-UltraSharp for maximum detail', command: 'Download from OpenModelDB and place in ComfyUI/models/upscale_models/' }
    ],
    usageNotes: 'Use for print-quality images, high-res texture generation, and enlarging low-resolution reference images.'
  },
  {
    id: 'rembg',
    name: 'Background Removal',
    icon: Scissors,
    description: 'Remove backgrounds and create alpha masks for compositing.',
    requiredNodes: ['LoadImage', 'Image Remove Background (rembg)', 'SaveImage'],
    setupInstructions: [
      { step: 'Install ComfyUI-rembg from ComfyUI Manager' },
      { step: 'Open ComfyUI Manager → Install Custom Nodes' },
      { step: 'Search "rembg" and install "ComfyUI-rembg"' },
      { step: 'Restart ComfyUI', command: 'python main.py --enable-cors-header --listen 0.0.0.0' },
      { step: 'Models (u2net, isnet) download automatically on first use (~170MB)' }
    ],
    usageNotes: 'Use for character cutouts, clean asset extraction, compositing prep, and creating PNGs with transparency.'
  },
  {
    id: 'controlnet',
    name: 'Pose & Structure Control',
    icon: Wand2,
    description: 'Use ControlNet for pose-guided and structure-aware generation.',
    requiredNodes: ['ControlNetLoader', 'ControlNetApply', 'LoadImage', 'PreprocessImage'],
    setupInstructions: [
      { step: '⚠️ CRITICAL: Upgrade PyTorch to 2.6+', command: 'pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --upgrade' },
      { step: 'Download ControlNet models for SDXL:' },
      { step: 'OpenPose (body pose):', command: 'wget https://huggingface.co/lllyasviel/sd_control_collection/resolve/main/thibaud_xl_openpose.safetensors -P ComfyUI/models/controlnet/' },
      { step: 'Canny (edge detection):', command: 'wget https://huggingface.co/lllyasviel/sd_control_collection/resolve/main/sai_xl_canny_256lora.safetensors -P ComfyUI/models/controlnet/' },
      { step: 'Depth:', command: 'wget https://huggingface.co/lllyasviel/sd_control_collection/resolve/main/sai_xl_depth_256lora.safetensors -P ComfyUI/models/controlnet/' },
      { step: 'Install ComfyUI-ControlNet-Aux for preprocessors (pose detection, edge detection, etc.)' }
    ],
    usageNotes: 'Use for pose-consistent characters, animation keyframes, rigging references, and generating images that match specific structures.'
  },
];

export default function ExternalTools() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [toolStatus, setToolStatus] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [activeTab, setActiveTab] = useState('api-keys');
  
  // ComfyUI Local Server state
  const [comfyuiServerUrl, setComfyuiServerUrl] = useState(() => {
    return localStorage.getItem('comfyui_server_url') || '';
  });
  const [comfyuiStatus, setComfyuiStatus] = useState<'disconnected' | 'connected' | 'testing'>('disconnected');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Check which tools have API keys configured
  useEffect(() => {
    const checkToolStatus = async () => {
      setCheckingStatus(true);
      try {
        const { data, error } = await supabase.functions.invoke('check-api-keys', {
          body: { keys: tools.map(t => t.secretKey) }
        });
        
        if (error) throw error;
        
        const status: Record<string, boolean> = {};
        tools.forEach(tool => {
          status[tool.id] = data?.configured?.[tool.secretKey] || false;
        });
        setToolStatus(status);
      } catch (error) {
        console.error('Error checking tool status:', error);
        const status: Record<string, boolean> = {};
        tools.forEach(tool => {
          status[tool.id] = false;
        });
        setToolStatus(status);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (isAuthenticated) {
      checkToolStatus();
    }
  }, [isAuthenticated]);

  const handleSaveKey = async (tool: ToolConfig) => {
    const key = apiKeys[tool.id];
    if (!key?.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setSaving({ ...saving, [tool.id]: true });
    
    try {
      const { error } = await supabase.functions.invoke('save-api-key', {
        body: { 
          keyName: tool.secretKey,
          keyValue: key.trim()
        }
      });

      if (error) throw error;

      setToolStatus({ ...toolStatus, [tool.id]: true });
      setApiKeys({ ...apiKeys, [tool.id]: '' });
      toast.success(`${tool.name} API key saved successfully`);
    } catch (error: any) {
      console.error('Error saving API key:', error);
      toast.error(error.message || 'Failed to save API key');
    } finally {
      setSaving({ ...saving, [tool.id]: false });
    }
  };

  const handleTestConnection = async (tool: ToolConfig) => {
    setTesting({ ...testing, [tool.id]: true });
    
    try {
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: { keyName: tool.secretKey }
      });

      if (error) throw error;

      if (data?.valid) {
        toast.success(`${tool.name} connection successful!`);
      } else {
        toast.error(`${tool.name} connection failed: ${data?.error || 'Invalid API key'}`);
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast.error(error.message || 'Failed to test connection');
    } finally {
      setTesting({ ...testing, [tool.id]: false });
    }
  };

  // ComfyUI functions
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const handleSaveComfyUIUrl = () => {
    if (!comfyuiServerUrl.trim()) {
      toast.error('Please enter a server URL');
      return;
    }
    localStorage.setItem('comfyui_server_url', comfyuiServerUrl.trim());
    toast.success('ComfyUI server URL saved!');
  };

  const handleTestComfyUI = async () => {
    if (!comfyuiServerUrl.trim()) {
      toast.error('Please enter a server URL first');
      return;
    }

    setComfyuiStatus('testing');
    
    try {
      console.log('Testing ComfyUI connection to:', comfyuiServerUrl.trim());
      
      const { data, error } = await supabase.functions.invoke('comfyui-image-generate', {
        body: { 
          action: 'test_connection',
          serverUrl: comfyuiServerUrl.trim()
        }
      });

      console.log('ComfyUI test response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Edge function error');
      }

      if (data?.connected || data?.success) {
        setComfyuiStatus('connected');
        localStorage.setItem('comfyui_server_url', comfyuiServerUrl.trim());
        toast.success('ComfyUI server connected successfully!');
      } else {
        setComfyuiStatus('disconnected');
        const errorMsg = data?.error || 'Failed to connect to ComfyUI server';
        console.error('Connection failed:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Error testing ComfyUI:', error);
      setComfyuiStatus('disconnected');
      toast.error(error.message || 'Failed to connect to ComfyUI server');
    }
  };

  const toggleFeatureExpanded = (featureId: string) => {
    setExpandedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">External Tools</h1>
          <p className="text-muted-foreground mt-1">
            Configure API keys and local AI servers for image generation, 3D models, and more
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="comfyui" className="gap-2">
              <Server className="h-4 w-4" />
              ComfyUI Local
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys">
            {/* Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {tools.map(tool => (
                <Card key={tool.id} className={`border ${toolStatus[tool.id] ? 'border-green-500/50 bg-green-500/5' : 'border-border'}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toolStatus[tool.id] ? 'bg-green-500/20' : 'bg-muted'}`}>
                      <tool.icon className={`w-5 h-5 ${toolStatus[tool.id] ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{tool.name}</p>
                      {checkingStatus ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking...
                        </div>
                      ) : (
                        <Badge 
                          variant={toolStatus[tool.id] ? 'default' : 'secondary'}
                          className={`text-xs ${toolStatus[tool.id] ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}`}
                        >
                          {toolStatus[tool.id] ? (
                            <><Check className="w-3 h-3 mr-1" /> Connected</>
                          ) : (
                            <><X className="w-3 h-3 mr-1" /> Not Configured</>
                          )}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tool Configuration Cards */}
            <div className="space-y-6">
              {tools.map(tool => (
                <Card key={tool.id} className="border-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <tool.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {tool.name}
                            {toolStatus[tool.id] && (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                <Check className="w-3 h-3 mr-1" /> Online
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{tool.description}</CardDescription>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={tool.docsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Docs
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Features */}
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Features</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tool.features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="font-normal">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Setup Steps */}
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Setup Steps</Label>
                      <ol className="mt-2 space-y-2">
                        {tool.setupSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* API Key Input */}
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`key-${tool.id}`} className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          API Key
                        </Label>
                        {toolStatus[tool.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestConnection(tool)}
                            disabled={testing[tool.id]}
                          >
                            {testing[tool.id] ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Test Connection
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id={`key-${tool.id}`}
                            type={showKeys[tool.id] ? 'text' : 'password'}
                            placeholder={toolStatus[tool.id] ? '••••••••••••••••••••' : 'Enter your API key'}
                            value={apiKeys[tool.id] || ''}
                            onChange={(e) => setApiKeys({ ...apiKeys, [tool.id]: e.target.value })}
                            className="bg-background pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys({ ...showKeys, [tool.id]: !showKeys[tool.id] })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKeys[tool.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <Button
                          variant="gold"
                          onClick={() => handleSaveKey(tool)}
                          disabled={saving[tool.id] || !apiKeys[tool.id]?.trim()}
                        >
                          {saving[tool.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Save Key'
                          )}
                        </Button>
                      </div>
                      
                      {toolStatus[tool.id] && (
                        <p className="text-xs text-muted-foreground">
                          A key is already configured. Enter a new key to replace it.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comfyui">
            <div className="space-y-6">
              {/* Connection Card */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
                        <Server className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          ComfyUI Local Server
                          {comfyuiStatus === 'connected' && (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <Check className="w-3 h-3 mr-1" /> Connected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Run AI image generation locally using your own GPU with ComfyUI
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        ComfyUI Docs
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Core Identity */}
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <h3 className="font-medium text-purple-400 mb-2">ComfyUI in SceneCraft</h3>
                    <p className="text-sm text-muted-foreground">
                      ComfyUI acts as your local AI perception and visual processing engine. It produces images, variations, depth maps, 
                      normal maps, masks, multi-view references, and animation prep assets - all using your own GPU for free.
                    </p>
                  </div>

                  {/* Requirements */}
                  {/* Critical Requirements Alert */}
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-start gap-2">
                      <Terminal className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-red-500">⚠️ Critical Requirements (Must Install)</p>
                        <ul className="text-muted-foreground mt-2 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-red-400 font-semibold">PyTorch 2.6+:</span>
                            <span>Required due to CVE-2025-32434 security vulnerability. MiDaS, BAE, and other preprocessors will fail without this.</span>
                          </li>
                        </ul>
                        <div className="mt-3 flex items-center gap-2">
                          <code className="flex-1 bg-background p-2 rounded text-xs font-mono overflow-x-auto">
                            pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --upgrade
                          </code>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard('pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --upgrade', 'pytorch')}
                          >
                            {copiedCommand === 'pytorch' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Also upgrade transformers: <code className="bg-background px-1 rounded">pip install transformers --upgrade</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* System Requirements */}
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-2">
                      <Terminal className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-500">System Requirements</p>
                        <ul className="text-muted-foreground mt-1 space-y-0.5">
                          <li>• <span className="text-foreground font-medium">Python 3.10 - 3.12</span> (3.13 may have compatibility issues)</li>
                          <li>• <span className="text-foreground font-medium">PyTorch 2.6.0+</span> (CRITICAL - see above)</li>
                          <li>• <span className="text-foreground font-medium">NVIDIA GPU</span> with 8GB+ VRAM (RTX 3060 or better recommended)</li>
                          <li>• <span className="text-foreground font-medium">CUDA Toolkit 12.1+</span> (match with PyTorch version)</li>
                          <li>• <span className="text-foreground font-medium">20GB+ free disk space</span> for models</li>
                          <li>• Windows, Linux, or macOS</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Optional Optimizations */}
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-start gap-2">
                      <Terminal className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-500">Optional Optimizations</p>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• <span className="text-foreground">Faster downloads:</span> <code className="text-xs bg-background px-1 rounded">pip install huggingface_hub[hf_xet]</code></li>
                          <li>• <span className="text-foreground">Windows symlinks:</span> Enable Developer Mode in Windows Settings → System → For Developers</li>
                          <li>• <span className="text-foreground">Upgrade transformers:</span> <code className="text-xs bg-background px-1 rounded">pip install transformers --upgrade</code></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-step Setup */}
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">
                      Initial Setup Guide
                    </Label>
                    
                    <div className="space-y-4">
                      {/* Step 1 */}
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">1</span>
                          <span className="font-medium">Install ComfyUI</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Clone or download ComfyUI from the official repository:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background p-2 rounded text-sm font-mono overflow-x-auto">
                            git clone https://github.com/comfyanonymous/ComfyUI.git
                          </code>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard('git clone https://github.com/comfyanonymous/ComfyUI.git', 'step1')}
                          >
                            {copiedCommand === 'step1' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">2</span>
                          <span className="font-medium">Install ComfyUI Manager (Recommended)</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          ComfyUI Manager makes installing custom nodes easy:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-2 rounded text-sm font-mono overflow-x-auto">
                              cd ComfyUI/custom_nodes
                            </code>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyToClipboard('cd ComfyUI/custom_nodes', 'step2a')}
                            >
                              {copiedCommand === 'step2a' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-2 rounded text-sm font-mono overflow-x-auto">
                              git clone https://github.com/ltdrdata/ComfyUI-Manager.git
                            </code>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyToClipboard('git clone https://github.com/ltdrdata/ComfyUI-Manager.git', 'step2b')}
                            >
                              {copiedCommand === 'step2b' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 - Install ControlNet-Aux */}
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center font-semibold">3</span>
                          <span className="font-medium text-red-500">⚠️ Install ComfyUI-ControlNet-Aux (REQUIRED)</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Required for Depth Maps, Normal Maps, and other preprocessors. Start ComfyUI first, then:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                          <li>1. Open ComfyUI in browser (http://localhost:8188)</li>
                          <li>2. Click <span className="text-foreground font-medium">"Manager"</span> button in the top menu</li>
                          <li>3. Click <span className="text-foreground font-medium">"Install Custom Nodes"</span></li>
                          <li>4. Search for <span className="text-foreground font-mono">"comfyui_controlnet_aux"</span></li>
                          <li>5. Click Install and <span className="text-foreground font-medium">restart ComfyUI</span></li>
                        </ul>
                        <p className="text-xs text-amber-500">
                          ⚡ Models (MiDaS, BAE, etc.) will auto-download on first use (~400-600MB total)
                        </p>
                      </div>

                      {/* Step 4 */}
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">4</span>
                          <span className="font-medium">Download Models</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Download SDXL checkpoint for image generation:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                          <li>• <span className="text-foreground">SDXL Base:</span> <a href="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">HuggingFace</a> → Place in <code className="text-xs bg-background px-1 rounded">ComfyUI/models/checkpoints/</code></li>
                          <li>• <span className="text-foreground">ControlNet:</span> <a href="https://huggingface.co/lllyasviel" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">HuggingFace</a> → Place in <code className="text-xs bg-background px-1 rounded">ComfyUI/models/controlnet/</code></li>
                          <li>• <span className="text-foreground">Upscaler:</span> <a href="https://github.com/xinntao/Real-ESRGAN/releases" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a> → Place in <code className="text-xs bg-background px-1 rounded">ComfyUI/models/upscale_models/</code></li>
                        </ul>
                      </div>

                      {/* Step 5 */}
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">5</span>
                          <span className="font-medium">Start ComfyUI with API Enabled</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Go to ComfyUI root folder and start with CORS enabled:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background p-2 rounded text-sm font-mono overflow-x-auto">
                            python main.py --enable-cors-header --listen 0.0.0.0
                          </code>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard('python main.py --enable-cors-header --listen 0.0.0.0', 'step5')}
                          >
                            {copiedCommand === 'step5' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ComfyUI will start on port 8188 by default
                        </p>
                      </div>

                      {/* Step 6 */}
                      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">6</span>
                          <span className="font-medium">Expose with ngrok (for external access)</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Install ngrok and create a tunnel to your local ComfyUI:
                        </p>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Download ngrok from <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ngrok.com/download</a> and run:
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-2 rounded text-sm font-mono overflow-x-auto">
                              ngrok http 8188
                            </code>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyToClipboard('ngrok http 8188', 'step6')}
                            >
                              {copiedCommand === 'step6' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Copy the <span className="font-mono text-primary">https://xxxxx.ngrok.io</span> URL from ngrok output
                          </p>
                        </div>
                      </div>

                      {/* Step 7 - Connect */}
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">7</span>
                          <span className="font-medium text-primary">Connect to SceneCraft</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Paste your ngrok URL below to connect your local ComfyUI:
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://xxxxx.ngrok.io or http://localhost:8188"
                            value={comfyuiServerUrl}
                            onChange={(e) => setComfyuiServerUrl(e.target.value)}
                            className="bg-background"
                          />
                          <Button
                            variant="outline"
                            onClick={handleSaveComfyUIUrl}
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleTestComfyUI}
                            disabled={comfyuiStatus === 'testing'}
                          >
                            {comfyuiStatus === 'testing' ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                            ) : (
                              <><RefreshCw className="w-4 h-4 mr-2" /> Test Connection</>
                            )}
                          </Button>
                        </div>
                        
                        {comfyuiStatus === 'connected' && (
                          <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/30 text-sm text-green-500 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            ComfyUI server is connected and ready!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting */}
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">
                      Troubleshooting
                    </Label>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Connection failed?</strong> Make sure ComfyUI is running and ngrok tunnel is active.</p>
                      <p><strong className="text-foreground">CUDA out of memory?</strong> Close other GPU-heavy apps or reduce image resolution.</p>
                      <p><strong className="text-foreground">Missing nodes?</strong> Use ComfyUI Manager to install required custom nodes.</p>
                      <p><strong className="text-foreground">Slow generation?</strong> First run downloads models (~2-5GB). Subsequent runs will be faster.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features Card */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-purple-500" />
                    Available Features
                  </CardTitle>
                  <CardDescription>
                    Each feature requires specific nodes and models. Expand to see setup instructions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {comfyuiFeatures.map(feature => (
                    <Collapsible 
                      key={feature.id}
                      open={expandedFeatures.includes(feature.id)}
                      onOpenChange={() => toggleFeatureExpanded(feature.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 rounded-lg bg-secondary/30 border border-border hover:border-purple-500/50 transition-all flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                              <feature.icon className="w-5 h-5 text-purple-500" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-foreground">{feature.name}</p>
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                          </div>
                          {expandedFeatures.includes(feature.id) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 px-4 pb-4">
                        <div className="space-y-4 pt-2 border-t border-border/50">
                          {/* Required Nodes */}
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Required Nodes</Label>
                            <div className="flex flex-wrap gap-2">
                              {feature.requiredNodes.map((node, idx) => (
                                <Badge key={idx} variant="outline" className="font-mono text-xs">
                                  {node}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Setup Instructions */}
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Setup Instructions</Label>
                            <ol className="space-y-2">
                              {feature.setupInstructions.map((instruction, idx) => (
                                <li key={idx} className="text-sm">
                                  <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-500 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <span className="text-muted-foreground">{instruction.step}</span>
                                  </div>
                                  {instruction.command && (
                                    <div className="ml-7 mt-1 flex items-center gap-2">
                                      <code className="flex-1 bg-background p-2 rounded text-xs font-mono overflow-x-auto text-foreground">
                                        {instruction.command}
                                      </code>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => copyToClipboard(instruction.command!, `feature-${feature.id}-${idx}`)}
                                      >
                                        {copiedCommand === `feature-${feature.id}-${idx}` ? (
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Usage Notes */}
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                            <p className="text-sm text-purple-400">
                              <strong>Usage:</strong> {feature.usageNotes}
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
