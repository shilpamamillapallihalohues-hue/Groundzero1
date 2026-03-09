import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { 
  Box, Download, CheckCircle, XCircle, Loader2, Settings2, ExternalLink,
  Terminal, Copy, FileJson, Zap, Server, Cpu, ArrowRight, Info, Shield
} from 'lucide-react';

interface Engine3DConfig {
  default_engine: 'meshy' | 'tripo' | 'comfyui';
  comfyui_enabled: boolean;
  comfyui_url: string | null;
  meshy_enabled: boolean;
  tripo_enabled: boolean;
}

const COMFYUI_WORKFLOWS = [
  {
    id: 'triposr',
    name: 'Image to 3D (TripoSR)',
    description: 'Convert a single reference image to 3D model. Best for props and simple characters.',
    filename: 'triposr_workflow.json',
    features: ['Single Image Input', 'Fast Generation', 'GLB Export'],
    requirements: ['ComfyUI-Flowty-TripoSR'],
  },
  {
    id: 'multiview',
    name: 'Multi-View Generation (Zero123++)',
    description: 'Generate 6 turnaround views from a single reference for accurate reconstruction.',
    filename: 'multiview_workflow.json',
    features: ['6-View Output', 'Consistent Character', 'High Quality'],
    requirements: ['zero123plus-comfyui'],
  },
  {
    id: 'full_pipeline',
    name: 'Full 3D Pipeline',
    description: 'Complete workflow: Reference → Turnarounds → 3D Mesh → Optimized GLB',
    filename: 'full_pipeline_workflow.json',
    features: ['End-to-End', 'Multi-View', '3D Reconstruction', 'Mesh Optimization'],
    requirements: ['ComfyUI-Flowty-TripoSR', 'zero123plus-comfyui', 'ComfyUI-3D-Pack'],
  },
  {
    id: 'instant_mesh',
    name: 'InstantMesh High Quality',
    description: 'Production-quality 3D reconstruction using InstantMesh for detailed characters.',
    filename: 'instant_mesh_workflow.json',
    features: ['High Detail', 'Multi-View Input', 'Production Ready'],
    requirements: ['ComfyUI-InstantMesh'],
  },
];

