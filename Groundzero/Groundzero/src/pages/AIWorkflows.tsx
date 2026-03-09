import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComfyUIWorkflowPanel, WorkflowConfig } from '@/components/ai/ComfyUIWorkflowPanel';
import { ComfyUIPresetSelector } from '@/components/ai/ComfyUIPresetSelector';
import { WorkflowNodeEditor } from '@/components/ai/WorkflowNodeEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { GitBranch, Settings2, Layers, Play, Download, Upload, Loader2, Image, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  title: string;
}

interface GenerationResult {
  imageUrl?: string;
  generatedPrompt?: string;
  seed?: number;
  workflowMetadata?: Record<string, unknown>;
}

export default function AIWorkflows() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [activeTab, setActiveTab] = useState('visual');
  const [isExecuting, setIsExecuting] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleConfigFromNodeEditor = (config: WorkflowConfig) => {
    setWorkflowConfig(config);
    setActiveTab('config');
    toast.success('Workflow exported to configuration panel');
  };

  const executeWorkflow = async () => {
    if (!workflowConfig) {
      toast.error('No workflow configuration to execute');
      return;
    }

    if (!customPrompt.trim()) {
      toast.error('Please enter a prompt for image generation');
      return;
    }

    setIsExecuting(true);
    setGenerationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          conceptType: 'environment',
          artStyle: 'painterly',
          userPrompt: customPrompt.trim(),
          projectId: selectedProjectId || undefined,
          workflowConfig: workflowConfig,
        },
      });

      if (error) throw error;

      if (data.success) {
        setGenerationResult({
          imageUrl: data.imageUrl,
          generatedPrompt: data.generatedPrompt,
          seed: data.seed,
          workflowMetadata: data.workflowMetadata,
        });
        toast.success('Image generated successfully!');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Workflow execution failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const exportWorkflow = () => {
    if (!workflowConfig) {
      toast.error('No workflow configuration to export');
      return;
    }
    
    const blob = new Blob([JSON.stringify(workflowConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${workflowConfig.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported');
  };

  const importWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const config = JSON.parse(text) as WorkflowConfig;
        setWorkflowConfig(config);
        toast.success('Workflow imported');
      } catch (error) {
        toast.error('Failed to import workflow');
      }
    };
    input.click();
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-primary" />
              AI Workflows
            </h1>
            <p className="text-muted-foreground mt-1">
              Design and configure ComfyUI workflows for image generation
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ComfyUIPresetSelector
              projectId={selectedProjectId}
              compact
              onPresetSelect={(config) => setWorkflowConfig(config)}
            />
            <Button variant="outline" onClick={importWorkflow}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={exportWorkflow}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Workflow</p>
                  <p className="text-xl font-semibold">{workflowConfig?.name || 'None'}</p>
                </div>
                <Layers className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolution</p>
                  <p className="text-xl font-semibold">
                    {workflowConfig ? `${workflowConfig.width}x${workflowConfig.height}` : '-'}
                  </p>
                </div>
                <Badge variant="secondary">{workflowConfig?.batchSize || 1}x batch</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">LoRAs Active</p>
                  <p className="text-xl font-semibold">
                    {workflowConfig?.loras.filter(l => l.enabled).length || 0}
                  </p>
                </div>
                <Badge variant="outline">
                  {workflowConfig?.controlNets.filter(c => c.enabled).length || 0} ControlNets
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sampling</p>
                  <p className="text-xl font-semibold">
                    {workflowConfig?.steps || 30} steps
                  </p>
                </div>
                <Badge>CFG {workflowConfig?.cfgScale || 7}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="mt-4">
            <WorkflowNodeEditor 
              onExportConfig={handleConfigFromNodeEditor}
            />
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ComfyUIWorkflowPanel
                  projectId={selectedProjectId}
                  initialConfig={workflowConfig || undefined}
                  onConfigChange={setWorkflowConfig}
                />
              </div>
              
              <div className="space-y-4">
                {/* Prompt Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-primary" />
                      Image Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="prompt">Describe what you want to generate</Label>
                      <Textarea
                        id="prompt"
                        placeholder="Enter your image prompt here... e.g., 'A mystical forest at sunset with ancient ruins, dramatic lighting, mist rising from the ground'"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your prompt will be enhanced with workflow settings (sampler, LoRAs, ControlNets) for optimized generation.
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      className="w-full" 
                      disabled={!workflowConfig || isExecuting || !customPrompt.trim()}
                      onClick={executeWorkflow}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Generate with Workflow
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={exportWorkflow}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as JSON
                    </Button>
                  </CardContent>
                </Card>

                {/* Generation Result */}
                {generationResult && generationResult.imageUrl && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Image className="h-5 w-5 text-primary" />
                        Generated Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img 
                          src={generationResult.imageUrl} 
                          alt="Generated concept art"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seed</span>
                          <span className="font-mono">{generationResult.seed}</span>
                        </div>
                        {generationResult.workflowMetadata && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Checkpoint</span>
                              <span className="font-medium">{generationResult.workflowMetadata.checkpoint as string}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Steps</span>
                              <span className="font-medium">{generationResult.workflowMetadata.steps as number}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Workflow Summary */}
                {workflowConfig && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Workflow Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Checkpoint</span>
                        <span className="font-medium">{workflowConfig.checkpoint}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sampler</span>
                        <span className="font-medium">{workflowConfig.sampler}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduler</span>
                        <span className="font-medium">{workflowConfig.scheduler}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAE</span>
                        <span className="font-medium">{workflowConfig.vae}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CLIP Skip</span>
                        <span className="font-medium">{workflowConfig.clipSkip}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Denoise</span>
                        <span className="font-medium">{workflowConfig.denoise.toFixed(2)}</span>
                      </div>
                      {workflowConfig.hiresFixEnabled && (
                        <>
                          <div className="pt-2 border-t">
                            <Badge variant="secondary">Hires Fix Enabled</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hires Steps</span>
                            <span className="font-medium">{workflowConfig.hiresFixSteps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hires Denoise</span>
                            <span className="font-medium">{workflowConfig.hiresFixDenoise.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {workflowConfig.upscaler !== 'none' && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Upscaler</span>
                          <span className="font-medium">{workflowConfig.upscaler} ({workflowConfig.upscaleBy}x)</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
