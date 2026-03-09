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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Box, Upload, Wand2, Download, Check, AlertTriangle, 
  Eye, Loader2, Image, FileBox, RefreshCw, X, Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';
const ModelViewer3D = lazy(() => import('@/components/ui/model-viewer-3d').then(mod => ({ default: mod.ModelViewer3D })));

interface ProxyModelGeneratorProps {
  projectId: string;
}

interface CharacterProxy {
  id: string;
  name: string;
  front_view_url: string | null;
  side_view_url: string | null;
  three_quarter_view_url: string | null;
}

interface ConceptArt {
  id: string;
  title: string;
  image_url: string | null;
  concept_type: string;
}

interface ProxyModel {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pose_type: string | null;
  poly_count: number | null;
  thumbnail_url: string | null;
  model_file_urls: Record<string, string>;
  known_limitations: string[] | null;
  created_at: string;
  character_proxy_id: string | null;
}

export function ProxyModelGenerator({ projectId }: ProxyModelGeneratorProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const [characterProxies, setCharacterProxies] = useState<CharacterProxy[]>([]);
  const [conceptArts, setConceptArts] = useState<ConceptArt[]>([]);
  const [proxyModels, setProxyModels] = useState<ProxyModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingModel, setViewingModel] = useState<ProxyModel | null>(null);
  
  // Generation form state
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [modelName, setModelName] = useState('');
  const [poseType, setPoseType] = useState('a_pose');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  
  // 3D Provider selection - Check both localStorage keys for backward compatibility
  const [provider, setProvider] = useState<'tencent' | 'scenecraft' | 'meshy' | 'tripo'>(() => {
    // Check both old and new key names for compatibility
    const saved = localStorage.getItem('preferred_3d_provider') || localStorage.getItem('preferred3DProvider');
    const validProviders = ['tencent', 'scenecraft', 'meshy', 'tripo'];
    return validProviders.includes(saved || '') ? (saved as 'tencent' | 'scenecraft' | 'meshy' | 'tripo') : 'meshy';
  });
  
  // Meshy AI settings
  const [meshyModel, setMeshyModel] = useState<'meshy-4' | 'meshy-5'>('meshy-4');
  const [topology, setTopology] = useState<'quad' | 'triangle'>('quad');
  const [targetPolycount, setTargetPolycount] = useState(30000);
  const [enablePbr, setEnablePbr] = useState(false);
  
  // Tencent 3D settings
  const [outputFormat, setOutputFormat] = useState<'glb' | 'obj'>('glb');
  
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [charsRes, conceptsRes, modelsRes] = await Promise.all([
        supabase
          .from('character_proxies')
          .select('id, name, front_view_url, side_view_url, three_quarter_view_url')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('concept_arts')
          .select('id, title, image_url, concept_type')
          .eq('project_id', projectId)
          .in('concept_type', ['character', 'creature'])
          .eq('is_approved', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('proxy_models')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
      ]);

      if (charsRes.error) throw charsRes.error;
      if (conceptsRes.error) throw conceptsRes.error;
      if (modelsRes.error) throw modelsRes.error;

      setCharacterProxies(charsRes.data || []);
      setConceptArts(conceptsRes.data || []);
      setProxyModels((modelsRes.data || []).map(m => ({
        ...m,
        model_file_urls: m.model_file_urls as Record<string, string> || {}
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert image to PNG format for Meshy API compatibility
  const convertToPng = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          }, 'image/png', 1.0);
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: { url: string; name: string }[] = [];

    // Supported formats for Meshy API - ONLY these work
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        let uploadFile: File | Blob = file;
        let fileExt: string;
        let contentType: string;
        
        // Always check and convert unsupported formats (AVIF, BMP, TIFF, HEIC, etc.) to PNG
        if (!supportedFormats.includes(file.type)) {
          toast.info(`Converting ${file.name} to PNG for 3D generation...`);
          try {
            uploadFile = await convertToPng(file);
            fileExt = 'png';
            contentType = 'image/png';
            console.log(`Converted ${file.name} from ${file.type} to PNG`);
          } catch (convError) {
            console.error('Conversion error:', convError);
            toast.error(`Failed to convert ${file.name}. Please use JPG, PNG, or WebP.`);
            continue;
          }
        } else {
          // Use original format - it's already supported
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (file.type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
            fileExt = 'jpg';
            contentType = 'image/jpeg';
          } else if (file.type === 'image/png') {
            fileExt = 'png';
            contentType = 'image/png';
          } else {
            fileExt = 'webp';
            contentType = 'image/webp';
          }
        }

        // Generate unique filename with CORRECT extension
        const fileName = `3d-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log(`Uploading ${file.name} as ${fileName} with type ${contentType}`);

        const { error: uploadError } = await supabase.storage
          .from('proxy-assets')
          .upload(fileName, uploadFile, {
            contentType: contentType,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('proxy-assets')
          .getPublicUrl(fileName);

        newImages.push({ url: publicUrl, name: file.name });
      }

      if (newImages.length > 0) {
        setUploadedImages(prev => [...prev, ...newImages]);
        toast.success(`Uploaded ${newImages.length} image(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Poll for task status (works for Scenecraft, Meshy, Tripo)
  const pollTaskStatus = async (taskId: string, modelId: string, providerName: 'scenecraft' | 'meshy' | 'tripo') => {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;
    const functionName = providerName === 'tripo' ? 'tripo-3d-generate' : 'meshy-3d-generate';

    const poll = async (): Promise<boolean> => {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Generation timed out');
      }

      const requestBody = { action: 'get_task_status', taskId };

      const { data: statusResult, error: statusError } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (statusError) throw statusError;

      const progress = statusResult.progress || Math.min(attempts * 5, 90);
      setGenerationProgress(progress);
      setGenerationStatus(statusResult.status);

      if (statusResult.status === 'completed') {
        // Update proxy model with results
        await supabase
          .from('proxy_models')
          .update({
            status: 'ready',
            thumbnail_url: statusResult.thumbnailUrl,
            model_file_urls: statusResult.modelUrls || {},
            poly_count: targetPolycount,
          })
          .eq('id', modelId);

        return true;
      } else if (statusResult.status === 'failed') {
        throw new Error(statusResult.taskError || `${providerName} generation failed`);
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      return poll();
    };

    return poll();
  };

  // Poll for Tencent 3D task status
  const pollTencent3DStatus = async (taskId: string, modelId: string) => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async (): Promise<boolean> => {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Generation timed out');
      }

      const { data: statusResult, error: statusError } = await supabase.functions.invoke('tencent-3d-generate', {
        body: { 
          action: 'get_status', 
          taskId 
        }
      });

      if (statusError) throw statusError;

      const progress = statusResult.progress || Math.min(attempts * 2, 90);
      setGenerationProgress(progress);
      setGenerationStatus(statusResult.message || statusResult.status);

      if (statusResult.status === 'completed') {
        // Update proxy model with results
        await supabase
          .from('proxy_models')
          .update({
            status: 'ready',
            thumbnail_url: statusResult.thumbnailUrl || null,
            model_file_urls: statusResult.modelUrls || { glb: statusResult.glbUrl },
          })
          .eq('id', modelId);

        return true;
      } else if (statusResult.status === 'failed') {
        throw new Error(statusResult.error || 'Tencent 3D generation failed');
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      return poll();
    };

    return poll();
  };

  const handleGenerate = async () => {
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }

    if (!selectedCharacter && selectedConcepts.length === 0 && uploadedImages.length === 0) {
      toast.error('Please select a character, concept art, or upload images');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStatus('Preparing...');

    try {
      // Get source image URLs
      const sourceImageUrls: string[] = uploadedImages.map(img => img.url);
      
      if (selectedCharacter) {
        const char = characterProxies.find(c => c.id === selectedCharacter);
        if (char?.front_view_url) sourceImageUrls.push(char.front_view_url);
        if (char?.side_view_url) sourceImageUrls.push(char.side_view_url);
        if (char?.three_quarter_view_url) sourceImageUrls.push(char.three_quarter_view_url);
      }

      selectedConcepts.forEach(conceptId => {
        const concept = conceptArts.find(c => c.id === conceptId);
        if (concept?.image_url) sourceImageUrls.push(concept.image_url);
      });

      if (sourceImageUrls.length === 0) {
        throw new Error('No source images available for 3D generation');
      }

      const providerLabel = provider === 'tencent' ? 'Tencent Hunyuan-3D' :
                           provider === 'scenecraft' ? 'Scenecraft' : 
                           provider === 'meshy' ? 'Meshy' : 'Tripo';
      setGenerationProgress(10);
      setGenerationStatus(`Submitting to ${providerLabel}...`);

      // Use the first image for generation (best to use front view or main concept)
      const primaryImageUrl = sourceImageUrls[0];

      let taskId: string;
      let aiModelUsed: string;

      if (provider === 'tencent') {
        // Use Tencent Cloud Hunyuan-3D
        const { data: tencentResult, error: tencentError } = await supabase.functions.invoke('tencent-3d-generate', {
          body: {
            action: 'generate_3d',
            imageUrl: primaryImageUrl,
            modelName: modelName.replace(/\s+/g, '_'),
            outputFormat,
          }
        });

        if (tencentError) throw tencentError;
        if (!tencentResult.success) throw new Error(tencentResult.error);

        taskId = tencentResult.taskId;
        aiModelUsed = 'tencent/hunyuan-3d';

        setGenerationProgress(15);
        setGenerationStatus('3D generation started with Tencent Hunyuan-3D...');

        // Create proxy model record
        const { data: insertedModel, error: insertError } = await supabase
          .from('proxy_models')
          .insert({
            project_id: projectId,
            character_proxy_id: selectedCharacter || null,
            name: modelName,
            description: additionalNotes || null,
            status: 'generating',
            pose_type: poseType,
            source_concept_ids: selectedConcepts,
            source_image_urls: sourceImageUrls,
            ai_model_used: aiModelUsed,
            generation_params: {
              task_id: taskId,
              provider: 'tencent',
              pose_type: poseType,
              output_format: outputFormat,
              notes: additionalNotes,
            },
            known_limitations: [
              'AI-generated 3D model via Tencent Hunyuan-3D',
              'May require topology cleanup for animation',
              'Textures are AI-generated approximations',
              'Cloud-based generation'
            ]
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Poll for Tencent completion
        setGenerationStatus('Processing 3D model with Tencent Hunyuan-3D...');
        await pollTencent3DStatus(taskId, insertedModel.id);

      } else if (provider === 'scenecraft') {
        // Scenecraft uses Meshy AI backend
        const { data: meshyResult, error: meshyError } = await supabase.functions.invoke('meshy-3d-generate', {
          body: {
            action: 'create_image_to_3d',
            imageUrl: primaryImageUrl,
            aiModel: meshyModel,
            topology,
            targetPolycount,
          }
        });

        if (meshyError) throw meshyError;
        if (!meshyResult.success) throw new Error(meshyResult.error);

        taskId = meshyResult.taskId;
        aiModelUsed = 'scenecraft/meshy-ai';

        setGenerationProgress(15);
        setGenerationStatus('3D generation started with Scenecraft AI...');

        // Create proxy model record
        const { data: insertedModel, error: insertError } = await supabase
          .from('proxy_models')
          .insert({
            project_id: projectId,
            character_proxy_id: selectedCharacter || null,
            name: modelName,
            description: additionalNotes || null,
            status: 'generating',
            pose_type: poseType,
            source_concept_ids: selectedConcepts,
            source_image_urls: sourceImageUrls,
            ai_model_used: aiModelUsed,
            generation_params: {
              task_id: taskId,
              provider: 'scenecraft',
              pose_type: poseType,
              ai_model: meshyModel,
              topology,
              target_polycount: targetPolycount,
              notes: additionalNotes,
            },
            known_limitations: [
              'AI-generated 3D model via Scenecraft AI (Meshy)',
              'May require topology cleanup for animation',
              'Textures are AI-generated approximations',
              'Cloud-based generation'
            ]
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Poll for Meshy completion (Scenecraft uses Meshy backend)
        setGenerationStatus('Processing 3D model with Scenecraft AI...');
        await pollTaskStatus(taskId, insertedModel.id, 'meshy');

      } else if (provider === 'meshy') {
        // Call Meshy AI edge function
        const { data: meshyResult, error: meshyError } = await supabase.functions.invoke('meshy-3d-generate', {
          body: {
            action: 'create_image_to_3d',
            imageUrl: primaryImageUrl,
            aiModel: meshyModel,
            topology,
            targetPolycount,
            symmetryMode: 'auto',
            shouldRemesh: true,
            shouldTexture: true,
            enablePbr,
            texturePrompt: additionalNotes || undefined,
          }
        });

        if (meshyError) throw meshyError;
        if (!meshyResult.success) throw new Error(meshyResult.error);

        taskId = meshyResult.taskId;
        aiModelUsed = `meshy/${meshyModel}`;

        setGenerationProgress(15);
        setGenerationStatus('3D generation started with Meshy AI...');

        // Create proxy model record
        const { data: insertedModel, error: insertError } = await supabase
          .from('proxy_models')
          .insert({
            project_id: projectId,
            character_proxy_id: selectedCharacter || null,
            name: modelName,
            description: additionalNotes || null,
            status: 'generating',
            pose_type: poseType,
            source_concept_ids: selectedConcepts,
            source_image_urls: sourceImageUrls,
            ai_model_used: aiModelUsed,
            generation_params: {
              task_id: taskId,
              provider: 'meshy',
              pose_type: poseType,
              topology: topology,
              target_polycount: targetPolycount,
              enable_pbr: enablePbr,
              notes: additionalNotes,
            },
            known_limitations: [
              'AI-generated 3D model via Meshy AI',
              'May require topology cleanup for animation',
              'Textures are AI-generated approximations'
            ]
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Poll for completion
        setGenerationStatus('Processing 3D model with Meshy AI...');
        await pollTaskStatus(taskId, insertedModel.id, 'meshy');
      } else {
        // Call Tripo AI edge function
        const { data: tripoResult, error: tripoError } = await supabase.functions.invoke('tripo-3d-generate', {
          body: {
            action: 'create_image_to_3d',
            imageUrl: primaryImageUrl,
            faceLimit: targetPolycount,
            texture: true,
            pbr: enablePbr,
          }
        });

        if (tripoError) throw tripoError;
        if (!tripoResult.success) throw new Error(tripoResult.error);

        taskId = tripoResult.taskId;
        aiModelUsed = 'tripo/v2.0';

        setGenerationProgress(15);
        setGenerationStatus('3D generation started...');

        // Create proxy model record
        const { data: insertedModel, error: insertError } = await supabase
          .from('proxy_models')
          .insert({
            project_id: projectId,
            character_proxy_id: selectedCharacter || null,
            name: modelName,
            description: additionalNotes || null,
            status: 'generating',
            pose_type: poseType,
            source_concept_ids: selectedConcepts,
            source_image_urls: sourceImageUrls,
            ai_model_used: aiModelUsed,
            generation_params: {
              task_id: taskId,
              provider: 'tripo',
              pose_type: poseType,
              target_polycount: targetPolycount,
              enable_pbr: enablePbr,
              notes: additionalNotes,
            },
            known_limitations: [
              'AI-generated 3D model via Tripo AI',
              'May require topology cleanup for animation',
              'Textures are AI-generated approximations'
            ]
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Poll for completion
        setGenerationStatus('Processing 3D model...');
        await pollTaskStatus(taskId, insertedModel.id, 'tripo');
      }

      setGenerationProgress(100);
      setGenerationStatus('Complete!');
      toast.success(`3D model generated successfully with ${providerLabel}!`);
      
      // Reset form
      setModelName('');
      setSelectedCharacter('');
      setSelectedConcepts([]);
      setUploadedImages([]);
      setAdditionalNotes('');
      
      // Refresh list
      fetchData();
      setActiveTab('library');
    } catch (error) {
      console.error('Error generating proxy model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate proxy model');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const toggleConceptSelection = (conceptId: string) => {
    setSelectedConcepts(prev => 
      prev.includes(conceptId)
        ? prev.filter(id => id !== conceptId)
        : [...prev, conceptId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'generating':
        return <Badge className="bg-blue-500/20 text-blue-400">Generating</Badge>;
      case 'ready':
        return <Badge className="bg-green-500/20 text-green-400">Ready</Badge>;
      case 'approved':
        return <Badge className="bg-purple-500/20 text-purple-400">Approved</Badge>;
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
            <Box className="h-6 w-6 text-primary" />
            3D Proxy Model Generator
          </h2>
          <p className="text-muted-foreground">
            Generate blocking-level 3D models from concept art and character references
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Generate New
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <FileBox className="h-4 w-4" />
            Model Library ({proxyModels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Selection */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Source References
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Character Proxy Selection */}
                <div className="space-y-2">
                  <Label>Character Proxy (Optional)</Label>
                  <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a character" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {characterProxies.map(char => (
                        <SelectItem key={char.id} value={char.id}>
                          <div className="flex items-center gap-2">
                            {char.front_view_url && (
                              <img 
                                src={char.front_view_url} 
                                alt={char.name}
                                className="w-6 h-6 rounded object-cover"
                              />
                            )}
                            <span>{char.name}</span>
                            {(char.front_view_url || char.side_view_url || char.three_quarter_view_url) && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                ({[char.front_view_url, char.side_view_url, char.three_quarter_view_url].filter(Boolean).length} views)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Show selected character preview */}
                  {selectedCharacter && selectedCharacter !== 'none' && (() => {
                    const char = characterProxies.find(c => c.id === selectedCharacter);
                    if (!char) return null;
                    const views = [
                      { url: char.front_view_url, label: 'Front' },
                      { url: char.three_quarter_view_url, label: '3/4' },
                      { url: char.side_view_url, label: 'Side' }
                    ].filter(v => v.url);
                    
                    if (views.length === 0) return (
                      <p className="text-sm text-muted-foreground">No generated views available for this character</p>
                    );
                    
                    return (
                      <div className="mt-2 p-2 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">Generated character views:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {views.map((view, idx) => (
                            <div key={idx} className="relative">
                              <img 
                                src={view.url!} 
                                alt={`${char.name} ${view.label}`}
                                className="w-full aspect-square object-cover rounded-lg border"
                              />
                              <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 rounded">
                                {view.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Concept Art Selection */}
                <div className="space-y-2">
                  <Label>Approved Concept Art</Label>
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    {conceptArts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No approved character/creature concept art available
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {conceptArts.map(concept => (
                          <div
                            key={concept.id}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              selectedConcepts.includes(concept.id)
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-transparent hover:border-muted-foreground/30'
                            }`}
                            onClick={() => toggleConceptSelection(concept.id)}
                          >
                            {concept.image_url ? (
                              <img
                                src={concept.image_url}
                                alt={concept.title}
                                className="w-full aspect-square object-cover"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-muted flex items-center justify-center">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            {selectedConcepts.includes(concept.id) && (
                              <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                              <p className="text-xs text-white truncate">{concept.title}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Upload Images */}
                <div className="space-y-2">
                  <Label>Upload Additional Images</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleImageUpload(e.dataTransfer.files);
                    }}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Drop orthographic views here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Front, side, back views recommended
                        </p>
                      </>
                    )}
                  </div>
                  
                  {/* Uploaded Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full aspect-square object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removeUploadedImage(index)}
                            className="absolute top-1 right-1 bg-destructive rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-destructive-foreground" />
                          </button>
                          <p className="text-xs text-muted-foreground truncate mt-1">{img.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generation Settings */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  3D Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>3D Generation Provider</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProvider('tencent');
                        localStorage.setItem('preferred3DProvider', 'tencent');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        provider === 'tencent'
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-border hover:border-cyan-500/50'
                      }`}
                    >
                      <Box className={`h-6 w-6 ${provider === 'tencent' ? 'text-cyan-500' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className={`font-medium text-sm ${provider === 'tencent' ? 'text-cyan-500' : ''}`}>Tencent</p>
                        <p className="text-xs text-muted-foreground">Hunyuan-3D</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProvider('scenecraft');
                        localStorage.setItem('preferred3DProvider', 'scenecraft');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        provider === 'scenecraft'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Box className={`h-6 w-6 ${provider === 'scenecraft' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className={`font-medium text-sm ${provider === 'scenecraft' ? 'text-primary' : ''}`}>Scenecraft AI</p>
                        <p className="text-xs text-muted-foreground">Cloud API</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProvider('meshy');
                        localStorage.setItem('preferred3DProvider', 'meshy');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        provider === 'meshy'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Box className={`h-6 w-6 ${provider === 'meshy' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className={`font-medium text-sm ${provider === 'meshy' ? 'text-primary' : ''}`}>Meshy AI</p>
                        <p className="text-xs text-muted-foreground">Quad topology</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProvider('tripo');
                        localStorage.setItem('preferred3DProvider', 'tripo');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        provider === 'tripo'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Box className={`h-6 w-6 ${provider === 'tripo' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className={`font-medium text-sm ${provider === 'tripo' ? 'text-primary' : ''}`}>Tripo AI</p>
                        <p className="text-xs text-muted-foreground">High-quality</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tencent Hunyuan-3D Settings */}
                {provider === 'tencent' && (
                  <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 space-y-4">
                    <div className="flex items-start gap-2">
                      <Box className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-cyan-400">Tencent Cloud Hunyuan-3D</p>
                        <p className="text-muted-foreground">Cloud-based 3D generation. Configure API keys in External Tools.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Output Format</Label>
                      <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as 'glb' | 'obj')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="glb">GLB (Recommended)</SelectItem>
                          <SelectItem value="obj">OBJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name *</Label>
                  <Input
                    id="modelName"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., Hero_Character_Proxy_v1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(provider === 'scenecraft' || provider === 'meshy') && (
                    <div className="space-y-2">
                      <Label>{provider === 'scenecraft' ? 'Scenecraft' : 'Meshy'} AI Model</Label>
                      <Select value={meshyModel} onValueChange={(v) => setMeshyModel(v as 'meshy-4' | 'meshy-5')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meshy-4">Meshy-4 (Stable)</SelectItem>
                          <SelectItem value="meshy-5">Meshy-5 (Latest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Base Pose</Label>
                    <Select value={poseType} onValueChange={setPoseType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_pose">A-Pose (Recommended)</SelectItem>
                        <SelectItem value="t_pose">T-Pose</SelectItem>
                        <SelectItem value="neutral">Neutral Standing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(provider === 'scenecraft' || provider === 'meshy') && (
                    <div className="space-y-2">
                      <Label>Topology</Label>
                      <Select value={topology} onValueChange={(v) => setTopology(v as 'quad' | 'triangle')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quad">Quad (Animation-ready)</SelectItem>
                          <SelectItem value="triangle">Triangle (Game-ready)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{provider === 'meshy' ? 'Target Polycount' : 'Face Limit'}</Label>
                    <Select 
                      value={targetPolycount.toString()} 
                      onValueChange={(v) => setTargetPolycount(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10000">10k (Low)</SelectItem>
                        <SelectItem value="30000">30k (Medium)</SelectItem>
                        <SelectItem value="50000">50k (High)</SelectItem>
                        <SelectItem value="100000">100k (Very High)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Enable PBR Textures</Label>
                    <p className="text-xs text-muted-foreground">
                      Generate metallic, roughness & normal maps
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePbr}
                    onChange={(e) => setEnablePbr(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </div>

                {(provider === 'scenecraft' || provider === 'meshy') && (
                  <div className="space-y-2">
                    <Label>Texture Prompt (Optional)</Label>
                    <Textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Guide texture generation, e.g., 'medieval armor with gold trim'..."
                      rows={2}
                    />
                  </div>
                )}

                {/* Export Formats */}
                <div className="space-y-2">
                  <Label>Export Formats</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">GLB</Badge>
                    <Badge variant="outline">FBX</Badge>
                    <Badge variant="outline">OBJ</Badge>
                    <Badge variant="outline">USDZ</Badge>
                  </div>
                </div>

                {/* Provider Info */}
                {provider !== 'tencent' && (
                  <div className="rounded-lg p-3 bg-primary/10 border border-primary/30">
                    <div className="flex items-start gap-2">
                      <Box className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-primary">
                          Powered by {provider === 'scenecraft' ? 'Scenecraft' : provider === 'meshy' ? 'Meshy' : 'Tripo'} AI
                        </p>
                        <ul className="text-muted-foreground mt-1 space-y-0.5">
                          <li>• Image-to-3D AI generation</li>
                          <li>• Automatic UV mapping & textures</li>
                          <li>• Download in multiple formats</li>
                          {provider === 'tripo' && <li>• High-quality PBR materials</li>}
                          {provider === 'scenecraft' && <li>• Optimized for film production</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{generationStatus}</span>
                      <span className="text-primary font-medium">{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-2" />
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating with {provider === 'tencent' ? 'Tencent Hunyuan-3D' : provider === 'scenecraft' ? 'Scenecraft' : provider === 'meshy' ? 'Meshy' : 'Tripo'}...
                    </>
                  ) : (
                    <>
                      <Box className="h-4 w-4 mr-2" />
                      Generate 3D Proxy
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          {proxyModels.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center">
                <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Proxy Models Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first 3D proxy model from concept art
                </p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proxyModels.map(model => (
                <Card key={model.id} className="bg-card/50 border-border/50 overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {model.thumbnail_url ? (
                      <img
                        src={model.thumbnail_url}
                        alt={model.name}
                        className="w-full h-full object-cover"
                      />
                    ) : model.status === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Generating...</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(model.status)}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{model.name}</h3>
                    {model.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {model.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">
                        {model.pose_type?.replace('_', '-').toUpperCase() || 'A-POSE'}
                      </Badge>
                      {model.poly_count && (
                        <Badge variant="outline" className="text-xs">
                          {(model.poly_count / 1000).toFixed(1)}k polys
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        disabled={model.status !== 'ready' || !model.model_file_urls?.glb}
                        onClick={() => setViewingModel(model)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View 3D
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        disabled={model.status !== 'ready' || !model.model_file_urls || Object.keys(model.model_file_urls).length === 0}
                        onClick={() => {
                          const urls = model.model_file_urls || {};
                          const downloadUrl = urls.glb || urls.fbx || urls.obj || Object.values(urls)[0];
                          if (downloadUrl) {
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = `${model.name}.${urls.glb ? 'glb' : urls.fbx ? 'fbx' : 'obj'}`;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success('Download started!');
                          } else {
                            toast.error('No downloadable files available');
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 3D Model Viewer Dialog */}
      {viewingModel && viewingModel.model_file_urls?.glb && (
        <Dialog open={!!viewingModel} onOpenChange={() => setViewingModel(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-primary" />
                {viewingModel.name}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center h-[500px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                <ModelViewer3D
                  modelUrl={viewingModel.model_file_urls.glb}
                  thumbnailUrl={viewingModel.thumbnail_url || undefined}
                  modelName={viewingModel.name}
                  height="500px"
                  onDownload={() => {
                    const link = document.createElement('a');
                    link.href = viewingModel.model_file_urls.glb;
                    link.download = `${viewingModel.name}.glb`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('Download started!');
                  }}
                />
              </Suspense>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline">
                  {viewingModel.pose_type?.replace('_', '-').toUpperCase() || 'A-POSE'}
                </Badge>
                {viewingModel.poly_count && (
                  <Badge variant="outline">
                    {(viewingModel.poly_count / 1000).toFixed(1)}k polys
                  </Badge>
                )}
              </div>
              <Button variant="outline" onClick={() => setViewingModel(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
