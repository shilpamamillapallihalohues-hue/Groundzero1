import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Box, Upload, Clock, CheckCircle, AlertCircle, Eye, Palette, FolderOpen, Wand2, Image, Timer, FileText, Loader2, Users, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ModelGenerator3D } from '@/components/pipeline/ModelGenerator3D';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssignedAsset {
  id: string;
  name: string;
  category: string;
  description: string | null;
  thumbnail_url: string | null;
  status: string;
  scene_usage: string[] | null;
  project: { id: string; title: string } | null;
  scenes: { scene_number: string; description: string; estimated_duration: number; location: string; characters: string[] }[];
  totalRuntime: number;
}

export function ModelingArtistDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [show3DGenerator, setShow3DGenerator] = useState(false);
  const [showRefGenerator, setShowRefGenerator] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  const [refPrompt, setRefPrompt] = useState('');
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);

  // Fetch user's assigned tasks with asset details
  const { data: assignedAssets, isLoading: assetsLoading } = useQuery({
    queryKey: ['modeling-assigned-assets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      // Get tasks assigned to this modeler (via tasks table)
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, priority, due_date,
          project_id, scene_id,
          projects(id, title)
        `)
        .eq('assigned_to', profile.id)
        .ilike('department', '%model%')
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false });

      // Also get work_tasks if linked via work_employees
      const { data: workEmployee } = await supabase
        .from('work_employees')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      let workTasks: any[] = [];
      if (workEmployee) {
        const { data } = await supabase
          .from('work_tasks')
          .select('id, title, description, status, priority, due_date, project_id')
          .eq('employee_id', workEmployee.id)
          .in('status', ['pending', 'in_progress']);
        workTasks = data || [];
      }

      // Combine all assigned project IDs
      const allTasks = [...(tasks || []), ...workTasks];
      if (allTasks.length === 0) return [];

      const projectIds = [...new Set(allTasks.map(t => t.project_id).filter(Boolean))] as string[];
      
      // Extract asset names from task titles (format: "Model: AssetName")
      const assetNamesFromTasks = allTasks
        .map(t => {
          const match = t.title?.match(/^Model:\s*(.+)$/i);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean);

      // Get production assets from task projects OR matching asset names
      let assetsQuery = supabase
        .from('production_assets')
        .select('id, name, category, description, thumbnail_url, status, scene_usage, project_id')
        .in('category', ['character', 'prop', 'vehicle', 'environment'] as any);
      
      if (projectIds.length > 0 && assetNamesFromTasks.length > 0) {
        assetsQuery = assetsQuery.or(`project_id.in.(${projectIds.join(',')}),name.in.(${assetNamesFromTasks.map(n => `"${n}"`).join(',')})`);
      } else if (projectIds.length > 0) {
        assetsQuery = assetsQuery.in('project_id', projectIds);
      }

      const { data: productionAssets } = await assetsQuery;

      // Also check asset_department_status for directly assigned assets
      const { data: assignedStatuses } = await supabase
        .from('asset_department_status')
        .select(`
          id, asset_id, workflow_status,
          production_assets!inner(id, name, category, description, thumbnail_url, status, scene_usage, project_id)
        `)
        .eq('assigned_artist_id', profile.id);

      // Combine assets from both sources
      const directlyAssignedAssets = (assignedStatuses || []).map(s => (s.production_assets as any));
      const allAssets = [...(productionAssets || []), ...directlyAssignedAssets];
      const uniqueAssets = allAssets.filter((asset, index, self) => 
        asset && self.findIndex(a => a?.id === asset.id) === index
      );

      if (uniqueAssets.length === 0) return [];

      // Get scenes for runtime calculation
      const assetProjectIds = [...new Set(uniqueAssets.map(a => a.project_id).filter(Boolean))] as string[];
      const { data: scenes } = await supabase
        .from('scenes')
        .select('id, project_id, scene_number, description, estimated_duration, location, characters')
        .in('project_id', assetProjectIds);

      // Get project info
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', assetProjectIds);

      // Build assigned assets with runtime info
      const assetsWithRuntime: AssignedAsset[] = uniqueAssets.map(asset => {
        const project = projects?.find(p => p.id === asset.project_id);
        const assetScenes = (scenes || []).filter(s => 
          s.project_id === asset.project_id && 
          (asset.scene_usage?.includes(s.id) || 
           (asset.category === 'character' && s.characters?.includes(asset.name)))
        );
        const totalRuntime = assetScenes.reduce((sum, s) => sum + (s.estimated_duration || 0), 0);

        return {
          ...asset,
          project: project as any,
          scenes: assetScenes.map(s => ({
            scene_number: s.scene_number,
            description: s.description || '',
            estimated_duration: s.estimated_duration || 0,
            location: s.location || '',
            characters: s.characters || []
          })),
          totalRuntime
        };
      });

      return assetsWithRuntime;
    }
  });

  // Fetch concept arts as modeling references
  const { data: conceptArts } = useQuery({
    queryKey: ['modeling-concept-refs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, is_approved, description')
        .eq('is_approved', true)
        .in('concept_type', ['character', 'prop', 'vehicle', 'environment'])
        .limit(12);
      return data || [];
    }
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['modeling-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, scene_id, projects(id, title), scenes(scene_number, description, estimated_duration)')
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .limit(15);
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['modeling-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { pending: 0, inProgress: 0, completed: 0 };
      
      const { count: pending } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'pending');
      
      const { count: inProgress } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'in_progress');
        
      const { count: completed } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'completed');

      return { pending: pending || 0, inProgress: inProgress || 0, completed: completed || 0 };
    }
  });

  const { data: proxyModelsCount } = useQuery({
    queryKey: ['modeling-proxy-models-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('proxy_models')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  // Generate reference image for asset
  const handleGenerateReference = async () => {
    if (!selectedAsset || !refPrompt.trim()) {
      toast.error('Please enter a description for the reference image');
      return;
    }

    setIsGeneratingRef(true);
    try {
      const fullPrompt = `${selectedAsset.category} reference for modeling: ${selectedAsset.name}. ${refPrompt}. Production quality, multiple angles if possible, clean background for 3D modeling reference.`;

      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          prompt: fullPrompt,
          artStyle: 'realistic',
          conceptType: selectedAsset.category,
        }
      });

      if (error) throw error;

      // Save as concept art for reference
      await supabase.from('concept_arts').insert({
        project_id: selectedAsset.project?.id || '00000000-0000-0000-0000-000000000000',
        title: `${selectedAsset.name} - Modeling Reference`,
        description: refPrompt,
        concept_type: selectedAsset.category as any,
        image_url: data.imageUrl,
        status: 'draft',
        tags: ['modeling-reference', selectedAsset.category, selectedAsset.name.toLowerCase()]
      });

      toast.success('Reference image generated!');
      queryClient.invalidateQueries({ queryKey: ['modeling-concept-refs'] });
      setShowRefGenerator(false);
      setRefPrompt('');
    } catch (error) {
      console.error('Error generating reference:', error);
      toast.error('Failed to generate reference image');
    } finally {
      setIsGeneratingRef(false);
    }
  };

  const formatRuntime = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (assetsLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modeling Artist Dashboard</h1>
          <p className="text-muted-foreground">Create and manage 3D models for production</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShow3DGenerator(true)} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Generate 3D Model
          </Button>
        </div>
      </div>

      {/* My Work Tasks */}
      <MyWorkTasks />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-muted-foreground">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                <p className="text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                <p className="text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Box className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{proxyModelsCount || 0}</p>
                <p className="text-muted-foreground">AI 3D Models</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Assets with Runtime Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Assigned Assets
            <Badge variant="secondary" className="ml-2">{assignedAssets?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedAssets && assignedAssets.length > 0 ? (
            <div className="space-y-4">
              {assignedAssets.map((asset) => (
                <div key={asset.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.name} className="w-20 h-20 rounded-lg object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Box className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{asset.name}</h4>
                        <Badge variant="outline">{asset.category}</Badge>
                        <Badge variant={asset.status === 'in_progress' ? 'secondary' : 'outline'}>
                          {asset.status || 'pending'}
                        </Badge>
                      </div>
                      
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{asset.description}</p>
                      )}

                      {/* Runtime and Scene Info */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Timer className="h-4 w-4" />
                          <span>Screen Time: <strong className="text-foreground">{formatRuntime(asset.totalRuntime)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>Scenes: <strong className="text-foreground">{asset.scenes.length}</strong></span>
                        </div>
                        {asset.project && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FolderOpen className="h-4 w-4" />
                            <span>{asset.project.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Scene Details */}
                      {asset.scenes.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Appears in:</p>
                          <div className="flex flex-wrap gap-2">
                            {asset.scenes.slice(0, 4).map((scene, idx) => (
                              <div key={idx} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                                <span className="font-medium">Scene {scene.scene_number}</span>
                                {scene.location && (
                                  <span className="text-muted-foreground flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />{scene.location}
                                  </span>
                                )}
                                <span className="text-muted-foreground">({formatRuntime(scene.estimated_duration)})</span>
                              </div>
                            ))}
                            {asset.scenes.length > 4 && (
                              <span className="text-xs text-muted-foreground">+{asset.scenes.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowRefGenerator(true);
                        }}
                      >
                        <Image className="h-4 w-4 mr-1" />
                        Gen Reference
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShow3DGenerator(true);
                        }}
                      >
                        <Box className="h-4 w-4 mr-1" />
                        Gen 3D
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No assets assigned yet.</p>
              <p className="text-sm">Assets will appear here when assigned to you via tasks.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Modeling Tasks with Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Modeling Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4">
              {tasks && tasks.length > 0 ? (
                tasks.map((task: any) => (
                  <div key={task.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">{task.title}</span>
                          <Badge variant={
                            task.priority === 'high' || task.priority === 'urgent' ? 'destructive' :
                            task.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {task.priority || 'normal'}
                          </Badge>
                          <Badge variant="outline">{task.status || 'pending'}</Badge>
                        </div>
                        
                        {/* Task Description with References */}
                        {task.description && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              {task.description.split('\n').map((line: string, idx: number) => {
                                if (line.startsWith('## ')) {
                                  return <h3 key={idx} className="text-base font-semibold mt-2 first:mt-0">{line.replace('## ', '')}</h3>;
                                }
                                if (line.startsWith('### ')) {
                                  return <h4 key={idx} className="text-sm font-medium mt-2 text-muted-foreground">{line.replace('### ', '')}</h4>;
                                }
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return <p key={idx} className="font-medium">{line.replace(/\*\*/g, '')}</p>;
                                }
                                if (line.startsWith('- ')) {
                                  const content = line.replace('- ', '');
                                  // Check if it contains an image URL
                                  const urlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
                                  if (urlMatch) {
                                    return (
                                      <div key={idx} className="flex items-start gap-2 ml-2">
                                        <span>•</span>
                                        <div>
                                          <span>{content.replace(urlMatch[0], '')}</span>
                                          <img src={urlMatch[0]} alt="Reference" className="mt-1 max-w-[200px] rounded border" />
                                        </div>
                                      </div>
                                    );
                                  }
                                  return <p key={idx} className="ml-2">• {content}</p>;
                                }
                                if (line.trim()) {
                                  return <p key={idx}>{line}</p>;
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                          {task.projects?.title && (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="h-3 w-3" />
                              {task.projects.title}
                            </span>
                          )}
                          {task.scenes?.scene_number && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Scene {task.scenes.scene_number}
                            </span>
                          )}
                          {task.scenes?.estimated_duration && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {formatRuntime(task.scenes.estimated_duration)}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => navigate('/artist/tasks')}>View Details</Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Extract asset info from task title for 3D generation
                            const match = task.title?.match(/^Model:\s*(.+)$/i);
                            if (match) {
                              setSelectedAsset({
                                id: task.id,
                                name: match[1],
                                category: 'prop',
                                description: task.description,
                                thumbnail_url: null,
                                status: 'pending',
                                scene_usage: null,
                                project: task.projects,
                                scenes: task.scenes ? [task.scenes] : [],
                                totalRuntime: task.scenes?.estimated_duration || 0
                              });
                            }
                            setShow3DGenerator(true);
                          }}
                        >
                          <Box className="h-4 w-4 mr-1" />
                          Gen 3D
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned yet.</p>
                  <p className="text-sm">Tasks will appear here when assigned by Production Head or HOD.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Concept Art References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Reference Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {conceptArts && conceptArts.length > 0 ? (
              conceptArts.map((concept: any) => (
                <div key={concept.id} className="relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer"
                     onClick={() => navigate('/preprod/concept/assets')}>
                  {concept.image_url ? (
                    <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      {concept.title}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs truncate">{concept.title}</p>
                    <p className="text-white/70 text-xs">{concept.concept_type}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground col-span-6 text-center py-4">No approved concepts yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Completed Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/artist/assets')}>
            Upload 3D Model (FBX, OBJ, GLB)
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Upload completed models for review by your department lead.
          </p>
        </CardContent>
      </Card>

      {/* 3D Model Generator Dialog */}
      <Dialog open={show3DGenerator} onOpenChange={setShow3DGenerator}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 3D Model Generator</DialogTitle>
            {selectedAsset && (
              <DialogDescription>
                Generating 3D model for: {selectedAsset.name} ({selectedAsset.category})
              </DialogDescription>
            )}
          </DialogHeader>
          <ModelGenerator3D 
            projectId={selectedAsset?.project?.id}
            onModelGenerated={() => {}}
          />
        </DialogContent>
      </Dialog>

      {/* Reference Image Generator Dialog */}
      <Dialog open={showRefGenerator} onOpenChange={setShowRefGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Generate Reference Image
            </DialogTitle>
            {selectedAsset && (
              <DialogDescription>
                Creating modeling reference for: <strong>{selectedAsset.name}</strong> ({selectedAsset.category})
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedAsset && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Asset:</strong> {selectedAsset.name}</p>
                <p><strong>Type:</strong> {selectedAsset.category}</p>
                {selectedAsset.description && <p><strong>Description:</strong> {selectedAsset.description}</p>}
                <p><strong>Screen Time:</strong> {formatRuntime(selectedAsset.totalRuntime)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reference Image Description</Label>
              <Textarea
                value={refPrompt}
                onChange={(e) => setRefPrompt(e.target.value)}
                placeholder="Describe the reference you need, e.g., 'front and side view turnaround, detailed armor plates, worn metal texture'..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                The AI will generate a reference image optimized for 3D modeling.
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleGenerateReference}
              disabled={isGeneratingRef || !refPrompt.trim()}
            >
              {isGeneratingRef ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" />Generate Reference Image</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
