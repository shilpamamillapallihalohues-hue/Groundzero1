import { useState, useEffect } from 'react';
import { Loader2, Search, Box, Image, Users, MapPin, FileText, Timer, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductionTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProjectAssets {
  props: string[];
  characters: string[];
  environments: string[];
  scenes: any[];
  conceptArts: any[];
  referenceImages: any[];
  productionAssets: any[];
}

const departments = [
  { value: 'modeling', label: 'Modeling' },
  { value: 'texturing', label: 'Texturing' },
  { value: 'rigging', label: 'Rigging' },
  { value: 'animation', label: 'Animation' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'rendering', label: 'Rendering' },
  { value: 'vfx', label: 'VFX' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'bg-info/20 text-info' },
  { value: 'high', label: 'High', color: 'bg-warning/20 text-warning' },
  { value: 'urgent', label: 'Urgent', color: 'bg-destructive/20 text-destructive' },
];

export function ProductionTaskDialog({ open, onOpenChange, onSuccess }: ProductionTaskDialogProps) {
  const [step, setStep] = useState<'project' | 'assets' | 'details'>('project');
  const [projects, setProjects] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectAssets, setProjectAssets] = useState<ProjectAssets | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<{ type: string; item: any }[]>([]);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [department, setDepartment] = useState('modeling');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetTab, setAssetTab] = useState('characters');

  useEffect(() => {
    if (open) {
      loadProjects();
      loadArtists();
      resetForm();
    }
  }, [open]);

  const loadProjects = async () => {
    try {
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadArtists = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('role', ['modeling_artist', 'texturing_artist', 'rigging_artist', 'animation_artist', 'lighting_artist', 'render_artist', 'vfx_artist', 'artist']);
      setArtists(data || []);
    } catch (error) {
      console.error('Error loading artists:', error);
    }
  };

  const loadProjectAssets = async (projectId: string) => {
    setIsLoadingAssets(true);
    try {
      // Load scenes with their props, characters, environments
      const { data: scenes } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_number', { ascending: true });

      // Load concept arts
      const { data: conceptArts } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Load reference images
      const { data: referenceImages } = await supabase
        .from('reference_images')
        .select('*')
        .eq('project_id', projectId);

      // Load production assets
      const { data: productionAssets } = await supabase
        .from('production_assets')
        .select('*')
        .eq('project_id', projectId);

      // Extract unique props, characters, environments from scenes
      const allProps = new Set<string>();
      const allCharacters = new Set<string>();
      const allEnvironments = new Set<string>();

      (scenes || []).forEach(scene => {
        (scene.props || []).forEach((p: string) => allProps.add(p));
        (scene.characters || []).forEach((c: string) => allCharacters.add(c));
        if (scene.location) allEnvironments.add(scene.location);
      });

      setProjectAssets({
        props: Array.from(allProps),
        characters: Array.from(allCharacters),
        environments: Array.from(allEnvironments),
        scenes: scenes || [],
        conceptArts: conceptArts || [],
        referenceImages: referenceImages || [],
        productionAssets: productionAssets || [],
      });
    } catch (error) {
      console.error('Error loading project assets:', error);
      toast.error('Failed to load project assets');
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    loadProjectAssets(project.id);
    setStep('assets');
  };

  const toggleAssetSelection = (type: string, item: any) => {
    const exists = selectedAssets.find(a => 
      a.type === type && (typeof a.item === 'string' ? a.item === item : a.item.id === item.id)
    );
    if (exists) {
      setSelectedAssets(prev => prev.filter(a => 
        !(a.type === type && (typeof a.item === 'string' ? a.item === item : a.item.id === item.id))
      ));
    } else {
      setSelectedAssets(prev => [...prev, { type, item }]);
    }
  };

  const toggleSceneSelection = (scene: any) => {
    if (selectedScene?.id === scene.id) {
      setSelectedScene(null);
    } else {
      setSelectedScene(scene);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }
    if (selectedAssets.length === 0 && !selectedScene) {
      toast.error('Please select at least one asset or scene');
      return;
    }
    if (!assignedTo) {
      toast.error('Please assign to an artist');
      return;
    }

    setIsLoading(true);
    try {
      const tasksToCreate: any[] = [];
      
      // Create tasks for each selected asset
      for (const asset of selectedAssets) {
        const assetName = typeof asset.item === 'string' ? asset.item : (asset.item.name || asset.item.title);
        const assetDescription = typeof asset.item === 'string' ? '' : (asset.item.description || '');
        
        // Get related references
        const relatedConcepts = projectAssets?.conceptArts.filter(c => 
          c.title?.toLowerCase().includes(assetName.toLowerCase()) ||
          c.concept_type === asset.type
        ) || [];
        
        const relatedRefs = projectAssets?.referenceImages.filter(r =>
          r.title?.toLowerCase().includes(assetName.toLowerCase()) ||
          r.category?.toLowerCase() === asset.type
        ) || [];

        tasksToCreate.push({
          project_id: selectedProject.id,
          title: `Model: ${assetName}`,
          description: buildTaskDescription(asset.type, assetName, assetDescription, relatedConcepts, relatedRefs, additionalNotes),
          department,
          priority,
          assigned_to: assignedTo,
          due_date: dueDate || null,
          status: 'pending',
        });
      }

      // Create task for complete scene if selected
      if (selectedScene) {
        const sceneConcepts = projectAssets?.conceptArts.filter(c => 
          c.scene_id === selectedScene.id
        ) || [];
        
        tasksToCreate.push({
          project_id: selectedProject.id,
          scene_id: selectedScene.id,
          title: `Scene ${selectedScene.scene_number}: ${selectedScene.slugline || selectedScene.location || 'Complete Scene'}`,
          description: buildSceneTaskDescription(selectedScene, sceneConcepts, additionalNotes),
          department,
          priority,
          assigned_to: assignedTo,
          due_date: dueDate || null,
          status: 'pending',
        });
      }

      // Insert all tasks
      const { error } = await supabase.from('tasks').insert(tasksToCreate);
      if (error) throw error;

      // Also create entries in work_tasks for work tracking integration
      const { data: workEmployee } = await supabase
        .from('work_employees')
        .select('id')
        .eq('profile_id', assignedTo)
        .single();

      if (workEmployee) {
        const workTasksToCreate = tasksToCreate.map(t => ({
          employee_id: workEmployee.id,
          project_id: t.project_id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          due_date: t.due_date,
          status: 'pending',
        }));

        await supabase.from('work_tasks').insert(workTasksToCreate);
      }

      toast.success(`Created ${tasksToCreate.length} task(s) successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating tasks:', error);
      toast.error(error.message || 'Failed to create tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const buildTaskDescription = (
    type: string, 
    name: string, 
    desc: string, 
    concepts: any[], 
    refs: any[],
    notes: string
  ) => {
    let description = `## ${type.charAt(0).toUpperCase() + type.slice(1)}: ${name}\n\n`;
    
    if (desc) {
      description += `### Description\n${desc}\n\n`;
    }

    if (concepts.length > 0) {
      description += `### Reference Concept Arts\n`;
      concepts.forEach(c => {
        description += `- **${c.title}**: ${c.image_url || 'No image'}\n`;
        if (c.description) description += `  ${c.description}\n`;
      });
      description += '\n';
    }

    if (refs.length > 0) {
      description += `### Reference Images\n`;
      refs.forEach(r => {
        description += `- ${r.title || 'Reference'}: ${r.image_url}\n`;
      });
      description += '\n';
    }

    if (notes) {
      description += `### Additional Notes\n${notes}\n`;
    }

    return description;
  };

  const buildSceneTaskDescription = (scene: any, concepts: any[], notes: string) => {
    let description = `## Scene ${scene.scene_number}\n\n`;
    
    if (scene.slugline) {
      description += `**${scene.slugline}**\n\n`;
    }
    
    if (scene.location) {
      description += `**Location:** ${scene.location}\n`;
    }
    if (scene.time_of_day) {
      description += `**Time of Day:** ${scene.time_of_day}\n`;
    }
    if (scene.estimated_duration) {
      description += `**Duration:** ${Math.floor(scene.estimated_duration / 60)}m ${scene.estimated_duration % 60}s\n`;
    }
    description += '\n';

    if (scene.description) {
      description += `### Scene Description\n${scene.description}\n\n`;
    }

    if (scene.characters?.length > 0) {
      description += `### Characters\n${scene.characters.join(', ')}\n\n`;
    }

    if (scene.props?.length > 0) {
      description += `### Props Required\n${scene.props.join(', ')}\n\n`;
    }

    if (concepts.length > 0) {
      description += `### Scene Concept Arts\n`;
      concepts.forEach(c => {
        description += `- **${c.title}**: ${c.image_url || 'No image'}\n`;
      });
      description += '\n';
    }

    if (notes) {
      description += `### Additional Notes\n${notes}\n`;
    }

    return description;
  };

  const resetForm = () => {
    setStep('project');
    setSelectedProject(null);
    setProjectAssets(null);
    setSelectedAssets([]);
    setSelectedScene(null);
    setAssignedTo('');
    setDepartment('modeling');
    setPriority('medium');
    setDueDate('');
    setAdditionalNotes('');
    setSearchQuery('');
    setAssetTab('characters');
  };

  const filteredItems = (items: any[], isString = true) => {
    if (!searchQuery) return items;
    if (isString) {
      return items.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return items.filter(i => 
      (i.name || i.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Production Task
          </DialogTitle>
          <DialogDescription>
            {step === 'project' && 'Select a project to assign tasks from'}
            {step === 'assets' && `Select assets or scenes from "${selectedProject?.title}" to assign`}
            {step === 'details' && 'Configure task details and assignment'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step: Select Project */}
          {step === 'project' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="p-4 rounded-lg border cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <h4 className="font-semibold">{project.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <Badge variant="outline" className="mt-2">{project.genre || 'Film'}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Step: Select Assets */}
          {step === 'assets' && (
            <div className="space-y-4 h-[450px] flex flex-col">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={() => setStep('project')}>
                  Change Project
                </Button>
              </div>

              {isLoadingAssets ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Tabs value={assetTab} onValueChange={setAssetTab} className="flex-1 flex flex-col">
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="characters">Characters ({projectAssets?.characters.length || 0})</TabsTrigger>
                    <TabsTrigger value="props">Props ({projectAssets?.props.length || 0})</TabsTrigger>
                    <TabsTrigger value="environments">Environments ({projectAssets?.environments.length || 0})</TabsTrigger>
                    <TabsTrigger value="scenes">Scenes ({projectAssets?.scenes.length || 0})</TabsTrigger>
                    <TabsTrigger value="concepts">Concepts ({projectAssets?.conceptArts.length || 0})</TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1 mt-4">
                    <TabsContent value="characters" className="m-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredItems(projectAssets?.characters || []).map((char) => (
                          <div
                            key={char}
                            onClick={() => toggleAssetSelection('character', char)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedAssets.some(a => a.type === 'character' && a.item === char)
                                ? 'border-primary bg-primary/10'
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{char}</span>
                            </div>
                          </div>
                        ))}
                        {projectAssets?.characters.length === 0 && (
                          <p className="text-muted-foreground col-span-full text-center py-4">No characters found in scenes</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="props" className="m-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredItems(projectAssets?.props || []).map((prop) => (
                          <div
                            key={prop}
                            onClick={() => toggleAssetSelection('prop', prop)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedAssets.some(a => a.type === 'prop' && a.item === prop)
                                ? 'border-primary bg-primary/10'
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{prop}</span>
                            </div>
                          </div>
                        ))}
                        {projectAssets?.props.length === 0 && (
                          <p className="text-muted-foreground col-span-full text-center py-4">No props found in scenes</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="environments" className="m-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredItems(projectAssets?.environments || []).map((env) => (
                          <div
                            key={env}
                            onClick={() => toggleAssetSelection('environment', env)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedAssets.some(a => a.type === 'environment' && a.item === env)
                                ? 'border-primary bg-primary/10'
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{env}</span>
                            </div>
                          </div>
                        ))}
                        {projectAssets?.environments.length === 0 && (
                          <p className="text-muted-foreground col-span-full text-center py-4">No environments found</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="scenes" className="m-0">
                      <div className="space-y-2">
                        {filteredItems(projectAssets?.scenes || [], false).map((scene) => (
                          <div
                            key={scene.id}
                            onClick={() => toggleSceneSelection(scene)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedScene?.id === scene.id
                                ? 'border-primary bg-primary/10'
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Scene {scene.scene_number}</span>
                                  <Badge variant="outline" className="text-xs">{scene.location}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{scene.description}</p>
                              </div>
                              {scene.estimated_duration && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Timer className="h-3 w-3" />
                                  {Math.floor(scene.estimated_duration / 60)}m
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {scene.characters?.slice(0, 3).map((c: string) => (
                                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                              ))}
                              {(scene.characters?.length || 0) > 3 && (
                                <Badge variant="secondary" className="text-xs">+{scene.characters.length - 3}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="concepts" className="m-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {filteredItems(projectAssets?.conceptArts || [], false).map((concept) => (
                          <div
                            key={concept.id}
                            onClick={() => toggleAssetSelection('concept', concept)}
                            className={`rounded-lg border overflow-hidden cursor-pointer transition-colors ${
                              selectedAssets.some(a => a.type === 'concept' && a.item.id === concept.id)
                                ? 'border-primary ring-2 ring-primary/50'
                                : 'hover:border-primary/50'
                            }`}
                          >
                            {concept.image_url ? (
                              <img src={concept.image_url} alt={concept.title} className="w-full aspect-square object-cover" />
                            ) : (
                              <div className="w-full aspect-square bg-muted flex items-center justify-center">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="p-2">
                              <p className="text-xs font-medium truncate">{concept.title}</p>
                              <Badge variant="outline" className="text-xs mt-1">{concept.concept_type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              )}

              {/* Selected Items Summary */}
              {(selectedAssets.length > 0 || selectedScene) && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Selected ({selectedAssets.length + (selectedScene ? 1 : 0)}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssets.map((a, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {typeof a.item === 'string' ? a.item : (a.item.name || a.item.title)}
                        <span className="text-xs opacity-70">({a.type})</span>
                      </Badge>
                    ))}
                    {selectedScene && (
                      <Badge variant="default" className="gap-1">
                        Scene {selectedScene.scene_number}
                        <span className="text-xs opacity-70">(complete)</span>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Task Details */}
          {step === 'details' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign To *</label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select artist" />
                    </SelectTrigger>
                    <SelectContent>
                      {artists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          <div className="flex items-center gap-2">
                            <span>{artist.full_name}</span>
                            <Badge variant="outline" className="text-xs">{artist.role}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${p.color.split(' ')[0]}`} />
                              {p.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Notes</label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any specific instructions or requirements for this task..."
                    rows={4}
                  />
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">Task Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    Creating {selectedAssets.length + (selectedScene ? 1 : 0)} task(s) for project "{selectedProject?.title}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssets.map((a, i) => (
                      <Badge key={i} variant="outline">
                        {typeof a.item === 'string' ? a.item : (a.item.name || a.item.title)}
                      </Badge>
                    ))}
                    {selectedScene && (
                      <Badge variant="outline">Scene {selectedScene.scene_number}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'project' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 'assets' && (
            <>
              <Button variant="outline" onClick={() => setStep('project')}>
                Back
              </Button>
              <Button
                variant="gold"
                onClick={() => setStep('details')}
                disabled={selectedAssets.length === 0 && !selectedScene}
              >
                Continue
              </Button>
            </>
          )}
          {step === 'details' && (
            <>
              <Button variant="outline" onClick={() => setStep('assets')}>
                Back
              </Button>
              <Button variant="gold" onClick={handleSubmit} disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${selectedAssets.length + (selectedScene ? 1 : 0)} Task(s)`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
