import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, Bot, Key, TestTube, Edit, Power, Loader2, CheckCircle, XCircle, 
  Info, Trash2, Sparkles, Brain, Image, MessageSquare, Zap, Settings2,
  ExternalLink, Shield, Box, Copy, AlertCircle, ArrowRight, Eye, EyeOff
} from 'lucide-react';

interface AIModelConfig {
  id: string;
  model_id: string;
  display_name: string;
  provider: string;
  model_type: string;
  is_active: boolean;
  cost_tier: string;
  speed_tier: string;
  strengths: string[];
  limitations: string[];
  supported_tasks: string[];
  config: Record<string, any>;
}

const SUPPORTED_PROVIDERS = [
  { id: 'lovable', name: 'Lovable AI (Built-in)', icon: Sparkles },
  { id: 'openai', name: 'OpenAI', icon: Brain },
  { id: 'google', name: 'Google AI', icon: Bot },
  { id: 'anthropic', name: 'Anthropic', icon: MessageSquare },
  { id: 'stability', name: 'Stability AI', icon: Image },
  { id: 'replicate', name: 'Replicate', icon: Zap },
  { id: 'comfyui', name: 'ComfyUI (Local)', icon: Settings2 },
];

// 3D Generation providers - These need API keys for production models
const PROVIDERS_3D = [
  { 
    id: 'tripo', 
    name: 'Tripo AI', 
    envKey: 'TRIPO_API_KEY',
    icon: Box, 
    description: 'Production-ready 3D models with multi-view input, auto-rigging, and up to 500k polygons',
    features: ['Multi-view Input', 'Auto Rigging', 'Animation Presets', 'Quad Topology', '500k+ Polygons'],
    docsUrl: 'https://www.tripo3d.ai/docs',
    getKeyUrl: 'https://www.tripo3d.ai/app/api-keys',
    recommended: true,
  },
  { 
    id: 'meshy', 
    name: 'Meshy AI', 
    envKey: 'MESHY_API_KEY',
    icon: Box, 
    description: 'Unified 3D generation for characters, creatures, props with PBR textures and simulation-ready output',
    features: ['Text-to-3D', 'Image-to-3D', '8K PBR Textures', 'Hair/Cloth Simulation', '250k Polygons'],
    docsUrl: 'https://docs.meshy.ai',
    getKeyUrl: 'https://app.meshy.ai/settings/api',
    recommended: false,
  },
  { 
    id: 'replicate', 
    name: 'Replicate', 
    envKey: 'REPLICATE_API_TOKEN',
    icon: Zap, 
    description: 'Run open-source 3D models like TripoSR, Shap-E, and Zero123++',
    features: ['Open Source Models', 'TripoSR', 'Zero123++', 'Shap-E', 'Custom Models'],
    docsUrl: 'https://replicate.com/docs',
    getKeyUrl: 'https://replicate.com/account/api-tokens',
    recommended: false,
  },
  { 
    id: 'gemini', 
    name: 'Gemini AI', 
    envKey: 'GEMINI_API_KEY',
    icon: Brain, 
    description: 'Multimodal AI for concept art generation, visual analysis, and prompt enhancement',
    features: ['Vision Analysis', 'Multi-modal', 'Long Context', 'Image Generation', 'Script Analysis'],
    docsUrl: 'https://ai.google.dev/docs',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    recommended: false,
  },
];

const MODEL_TYPES = [
  { id: 'text', name: 'Text Generation', icon: MessageSquare },
  { id: 'image', name: 'Image Generation', icon: Image },
  { id: 'vision', name: 'Vision/Multimodal', icon: Brain },
  { id: '3d', name: '3D Generation', icon: Bot },
];

const COST_TIERS = ['free', 'low', 'medium', 'high', 'premium'];
const SPEED_TIERS = ['fast', 'medium', 'slow'];