const WORKFLOW_CONTENTS: Record<string, object> = {
  triposr_workflow: {
    last_node_id: 8,
    last_link_id: 7,
    nodes: [
      { id: 1, type: "LoadImage", pos: [100, 200], size: [315, 314], outputs: [{ name: "IMAGE", type: "IMAGE", links: [1] }] },
      { id: 2, type: "TripoSRModelLoader", pos: [100, 50], outputs: [{ name: "TRIPOSR_MODEL", type: "TRIPOSR_MODEL", links: [2] }] },
      { id: 3, type: "TripoSRSampler", pos: [500, 150], inputs: [{ name: "model", type: "TRIPOSR_MODEL", link: 2 }, { name: "image", type: "IMAGE", link: 1 }], outputs: [{ name: "MESH", type: "MESH", links: [3] }], widgets_values: [256, 0.5] },
      { id: 4, type: "SaveGLB", pos: [800, 150], inputs: [{ name: "mesh", type: "MESH", link: 3 }], widgets_values: ["output_model"] }
    ],
    links: [[1, 1, 0, 3, 1, "IMAGE"], [2, 2, 0, 3, 0, "TRIPOSR_MODEL"], [3, 3, 0, 4, 0, "MESH"]]
  },
  multiview_workflow: {
    last_node_id: 6,
    last_link_id: 5,
    nodes: [
      { id: 1, type: "LoadImage", pos: [100, 200], outputs: [{ name: "IMAGE", type: "IMAGE", links: [1] }] },
      { id: 2, type: "Zero123PlusModelLoader", pos: [100, 50], outputs: [{ name: "MODEL", type: "ZERO123_MODEL", links: [2] }] },
      { id: 3, type: "Zero123PlusSampler", pos: [450, 150], inputs: [{ name: "model", type: "ZERO123_MODEL", link: 2 }, { name: "image", type: "IMAGE", link: 1 }], outputs: [{ name: "IMAGES", type: "IMAGE", links: [3] }], widgets_values: [6, 20, 7.5, 42] },
      { id: 4, type: "PreviewImage", pos: [800, 150], inputs: [{ name: "images", type: "IMAGE", link: 3 }] }
    ],
    links: [[1, 1, 0, 3, 1, "IMAGE"], [2, 2, 0, 3, 0, "ZERO123_MODEL"], [3, 3, 0, 4, 0, "IMAGE"]]
  },
  full_pipeline_workflow: {
    last_node_id: 10,
    nodes: [
      { id: 1, type: "LoadImage", pos: [50, 200], title: "Reference Image", outputs: [{ name: "IMAGE", links: [1] }] },
      { id: 2, type: "Zero123PlusModelLoader", pos: [50, 50], outputs: [{ name: "MODEL", links: [2] }] },
      { id: 3, type: "Zero123PlusSampler", pos: [350, 100], title: "Generate 6 Views", widgets_values: [6, 30, 7.5, 12345], inputs: [{ name: "model", link: 2 }, { name: "image", link: 1 }], outputs: [{ name: "IMAGES", links: [3] }] },
      { id: 4, type: "TripoSRModelLoader", pos: [350, 300], outputs: [{ name: "MODEL", links: [4] }] },
      { id: 5, type: "ImageSelector", pos: [650, 100], title: "Select Front View", inputs: [{ name: "images", link: 3 }], outputs: [{ name: "IMAGE", links: [5] }] },
      { id: 6, type: "TripoSRSampler", pos: [650, 250], title: "Generate 3D Mesh", widgets_values: [512, 0.85], inputs: [{ name: "model", link: 4 }, { name: "image", link: 5 }], outputs: [{ name: "MESH", links: [6] }] },
      { id: 7, type: "MeshSimplify", pos: [950, 200], title: "Optimize (250k polys)", widgets_values: [250000], inputs: [{ name: "mesh", link: 6 }], outputs: [{ name: "MESH", links: [7] }] },
      { id: 8, type: "SaveGLB", pos: [1200, 200], title: "Export GLB", inputs: [{ name: "mesh", link: 7 }] }
    ],
    links: [[1, 1, 0, 3, 1, "IMAGE"], [2, 2, 0, 3, 0, "MODEL"], [3, 3, 0, 5, 0, "IMAGE"], [4, 4, 0, 6, 0, "MODEL"], [5, 5, 0, 6, 1, "IMAGE"], [6, 6, 0, 7, 0, "MESH"], [7, 7, 0, 8, 0, "MESH"]]
  },
  instant_mesh_workflow: {
    last_node_id: 6,
    nodes: [
      { id: 1, type: "LoadImage", pos: [100, 200], title: "Multi-View Input", outputs: [{ name: "IMAGE", links: [1] }] },
      { id: 2, type: "InstantMeshLoader", pos: [100, 50], outputs: [{ name: "MODEL", links: [2] }] },
      { id: 3, type: "InstantMeshSampler", pos: [450, 150], inputs: [{ name: "model", link: 2 }, { name: "images", link: 1 }], outputs: [{ name: "MESH", links: [3] }], widgets_values: [512, 30, 0.9] },
      { id: 4, type: "MeshTexture", pos: [750, 150], inputs: [{ name: "mesh", link: 3 }], outputs: [{ name: "MESH", links: [4] }] },
      { id: 5, type: "SaveGLB", pos: [1000, 150], inputs: [{ name: "mesh", link: 4 }], widgets_values: ["instant_mesh_output"] }
    ],
    links: [[1, 1, 0, 3, 1, "IMAGE"], [2, 2, 0, 3, 0, "MODEL"], [3, 3, 0, 4, 0, "MESH"], [4, 4, 0, 5, 0, "MESH"]]
  }
};

