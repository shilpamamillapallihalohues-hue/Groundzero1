import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIModelRegistry } from '@/components/ai/AIModelRegistry';
import { ProjectAISettingsPanel } from '@/components/ai/ProjectAISettingsPanel';
import { AIOutputTracker } from '@/components/ai/AIOutputTracker';
import { StyleTransferPanel } from '@/components/ai-features/StyleTransferPanel';
import { ContinuityValidator } from '@/components/ai-features/ContinuityValidator';
import { VoiceToStoryboard } from '@/components/ai-features/VoiceToStoryboard';
import { useAIOrchestration } from '@/hooks/useAIOrchestration';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Settings2, History, Layers, Palette, Shield, Mic, Image, Server, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Project { id: string; title: string; }

type ImageProvider = 'lovable' | 'gemini' | 'comfyui';

export default function AISettings() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [imageGenProvider, setImageGenProvider] = useState<ImageProvider>('lovable');
  const [isUpdatingProvider, setIsUpdatingProvider] = useState(false);
  const [comfyuiConnected, setComfyuiConnected] = useState(false);
  
  const { 
    models, 
    taskDefinitions, 
    projectSettings, 
    isLoading,
    updateProjectSettings 
  } = useAIOrchestration(selectedProjectId);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, title');
      if (data) {
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      }
    };
    fetchProjects();

    // Check ComfyUI connection
    const serverUrl = localStorage.getItem('comfyui_server_url');
    if (serverUrl) {
      checkComfyUIConnection(serverUrl);
    }
  }, []);

  const checkComfyUIConnection = async (url: string) => {
    try {
      const { data } = await supabase.functions.invoke('comfyui-image-generate', {
        body: { action: 'test_connection', serverUrl: url }
      });
      setComfyuiConnected(data?.connected || data?.success || false);
    } catch {
      setComfyuiConnected(false);
    }
  };

  // Fetch current provider setting when project changes
  useEffect(() => {
    const fetchProviderSetting = async () => {
      if (!selectedProjectId) return;
      
      const { data } = await supabase
        .from('project_ai_settings')
        .select('image_generation_provider')
        .eq('project_id', selectedProjectId)
        .single();
      
      if (data?.image_generation_provider) {
        setImageGenProvider(data.image_generation_provider as ImageProvider);
      } else {
        setImageGenProvider('lovable');
      }
    };
    fetchProviderSetting();
  }, [selectedProjectId]);

  const handleProviderChange = async (provider: ImageProvider) => {
    if (!selectedProjectId) return;
    
    if (provider === 'comfyui' && !comfyuiConnected) {
      toast.error('ComfyUI server is not connected. Please configure it in External Tools first.');
      return;
    }
    
    setIsUpdatingProvider(true);
    
    try {
      const { error } = await supabase
        .from('project_ai_settings')
        .upsert({
          project_id: selectedProjectId,
          image_generation_provider: provider,
          updated_at: new Date().toISOString()
        }, { onConflict: 'project_id' });
      
      if (error) throw error;
      
      setImageGenProvider(provider);
      const providerNames = { lovable: 'Scenecraft AI', gemini: 'Gemini AI', comfyui: 'ComfyUI Local' };
      toast.success(`Switched to ${providerNames[provider]} for image generation`);
    } catch (error) {
      console.error('Failed to update provider:', error);
      toast.error('Failed to update AI provider setting');
    } finally {
      setIsUpdatingProvider(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Orchestration Engine
            </h1>
            <p className="text-muted-foreground">
              Configure AI models, auto-routing, and traceability settings
            </p>
          </div>
          
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="provider" className="space-y-4">
          <TabsList>
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Image Provider
            </TabsTrigger>
            <TabsTrigger value="registry" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Model Registry
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Project Settings
            </TabsTrigger>
            <TabsTrigger value="outputs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Output History
            </TabsTrigger>
            <TabsTrigger value="style" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Style Transfer
            </TabsTrigger>
            <TabsTrigger value="continuity" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Continuity
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice to Storyboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="provider">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Image Generation Provider
                </CardTitle>
                <CardDescription>
                  Choose which AI provider to use for all image generation in this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup 
                  value={imageGenProvider} 
                  onValueChange={(v) => handleProviderChange(v as ImageProvider)}
                  className="space-y-4"
                  disabled={isUpdatingProvider || !selectedProjectId}
                >
                  {/* Scenecraft AI */}
                  <div className={`flex items-start space-x-4 p-4 border rounded-lg transition-colors ${imageGenProvider === 'lovable' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <RadioGroupItem value="lovable" id="lovable" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="lovable" className="text-base font-medium cursor-pointer flex items-center gap-2">
                        Scenecraft AI
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pre-configured AI service, no API key needed. Uses Gemini Flash Image Preview with integrated billing.
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                        <li>• No setup required</li>
                        <li>• Integrated billing with Scenecraft</li>
                        <li>• Best for quick prototyping</li>
                      </ul>
                    </div>
                  </div>

                  {/* Gemini AI */}
                  <div className={`flex items-start space-x-4 p-4 border rounded-lg transition-colors ${imageGenProvider === 'gemini' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <RadioGroupItem value="gemini" id="gemini" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="gemini" className="text-base font-medium cursor-pointer">
                        Gemini AI
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Direct Google API access using your own API key. Separate billing via Google Cloud.
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                        <li>• Requires API key configuration</li>
                        <li>• Direct Google API access</li>
                        <li>• Your own usage limits</li>
                      </ul>
                    </div>
                  </div>

                  {/* ComfyUI Local */}
                  <div className={`flex items-start space-x-4 p-4 border rounded-lg transition-colors ${imageGenProvider === 'comfyui' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <RadioGroupItem value="comfyui" id="comfyui" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="comfyui" className="text-base font-medium cursor-pointer flex items-center gap-2">
                        ComfyUI Local
                        <Server className="h-4 w-4" />
                        {comfyuiConnected ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">Connected</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Not Connected</Badge>
                        )}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Run AI locally using your own GPU. Free unlimited usage with no API costs.
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                        <li>• Requires local ComfyUI setup</li>
                        <li>• Free unlimited generation</li>
                        <li>• Full control over models</li>
                        <li>• Supports SDXL, ControlNet, LoRA</li>
                      </ul>
                      {!comfyuiConnected && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 gap-2"
                          onClick={() => navigate('/external-tools')}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Configure ComfyUI
                        </Button>
                      )}
                    </div>
                  </div>
                </RadioGroup>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> The selected provider will be used for all image generation in this project, including concept art, storyboards, and character generation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registry">
            <AIModelRegistry models={models} taskDefinitions={taskDefinitions} />
          </TabsContent>

          <TabsContent value="settings">
            {selectedProjectId ? (
              <ProjectAISettingsPanel
                projectId={selectedProjectId}
                settings={projectSettings}
                models={models}
                onSave={updateProjectSettings}
              />
            ) : (
              <p className="text-muted-foreground">Select a project to configure AI settings</p>
            )}
          </TabsContent>

          <TabsContent value="outputs">
            <AIOutputTracker projectId={selectedProjectId} />
          </TabsContent>

          <TabsContent value="style">
            {selectedProjectId ? (
              <StyleTransferPanel projectId={selectedProjectId} />
            ) : (
              <p className="text-muted-foreground">Select a project to use style transfer</p>
            )}
          </TabsContent>

          <TabsContent value="continuity">
            {selectedProjectId ? (
              <ContinuityValidator projectId={selectedProjectId} />
            ) : (
              <p className="text-muted-foreground">Select a project to validate continuity</p>
            )}
          </TabsContent>

          <TabsContent value="voice">
            {selectedProjectId ? (
              <VoiceToStoryboard projectId={selectedProjectId} />
            ) : (
              <p className="text-muted-foreground">Select a project to use voice-to-storyboard</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