const LOVABLE_MODELS = [
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', type: 'vision', cost: 'medium', speed: 'medium' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', type: 'vision', cost: 'low', speed: 'fast' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', type: 'text', cost: 'free', speed: 'fast' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', type: 'vision', cost: 'high', speed: 'medium' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', type: 'text', cost: 'low', speed: 'fast' },
  { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', type: 'image', cost: 'high', speed: 'slow' },
  { id: 'openai/gpt-5', name: 'GPT-5', type: 'vision', cost: 'premium', speed: 'medium' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', type: 'vision', cost: 'medium', speed: 'fast' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', type: 'text', cost: 'low', speed: 'fast' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', type: 'vision', cost: 'premium', speed: 'medium' },
];

export function AIToolsConfigSection() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('models');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [testingApiKey, setTestingApiKey] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState<string | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [formData, setFormData] = useState({
    model_id: '',
    display_name: '',
    provider: 'lovable',
    model_type: 'text',
    cost_tier: 'medium',
    speed_tier: 'medium',
    strengths: '',
    limitations: '',
    supported_tasks: '',
  });

  // Check API key status for 3D providers
  const { data: apiKeyStatus, isLoading: isCheckingKeys, refetch: refetchKeyStatus } = useQuery({
    queryKey: ['api-key-status-3d'],
    queryFn: async () => {
      const keys = PROVIDERS_3D.map(p => p.envKey);
      const { data, error } = await supabase.functions.invoke('check-api-keys', {
        body: { keys },
      });
      if (error) throw error;
      return data.configured as Record<string, boolean>;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: models, isLoading } = useQuery({
    queryKey: ['ai-model-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_registry')
        .select('*')
        .order('provider, display_name');
      if (error) throw error;
      return data as AIModelConfig[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('ai_model_registry').insert({
        model_id: data.model_id,
        display_name: data.display_name,
        provider: data.provider,
        model_type: data.model_type,
        cost_tier: data.cost_tier,
        speed_tier: data.speed_tier,
        strengths: data.strengths.split(',').map(s => s.trim()).filter(Boolean),
        limitations: data.limitations.split(',').map(s => s.trim()).filter(Boolean),
        supported_tasks: data.supported_tasks.split(',').map(s => s.trim()).filter(Boolean),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-model-registry'] });
      toast.success('AI model added');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to add model: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('ai_model_registry')
        .update({
          model_id: data.model_id,
          display_name: data.display_name,
          provider: data.provider,
          model_type: data.model_type,
          cost_tier: data.cost_tier,
          speed_tier: data.speed_tier,
          strengths: data.strengths?.split(',').map(s => s.trim()).filter(Boolean),
          limitations: data.limitations?.split(',').map(s => s.trim()).filter(Boolean),
          supported_tasks: data.supported_tasks?.split(',').map(s => s.trim()).filter(Boolean),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-model-registry'] });
      toast.success('AI model updated');
      setIsDialogOpen(false);
      setEditingModel(null);
      resetForm();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_model_registry')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-model-registry'] });
      toast.success('Model status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_model_registry').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-model-registry'] });
      toast.success('AI model removed');
    },
  });

  const testApiKeyMutation = useMutation({
    mutationFn: async (provider: string) => {
      setTestingApiKey(provider);
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: { provider },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.valid) {
        toast.success('API key is valid');
      } else {
        toast.error('API key is invalid or expired');
      }
      setTestingApiKey(null);
    },
    onError: (error) => {
      toast.error('Failed to test API key: ' + error.message);
      setTestingApiKey(null);
    },
  });

  const resetForm = () => {
    setFormData({
      model_id: '',
      display_name: '',
      provider: 'lovable',
      model_type: 'text',
      cost_tier: 'medium',
      speed_tier: 'medium',
      strengths: '',
      limitations: '',
      supported_tasks: '',
    });
  };

  const handleEdit = (model: AIModelConfig) => {
    setEditingModel(model);
    setFormData({
      model_id: model.model_id,
      display_name: model.display_name,
      provider: model.provider,
      model_type: model.model_type,
      cost_tier: model.cost_tier,
      speed_tier: model.speed_tier,
      strengths: model.strengths?.join(', ') || '',
      limitations: model.limitations?.join(', ') || '',
      supported_tasks: model.supported_tasks?.join(', ') || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingModel) {
      updateMutation.mutate({ id: editingModel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const selectLovableModel = (model: typeof LOVABLE_MODELS[0]) => {
    setFormData({
      ...formData,
      model_id: model.id,
      display_name: model.name,
      provider: 'lovable',
      model_type: model.type,
      cost_tier: model.cost,
      speed_tier: model.speed,
    });
  };

  const getProviderIcon = (providerId: string) => {
    const provider = SUPPORTED_PROVIDERS.find(p => p.id === providerId);
    return provider?.icon || Bot;
  };

  const getCostBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'premium': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return '';
    }
  };

  const groupedModels = models?.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModelConfig[]>) || {};

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Models
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Model Registry</CardTitle>
                  <CardDescription>
                    Configure which AI models are available for generation tasks across the platform.
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setEditingModel(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Model
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingModel ? 'Edit AI Model' : 'Add AI Model'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!editingModel && formData.provider === 'lovable' && (
                        <div className="space-y-2">
                          <Label>Quick Select (Lovable AI - No API Key Required)</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                            {LOVABLE_MODELS.map(model => (
                              <Button
                                key={model.id}
                                variant="outline"
                                size="sm"
                                className="justify-start text-xs h-auto py-2"
                                onClick={() => selectLovableModel(model)}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{model.name}</span>
                                  <span className="text-muted-foreground">{model.type}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Provider</Label>
                          <Select
                            value={formData.provider}
                            onValueChange={(value) => setFormData({ ...formData, provider: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_PROVIDERS.map(provider => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  <div className="flex items-center gap-2">
                                    <provider.icon className="h-4 w-4" />
                                    {provider.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Model Type</Label>
                          <Select
                            value={formData.model_type}
                            onValueChange={(value) => setFormData({ ...formData, model_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MODEL_TYPES.map(type => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="h-4 w-4" />
                                    {type.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Model ID</Label>
                        <Input
                          value={formData.model_id}
                          onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                          placeholder="e.g., openai/gpt-5 or stability/sdxl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={formData.display_name}
                          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                          placeholder="e.g., GPT-5"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cost Tier</Label>
                          <Select
                            value={formData.cost_tier}
                            onValueChange={(value) => setFormData({ ...formData, cost_tier: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COST_TIERS.map(tier => (
                                <SelectItem key={tier} value={tier}>
                                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Speed Tier</Label>
                          <Select
                            value={formData.speed_tier}
                            onValueChange={(value) => setFormData({ ...formData, speed_tier: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SPEED_TIERS.map(tier => (
                                <SelectItem key={tier} value={tier}>
                                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Strengths (comma-separated)</Label>
                        <Textarea
                          value={formData.strengths}
                          onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                          placeholder="e.g., complex reasoning, multimodal, long context"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Limitations (comma-separated)</Label>
                        <Textarea
                          value={formData.limitations}
                          onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                          placeholder="e.g., slower response, higher cost"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Supported Tasks (comma-separated)</Label>
                        <Textarea
                          value={formData.supported_tasks}
                          onChange={(e) => setFormData({ ...formData, supported_tasks: e.target.value })}
                          placeholder="e.g., concept_art, storyboard, script_analysis"
                          rows={2}
                        />
                      </div>

                      <Button
                        onClick={handleSubmit}
                        className="w-full"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {(createMutation.isPending || updateMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingModel ? 'Update Model' : 'Add Model'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : Object.keys(groupedModels).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No AI models configured yet.</p>
                  <p className="text-sm">Add your first model to enable AI generation features.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedModels).map(([provider, providerModels]) => {
                    const ProviderIcon = getProviderIcon(provider);
                    const providerName = SUPPORTED_PROVIDERS.find(p => p.id === provider)?.name || provider;
                    
                    return (
                      <div key={provider}>
                        <div className="flex items-center gap-2 mb-3">
                          <ProviderIcon className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{providerName}</h3>
                          <Badge variant="outline">{providerModels.length}</Badge>
                        </div>
                        <div className="grid gap-3">
                          {providerModels.map(model => (
                            <Card key={model.id} className="bg-muted/30">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      {model.model_type === 'image' ? (
                                        <Image className="h-5 w-5" />
                                      ) : model.model_type === 'vision' ? (
                                        <Brain className="h-5 w-5" />
                                      ) : (
                                        <MessageSquare className="h-5 w-5" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium">{model.display_name}</h4>
                                        <Badge variant={model.is_active ? 'default' : 'secondary'}>
                                          {model.is_active ? 'Active' : 'Disabled'}
                                        </Badge>
                                        <Badge variant="outline" className={getCostBadgeColor(model.cost_tier)}>
                                          {model.cost_tier}
                                        </Badge>
                                        <Badge variant="outline">
                                          {model.speed_tier}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground font-mono truncate">
                                        {model.model_id}
                                      </p>
                                      {model.supported_tasks && model.supported_tasks.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {model.supported_tasks.slice(0, 3).map(task => (
                                            <Badge key={task} variant="secondary" className="text-xs">
                                              {task}
                                            </Badge>
                                          ))}
                                          {model.supported_tasks.length > 3 && (
                                            <Badge variant="secondary" className="text-xs">
                                              +{model.supported_tasks.length - 3}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant={model.is_active ? 'destructive' : 'default'}
                                      size="sm"
                                      onClick={() => toggleActiveMutation.mutate({ id: model.id, is_active: !model.is_active })}
                                    >
                                      <Power className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('Remove this AI model?')) {
                                          deleteMutation.mutate(model.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          {/* Setup Instructions */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                API Key Configuration Guide
              </CardTitle>
              <CardDescription>
                Follow these steps to configure API keys for 3D model generation and AI features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <h4 className="font-medium mb-1">Get API Key</h4>
                  <p className="text-xs text-muted-foreground">
                    Click "Get Key" to visit the provider's dashboard
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <h4 className="font-medium mb-1">Copy Key</h4>
                  <p className="text-xs text-muted-foreground">
                    Create and copy your API key from the provider
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <h4 className="font-medium mb-1">Add Secret</h4>
                  <p className="text-xs text-muted-foreground">
                    Click "Configure" and paste your key
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <h4 className="font-medium mb-1">Verify</h4>
                  <p className="text-xs text-muted-foreground">
                    Click "Test" to verify your key works
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3D Generation Providers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    3D Model Generation APIs
                  </CardTitle>
                  <CardDescription>
                    Configure API keys for production-ready 3D model generation. These keys work across all user roles.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchKeyStatus()}
                  disabled={isCheckingKeys}
                >
                  {isCheckingKeys ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh Status</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {PROVIDERS_3D.map(provider => {
                const isConfigured = apiKeyStatus?.[provider.envKey] ?? false;
                const isExpanded = showApiKeyInput === provider.id;
                const ProviderIcon = provider.icon;
                
                return (
                  <Card 
                    key={provider.id} 
                    className={`transition-all ${
                      provider.recommended 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'bg-muted/30'
                    } ${isConfigured ? 'ring-1 ring-green-500/30' : ''}`}
                  >
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${
                              provider.recommended ? 'bg-emerald-500/20' : 'bg-primary/10'
                            }`}>
                              <ProviderIcon className={`h-5 w-5 ${
                                provider.recommended ? 'text-emerald-500' : ''
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold">{provider.name}</h4>
                                {provider.recommended && (
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                    Recommended for Production
                                  </Badge>
                                )}
                                {isConfigured ? (
                                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Configured
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Not Configured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {provider.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {provider.features.map(feature => (
                                  <Badge key={feature} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Get Key
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                                <Info className="h-4 w-4 mr-1" />
                                Docs
                              </a>
                            </Button>
                            <Button
                              variant={isExpanded ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() => {
                                setShowApiKeyInput(isExpanded ? null : provider.id);
                                setApiKeyValue('');
                                setShowApiKey(false);
                              }}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Configure
                            </Button>
                          </div>
                        </div>
                        
                        {/* Configuration Panel */}
                        {isExpanded && (
                          <div className="border-t pt-4 mt-4 space-y-4">
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Environment Variable:</strong>{' '}
                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                  {provider.envKey}
                                </code>
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  This key will be available to all edge functions and work across all user roles (Admin, Art Director, etc.)
                                </span>
                              </AlertDescription>
                            </Alert>
                            
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  API Key
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                  >
                                    {showApiKey ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showApiKey ? 'text' : 'password'}
                                    placeholder={`Enter your ${provider.name} API key...`}
                                    value={apiKeyValue}
                                    onChange={(e) => setApiKeyValue(e.target.value)}
                                    className="font-mono"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      navigator.clipboard.readText().then(text => {
                                        setApiKeyValue(text);
                                        toast.success('Pasted from clipboard');
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  onClick={async () => {
                                    if (!apiKeyValue.trim()) {
                                      toast.error('Please enter an API key');
                                      return;
                                    }
                                    
                                    try {
                                      const { error } = await supabase.functions.invoke('save-api-key', {
                                        body: { keyName: provider.envKey, keyValue: apiKeyValue },
                                      });
                                      
                                      if (error) throw error;
                                      
                                      toast.info(
                                        'To save this API key, go to Lovable Settings → Secrets and add it there.',
                                        { duration: 8000 }
                                      );
                                      setShowApiKeyInput(null);
                                      setApiKeyValue('');
                                    } catch (err) {
                                      toast.error('Failed to save API key: ' + (err as Error).message);
                                    }
                                  }}
                                  className="flex-1"
                                  disabled={!apiKeyValue.trim()}
                                >
                                  <Key className="h-4 w-4 mr-2" />
                                  Save API Key
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => testApiKeyMutation.mutate(provider.id)}
                                  disabled={testingApiKey === provider.id}
                                >
                                  {testingApiKey === provider.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <TestTube className="h-4 w-4" />
                                  )}
                                  <span className="ml-2">Test Key</span>
                                </Button>
                              </div>
                              
                              <p className="text-xs text-muted-foreground">
                                Note: After saving, refresh the page and click "Test Key" to verify the configuration.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
          
          {/* Other Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Other AI Providers
              </CardTitle>
              <CardDescription>
                Additional AI providers for text, image, and multimodal generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Lovable AI models</strong> do not require API keys. They are available out of the box for concept art and script analysis.
                </AlertDescription>
              </Alert>

              <div className="grid gap-3">
                {SUPPORTED_PROVIDERS.filter(p => p.id !== 'lovable' && p.id !== 'comfyui').map(provider => (
                  <Card key={provider.id} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <provider.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium">{provider.name}</h4>
                            <p className="text-sm text-muted-foreground font-mono">
                              {provider.id.toUpperCase()}_API_KEY
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Optional</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Settings2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">ComfyUI (Local)</h4>
                        <p className="text-sm text-muted-foreground">
                          Connect to a local ComfyUI instance via ngrok
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/comfyui-studio">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Configure
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Default Model Assignments</CardTitle>
              <CardDescription>
                Configure which models are used by default for each generation task.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {[
                  { task: 'Concept Art Generation', key: 'concept_art' },
                  { task: 'Storyboard Generation', key: 'storyboard' },
                  { task: 'Script Analysis', key: 'script_analysis' },
                  { task: 'Scene Description', key: 'scene_description' },
                  { task: '3D Model Generation', key: '3d_generation' },
                  { task: 'Motion Extraction', key: 'motion_extraction' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <h4 className="font-medium">{item.task}</h4>
                      <p className="text-sm text-muted-foreground">Task key: {item.key}</p>
                    </div>
                    <Select defaultValue="auto">
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Auto (Best Available)
                          </div>
                        </SelectItem>
                        {models?.filter(m => m.is_active).map(model => (
                          <SelectItem key={model.id} value={model.model_id}>
                            {model.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <Button className="w-full">
                Save Default Assignments
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