const INSTALLATION_STEPS = [
  {
    title: 'Install ComfyUI',
    commands: [
      'git clone https://github.com/comfyanonymous/ComfyUI.git',
      'cd ComfyUI',
      'python -m venv venv',
      'venv\\Scripts\\activate  # Windows',
      'source venv/bin/activate  # Mac/Linux',
      'pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121',
      'pip install -r requirements.txt',
    ],
  },
  {
    title: 'Install 3D Nodes',
    commands: [
      'cd custom_nodes',
      'git clone https://github.com/flowtyone/ComfyUI-Flowty-TripoSR.git',
      'git clone https://github.com/SUDO-AI-3D/zero123plus-comfyui.git',
      'git clone https://github.com/jtydhr88/ComfyUI-InstantMesh.git',
      'git clone https://github.com/MrForExample/ComfyUI-3D-Pack.git',
      'cd ComfyUI-Flowty-TripoSR && pip install -r requirements.txt',
    ],
  },
  {
    title: 'Download Models',
    commands: [
      '# TripoSR Model (~1.5GB)',
      '# From: https://huggingface.co/stabilityai/TripoSR',
      '# Place in: models/triposr/',
      '',
      '# Zero123++ Model',
      '# From: https://huggingface.co/sudo-ai/zero123plus-v1.1',
      '# Place in: models/zero123/',
    ],
  },
  {
    title: 'Start ComfyUI',
    commands: [
      'python main.py --listen 0.0.0.0 --port 8188',
    ],
  },
  {
    title: 'Connect via ngrok',
    commands: [
      'npm install -g ngrok',
      'ngrok config add-authtoken YOUR_TOKEN',
      'ngrok http 8188',
      '# Copy the https URL and paste below',
    ],
  },
];

export function Engine3DConfigSection() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('engines');
  const [comfyuiUrl, setComfyuiUrl] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings-3d'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', '3d_engine_config')
        .single();
      if (error) throw error;
      return data?.setting_value as unknown as Engine3DConfig;
    },
  });

  useEffect(() => {
    if (settings?.comfyui_url) {
      setComfyuiUrl(settings.comfyui_url);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<Engine3DConfig>) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: { ...settings, ...newSettings } })
        .eq('setting_key', '3d_engine_config');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings-3d'] });
      toast.success('3D engine settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  const testComfyUIConnection = async () => {
    if (!comfyuiUrl) {
      toast.error('Please enter a ComfyUI URL');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('unknown');

    try {
      const url = comfyuiUrl.replace(/\/$/, '');
      const response = await fetch(`${url}/system_stats`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        setConnectionStatus('connected');
        toast.success('ComfyUI connection successful!');
        updateSettingsMutation.mutate({ comfyui_url: url });
      } else {
        setConnectionStatus('failed');
        toast.error('ComfyUI connection failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast.error('Could not connect to ComfyUI. Make sure ngrok is running.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const downloadWorkflow = (workflowId: string, filename: string) => {
    const content = WORKFLOW_CONTENTS[workflowId.replace('.json', '')];
    if (!content) {
      toast.error('Workflow not found');
      return;
    }

    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="engines" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Engines
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Setup Guide
          </TabsTrigger>
        </TabsList>

        {/* Engines Tab */}
        <TabsContent value="engines" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Default 3D Generation Engine
              </CardTitle>
              <CardDescription>
                Select the default engine for 3D model generation. This setting applies to all users including Art Directors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The selected engine will be used by default in the 3D Model Generator across all roles.
                  Users can override this for individual projects if other engines are enabled.
                </AlertDescription>
              </Alert>

              <RadioGroup
                value={settings?.default_engine || 'tripo'}
                onValueChange={(value) => updateSettingsMutation.mutate({ default_engine: value as Engine3DConfig['default_engine'] })}
                className="grid gap-4"
              >
                {/* Tripo AI */}
                <Card className={`cursor-pointer transition-all ${settings?.default_engine === 'tripo' ? 'ring-2 ring-emerald-500' : 'hover:border-primary/50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="tripo" id="tripo" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="tripo" className="flex items-center gap-2 cursor-pointer">
                          <span className="font-semibold text-lg">Tripo AI</span>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Recommended
                          </Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Production-ready 3D models with multi-view input, auto-rigging, and up to 500k polygons. Best for characters and creatures.
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {['Multi-View Input', 'Auto Rigging', 'Animation Presets', '500k Polys'].map(f => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                      <Switch
                        checked={settings?.tripo_enabled ?? true}
                        onCheckedChange={(checked) => updateSettingsMutation.mutate({ tripo_enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Meshy AI */}
                <Card className={`cursor-pointer transition-all ${settings?.default_engine === 'meshy' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="meshy" id="meshy" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="meshy" className="flex items-center gap-2 cursor-pointer">
                          <span className="font-semibold text-lg">Meshy AI</span>
                          <Badge variant="secondary">Cloud API</Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Fast iteration with text-to-3D and image-to-3D. 8K PBR textures and simulation-ready output.
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {['Text-to-3D', 'Image-to-3D', '8K Textures', 'Hair/Cloth Sim'].map(f => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                      <Switch
                        checked={settings?.meshy_enabled ?? true}
                        onCheckedChange={(checked) => updateSettingsMutation.mutate({ meshy_enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* ComfyUI */}
                <Card className={`cursor-pointer transition-all ${settings?.default_engine === 'comfyui' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="comfyui" id="comfyui" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="comfyui" className="flex items-center gap-2 cursor-pointer">
                          <span className="font-semibold text-lg">ComfyUI (Local)</span>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Free / Self-Hosted
                          </Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Run open-source 3D models locally via ComfyUI. Free, private, and customizable workflows.
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {['TripoSR', 'InstantMesh', 'Zero123++', 'Custom Workflows'].map(f => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </div>
                      <Switch
                        checked={settings?.comfyui_enabled ?? true}
                        onCheckedChange={(checked) => updateSettingsMutation.mutate({ comfyui_enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </RadioGroup>

              {/* ComfyUI Connection */}
              {settings?.comfyui_enabled && (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      ComfyUI Connection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://your-ngrok-url.ngrok-free.app"
                        value={comfyuiUrl}
                        onChange={(e) => setComfyuiUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={testComfyUIConnection}
                        disabled={isTestingConnection}
                      >
                        {isTestingConnection ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : connectionStatus === 'connected' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : connectionStatus === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        <span className="ml-2">Test</span>
                      </Button>
                    </div>
                    {connectionStatus === 'connected' && (
                      <Badge className="bg-green-500/10 text-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected to ComfyUI
                      </Badge>
                    )}
                    {connectionStatus === 'failed' && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Connection Failed
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Downloadable ComfyUI Workflows
              </CardTitle>
              <CardDescription>
                Pre-configured workflows for 3D generation. Download and import into ComfyUI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {COMFYUI_WORKFLOWS.map((workflow) => (
                <Card key={workflow.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold">{workflow.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workflow.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workflow.features.map(f => (
                            <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Required nodes: </span>
                          <span className="text-xs font-mono">{workflow.requirements.join(', ')}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => downloadWorkflow(workflow.id + '_workflow', workflow.filename)}
                        className="shrink-0"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>How to use:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Download the workflow JSON file</li>
                    <li>Open ComfyUI in your browser (http://localhost:8188)</li>
                    <li>Click "Load" and select the downloaded JSON</li>
                    <li>Upload your reference image and click "Queue Prompt"</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setup Guide Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                ComfyUI Installation Guide
              </CardTitle>
              <CardDescription>
                Step-by-step instructions to set up ComfyUI with 3D generation nodes on your local PC.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Cpu className="h-4 w-4" />
                <AlertDescription>
                  <strong>System Requirements:</strong> NVIDIA GPU with 8GB+ VRAM, 16GB RAM, Python 3.10+
                </AlertDescription>
              </Alert>

              <Accordion type="single" collapsible className="w-full">
                {INSTALLATION_STEPS.map((step, index) => (
                  <AccordionItem key={index} value={`step-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        {step.title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-11 space-y-2">
                        {step.commands.map((cmd, cmdIndex) => (
                          <div key={cmdIndex} className="flex items-center gap-2">
                            <code className="flex-1 bg-muted px-3 py-1.5 rounded text-sm font-mono">
                              {cmd || <span className="text-muted-foreground">&nbsp;</span>}
                            </code>
                            {cmd && !cmd.startsWith('#') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyCommand(cmd)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-6 flex gap-4">
                <Button asChild variant="outline">
                  <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    ComfyUI GitHub
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="https://dashboard.ngrok.com/signup" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get ngrok Token
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
