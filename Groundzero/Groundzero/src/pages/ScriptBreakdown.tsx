import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Camera, 
  FileText, 
  Film, 
  Mic, 
  Palette, 
  Shirt, 
  Sparkles,
  Wand2,
  Zap,
  Loader2,
  FileUp,
  Languages,
  TestTube,
  ChevronDown,
  Clock,
  Plus,
  X,
  Pencil,
  GripVertical,
  Save,
  ImagePlus,
  Clapperboard,
  Images,
  Lock,
  Send,
  CheckCircle2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/hooks/useAuth';
import { useFileParser } from '@/hooks/useFileParser';
import { usePreProdStage } from '@/hooks/usePreProdStage';
import { parseScript, translateScript, createProject, createScenes, getProjects, getProjectScenes, updateScene, reorderScenes } from '@/lib/api';
import { TEST_SCRIPTS, SUPPORTED_LANGUAGES } from '@/data/testScripts';
import { ShotBreakdownPanel } from '@/components/breakdown/ShotBreakdownPanel';
import { SceneReferenceUploader } from '@/components/breakdown/SceneReferenceUploader';
import { ScriptVersionManager } from '@/components/script/ScriptVersionManager';
import { ScriptTranslator } from '@/components/script/ScriptTranslator';

import { PreProdApprovalBadge } from '@/components/preprod/PreProdApprovalBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Sortable Scene Item Component
function SortableSceneItem({ scene, isSelected, onClick }: { scene: any; isSelected: boolean; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id || scene.scene_number });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border transition-all duration-200",
        isSelected
          ? "bg-primary/10 border-primary/40"
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button
        onClick={onClick}
        className="flex-1 text-left"
      >
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            Scene {scene.scene_number}
          </Badge>
          {scene.vfx_required && <Zap className="w-3 h-3 text-purple-400" />}
        </div>
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {scene.slugline}
        </p>
      </button>
    </div>
  );
}

const departments = [
  { id: 'direction', name: 'Direction', icon: Film, color: 'text-primary' },
  { id: 'cinematography', name: 'Cinematography', icon: Camera, color: 'text-info' },
  { id: 'art', name: 'Art Dept', icon: Palette, color: 'text-success' },
  { id: 'costume', name: 'Costume', icon: Shirt, color: 'text-pink-400' },
  { id: 'vfx', name: 'VFX', icon: Zap, color: 'text-purple-400' },
  { id: 'sound', name: 'Sound', icon: Mic, color: 'text-warning' },
];

export default function ScriptBreakdown() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { parseFile, isParsingFile } = useFileParser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [scriptText, setScriptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [existingScenes, setExistingScenes] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const projectId = searchParams.get('project');
  
  // Pre-Production Stage Hook
  const {
    status: scriptStageStatus,
    isLocked: isScriptLocked,
    canEdit: canEditScript,
    canApprove,
    canLock,
    submitForReview,
    approve: approveScript,
    lock: lockScript,
    isSubmitting,
    isApproving,
    isLocking,
  } = usePreProdStage(projectId, 'script');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
      if (projectId) {
        loadProjectScenes(projectId);
      }
    }
  }, [isAuthenticated, projectId]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadProjectScenes = async (id: string) => {
    try {
      const data = await getProjectScenes(id);
      setExistingScenes(data || []);
      if (data && data.length > 0) {
        setSelectedScene(data[0]);
      }
    } catch (error) {
      console.error('Error loading scenes:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadedFileName(file.name);
      const text = await parseFile(file);
      setScriptText(text);
      toast.success(`Loaded ${file.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse file');
      setUploadedFileName(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadTestScript = (testScript: typeof TEST_SCRIPTS[0]) => {
    setScriptText(testScript.content);
    setUploadedFileName(null);
    toast.success(`Loaded test script: ${testScript.name}`);
  };

  const handleTranslate = async () => {
    if (!scriptText.trim() || !selectedLanguage) {
      toast.error('Please enter script text and select a language');
      return;
    }

    setIsTranslating(true);
    try {
      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage;
      const translatedText = await translateScript(scriptText, languageName);
      setScriptText(translatedText);
      setTranslateDialogOpen(false);
      toast.success(`Script translated to ${languageName}`);
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(error.message || 'Failed to translate script');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleParse = async () => {
    if (!scriptText.trim()) {
      toast.error('Please enter or paste script text');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Initializing AI analysis...');
    
    // Estimate time based on script length (roughly 5 seconds per 1000 characters)
    const scriptLength = scriptText.length;
    const baseTime = 8; // minimum 8 seconds
    const estimatedSeconds = Math.max(baseTime, Math.ceil(scriptLength / 1000) * 3);
    setEstimatedTime(estimatedSeconds);
    
    // Simulate progress updates
    const progressSteps = [
      { progress: 10, message: 'Preprocessing script text...', delay: 500 },
      { progress: 25, message: 'Identifying scene headings...', delay: 1500 },
      { progress: 40, message: 'Extracting characters and dialogue...', delay: 2500 },
      { progress: 55, message: 'Analyzing locations and props...', delay: 3500 },
      { progress: 70, message: 'Detecting VFX requirements...', delay: 4500 },
      { progress: 85, message: 'Generating department breakdowns...', delay: 5500 },
      { progress: 95, message: 'Finalizing scene analysis...', delay: 6500 },
    ];
    
    const progressTimeouts: NodeJS.Timeout[] = [];
    progressSteps.forEach(step => {
      const timeout = setTimeout(() => {
        setProgress(step.progress);
        setProgressMessage(step.message);
      }, step.delay);
      progressTimeouts.push(timeout);
    });
    
    // Countdown timer
    let remainingTime = estimatedSeconds;
    const countdownInterval = setInterval(() => {
      remainingTime -= 1;
      if (remainingTime > 0) {
        setEstimatedTime(remainingTime);
      }
    }, 1000);

    try {
      const result = await parseScript(scriptText);
      
      // Clear all timeouts
      progressTimeouts.forEach(clearTimeout);
      clearInterval(countdownInterval);
      
      setProgress(100);
      setProgressMessage('Analysis complete!');
      setParsedData(result);
      
      if (result.scenes && result.scenes.length > 0) {
        setSelectedScene(result.scenes[0]);
        toast.success(`Parsed ${result.scenes.length} scenes from script`);
      } else {
        toast.warning('No scenes could be extracted from the script');
      }
    } catch (error: any) {
      progressTimeouts.forEach(clearTimeout);
      clearInterval(countdownInterval);
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse script');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        setProgressMessage('');
      }, 500);
    }
  };

  const handleSaveToProject = async () => {
    if (!parsedData || !parsedData.scenes || parsedData.scenes.length === 0) {
      toast.error('No parsed scenes to save');
      return;
    }

    setIsGenerating(true);
    try {
      const project = await createProject(
        parsedData.title || 'Untitled Project',
        `Parsed script with ${parsedData.scenes.length} scenes`,
        parsedData.genre || ''
      );

      await createScenes(project.id, parsedData.scenes);
      
      toast.success('Project created with all scenes!');
      navigate(`/scenes?project=${project.id}`);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save project');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSceneField = (field: string, value: any) => {
    if (selectedScene) {
      const updatedScene = { ...selectedScene, [field]: value };
      setSelectedScene(updatedScene);
      setHasUnsavedChanges(true);
      
      // Update in parsedData if it exists
      if (parsedData?.scenes) {
        const updatedScenes = parsedData.scenes.map((scene: any) =>
          (scene.id || scene.scene_number) === (selectedScene.id || selectedScene.scene_number)
            ? updatedScene
            : scene
        );
        setParsedData({ ...parsedData, scenes: updatedScenes });
      }
      
      // Update in existingScenes if editing saved scenes
      if (existingScenes.length > 0) {
        const updatedScenes = existingScenes.map((scene: any) =>
          scene.id === selectedScene.id ? updatedScene : scene
        );
        setExistingScenes(updatedScenes);
      }
    }
  };

  const handleSaveSceneChanges = async () => {
    if (!selectedScene?.id) {
      toast.error('Scene must be saved to a project first');
      return;
    }

    setIsSaving(true);
    try {
      await updateScene(selectedScene.id, {
        characters: selectedScene.characters,
        props: selectedScene.props,
        costumes: selectedScene.costumes,
        sound_cues: selectedScene.sound_cues,
        camera_directions: selectedScene.camera_directions,
        vfx_required: selectedScene.vfx_required,
        vfx_complexity: selectedScene.vfx_complexity,
        description: selectedScene.description,
        location: selectedScene.location,
        time_of_day: selectedScene.time_of_day,
        estimated_duration: selectedScene.estimated_duration,
      });
      setHasUnsavedChanges(false);
      toast.success('Scene changes saved');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const scenes = parsedData?.scenes || existingScenes;
      const oldIndex = scenes.findIndex((s: any) => (s.id || s.scene_number) === active.id);
      const newIndex = scenes.findIndex((s: any) => (s.id || s.scene_number) === over.id);

      const reorderedScenes = arrayMove(scenes, oldIndex, newIndex).map((scene: any, index: number) => ({
        ...scene,
        scene_number: String(index + 1),
      }));

      if (parsedData?.scenes) {
        setParsedData({ ...parsedData, scenes: reorderedScenes });
      } else {
        setExistingScenes(reorderedScenes);
        
        // Save to database if these are existing scenes
        try {
          await reorderScenes(reorderedScenes.map((s: any) => ({ id: s.id, scene_number: s.scene_number })));
          toast.success('Scene order updated');
        } catch (error: any) {
          console.error('Reorder error:', error);
          toast.error('Failed to save scene order');
        }
      }

      // Update selected scene if it was moved
      if (selectedScene) {
        const updatedSelectedScene = reorderedScenes.find(
          (s: any) => (s.id || s.scene_number) === (selectedScene.id || selectedScene.scene_number)
        );
        if (updatedSelectedScene) {
          setSelectedScene(updatedSelectedScene);
        }
      }
    }
  };

  const addItem = (field: 'characters' | 'props' | 'costumes' | 'sound_cues' | 'camera_directions') => {
    if (!newItemValue.trim()) return;
    const currentList = selectedScene?.[field] || [];
    updateSceneField(field, [...currentList, newItemValue.trim()]);
    setNewItemValue('');
    setEditingField(null);
  };

  const removeItem = (field: 'characters' | 'props' | 'costumes' | 'sound_cues' | 'camera_directions', index: number) => {
    const currentList = selectedScene?.[field] || [];
    updateSceneField(field, currentList.filter((_: any, i: number) => i !== index));
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const scenesToShow = parsedData?.scenes || existingScenes;
  const currentScene = selectedScene;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Script Breakdown</h1>
            <p className="text-muted-foreground mt-1">AI-powered analysis and department assignments</p>
          </div>
        </div>

        {/* Script Input */}
        {!parsedData && existingScenes.length === 0 && (
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Upload or Paste Your Script</h3>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Test Scripts Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <TestTube className="w-4 h-4" />
                      Load Test Script
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Sample Scripts</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {TEST_SCRIPTS.map((script) => (
                      <DropdownMenuItem
                        key={script.id}
                        onClick={() => handleLoadTestScript(script)}
                        className="flex flex-col items-start gap-1"
                      >
                        <span className="font-medium">{script.name}</span>
                        <span className="text-xs text-muted-foreground">{script.description}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Translate Button */}
                <Dialog open={translateDialogOpen} onOpenChange={setTranslateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={!scriptText.trim()}>
                      <Languages className="w-4 h-4" />
                      Translate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Translate Script</DialogTitle>
                      <DialogDescription>
                        Translate your screenplay to another language while preserving formatting.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target language" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTranslateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="gold" 
                        onClick={handleTranslate}
                        disabled={!selectedLanguage || isTranslating}
                        className="gap-2"
                      >
                        {isTranslating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="w-4 h-4" />
                            Translate
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* File Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingFile}
                  className="gap-2"
                >
                  {isParsingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4" />
                  )}
                  {uploadedFileName || 'Upload File'}
                </Button>
              </div>
            </div>
            
            <div className="mb-2 text-sm text-muted-foreground">
              Supported formats: PDF, DOCX, TXT • Use test scripts to try features
            </div>
            
            <Textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste your screenplay text here... The AI will automatically extract scenes, characters, locations, props, and more."
              className="min-h-[300px] bg-secondary/30 mb-4 font-mono text-sm"
              disabled={isGenerating}
            />
            
            {/* Progress Bar */}
            {isGenerating && (
              <div className="mb-4 p-4 rounded-lg border border-primary/30 bg-primary/5 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">{progressMessage}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>~{estimatedTime}s remaining</span>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{progress}% complete</span>
                  <span className="text-xs text-muted-foreground">
                    Analyzing {Math.ceil(scriptText.length / 1000)}k characters
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Button
                variant="gold"
                onClick={handleParse}
                disabled={isGenerating || !scriptText.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Analyze Script
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Parsed Results */}
        {(parsedData || existingScenes.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Scene List */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Scenes</h2>
                {parsedData && (
                  <Button variant="gold" size="sm" onClick={handleSaveToProject} disabled={isGenerating}>
                    Save Project
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Drag to reorder scenes</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={scenesToShow.map((s: any) => s.id || s.scene_number)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                    {scenesToShow.map((scene: any) => (
                      <SortableSceneItem
                        key={scene.id || scene.scene_number}
                        scene={scene}
                        isSelected={(currentScene?.id || currentScene?.scene_number) === (scene.id || scene.scene_number)}
                        onClick={() => setSelectedScene(scene)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {parsedData && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setParsedData(null);
                    setSelectedScene(null);
                    setScriptText('');
                    setUploadedFileName(null);
                    setHasUnsavedChanges(false);
                  }}
                >
                  Parse New Script
                </Button>
              )}
            </div>

            {/* Scene Details */}
            {currentScene && (
              <div className="lg:col-span-3 space-y-6">
                <div className="p-6 rounded-xl border border-border bg-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge variant="gold" className="mb-2">Scene {currentScene.scene_number}</Badge>
                      <h2 className="text-xl font-bold text-foreground">{currentScene.slugline}</h2>
                      <p className="text-muted-foreground mt-2">{currentScene.description}</p>
                    </div>
                    {currentScene.id && (
                      <Button
                        variant={hasUnsavedChanges ? 'gold' : 'outline'}
                        size="sm"
                        onClick={handleSaveSceneChanges}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{currentScene.location || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time of Day</p>
                      <p className="font-medium text-foreground capitalize">{currentScene.time_of_day?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium text-foreground">{currentScene.estimated_duration || 0} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Characters</p>
                      <p className="font-medium text-foreground">{currentScene.characters?.length || 0}</p>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="bg-secondary/50 p-1 flex-wrap">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="shots" className="gap-2">
                      <Clapperboard className="w-4 h-4 text-primary" />
                      <span className="hidden md:inline">Shots</span>
                    </TabsTrigger>
                    <TabsTrigger value="references" className="gap-2">
                      <Images className="w-4 h-4 text-cyan-400" />
                      <span className="hidden md:inline">References</span>
                    </TabsTrigger>
                    {departments.map((dept) => (
                      <TabsTrigger key={dept.id} value={dept.id} className="gap-2">
                        <dept.icon className={cn("w-4 h-4", dept.color)} />
                        <span className="hidden md:inline">{dept.name}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Characters - Editable */}
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">Characters</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(editingField === 'characters' ? null : 'characters')}
                            className="h-6 w-6 p-0"
                          >
                            {editingField === 'characters' ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.characters || []).map((char: string, i: number) => (
                            <Badge key={i} variant="outline" className="gap-1">
                              {char}
                              {editingField === 'characters' && (
                                <button onClick={() => removeItem('characters', i)} className="ml-1 hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {(!currentScene.characters || currentScene.characters.length === 0) && editingField !== 'characters' && (
                            <p className="text-sm text-muted-foreground">No characters</p>
                          )}
                        </div>
                        {editingField === 'characters' && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newItemValue}
                              onChange={(e) => setNewItemValue(e.target.value)}
                              placeholder="Add character..."
                              className="h-8 text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && addItem('characters')}
                            />
                            <Button size="sm" onClick={() => addItem('characters')} className="h-8">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Props - Editable */}
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">Props</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(editingField === 'props' ? null : 'props')}
                            className="h-6 w-6 p-0"
                          >
                            {editingField === 'props' ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.props || []).map((prop: string, i: number) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {prop}
                              {editingField === 'props' && (
                                <button onClick={() => removeItem('props', i)} className="ml-1 hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {(!currentScene.props || currentScene.props.length === 0) && editingField !== 'props' && (
                            <p className="text-sm text-muted-foreground">No props</p>
                          )}
                        </div>
                        {editingField === 'props' && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newItemValue}
                              onChange={(e) => setNewItemValue(e.target.value)}
                              placeholder="Add prop..."
                              className="h-8 text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && addItem('props')}
                            />
                            <Button size="sm" onClick={() => addItem('props')} className="h-8">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Costumes - Editable */}
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">Costumes</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingField(editingField === 'costumes' ? null : 'costumes')}
                            className="h-6 w-6 p-0"
                          >
                            {editingField === 'costumes' ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.costumes || []).map((costume: string, i: number) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {costume}
                              {editingField === 'costumes' && (
                                <button onClick={() => removeItem('costumes', i)} className="ml-1 hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {(!currentScene.costumes || currentScene.costumes.length === 0) && editingField !== 'costumes' && (
                            <p className="text-sm text-muted-foreground">No costumes specified</p>
                          )}
                        </div>
                        {editingField === 'costumes' && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newItemValue}
                              onChange={(e) => setNewItemValue(e.target.value)}
                              placeholder="Add costume..."
                              className="h-8 text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && addItem('costumes')}
                            />
                            <Button size="sm" onClick={() => addItem('costumes')} className="h-8">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* VFX - Editable */}
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">VFX</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateSceneField('vfx_required', !currentScene.vfx_required);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            {currentScene.vfx_required ? 'Remove VFX' : 'Add VFX'}
                          </Button>
                        </div>
                        {currentScene.vfx_required ? (
                          <div className="space-y-2">
                            <Badge variant={currentScene.vfx_complexity === 'extreme' ? 'destructive' : 'outline'}>
                              {currentScene.vfx_complexity?.toUpperCase() || 'REQUIRED'}
                            </Badge>
                            <Select
                              value={currentScene.vfx_complexity || 'low'}
                              onValueChange={(value) => updateSceneField('vfx_complexity', value)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Complexity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="extreme">Extreme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No VFX required</p>
                        )}
                      </div>

                      {/* Generate Concept Art Button */}
                      {((currentScene.props?.length > 0) || (currentScene.costumes?.length > 0) || (currentScene.characters?.length > 0)) && (
                        <div className="md:col-span-2 p-4 rounded-lg border border-primary/30 bg-primary/5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground flex items-center gap-2">
                                <Palette className="w-4 h-4 text-primary" />
                                Generate Concept Art
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Create AI concept art from scene elements
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                if (currentScene.id) {
                                  navigate(`/concept-art?scene=${currentScene.id}&project=${projectId}`);
                                } else {
                                  toast.error('Save scene to project first to generate concept art');
                                }
                              }}
                              className="gap-2"
                            >
                              <ImagePlus className="w-4 h-4" />
                              Generate from Scene
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {currentScene.props?.slice(0, 3).map((prop: string, i: number) => (
                              <Badge key={`prop-${i}`} variant="secondary" className="text-xs">Prop: {prop}</Badge>
                            ))}
                            {currentScene.costumes?.slice(0, 3).map((costume: string, i: number) => (
                              <Badge key={`costume-${i}`} variant="secondary" className="text-xs">Costume: {costume}</Badge>
                            ))}
                            {currentScene.characters?.slice(0, 3).map((char: string, i: number) => (
                              <Badge key={`char-${i}`} variant="outline" className="text-xs">Character: {char}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Shots Tab */}
                  <TabsContent value="shots" className="mt-4">
                    <ShotBreakdownPanel scene={currentScene} projectId={projectId} />
                  </TabsContent>

                  {/* References Tab */}
                  <TabsContent value="references" className="mt-4">
                    {currentScene.id ? (
                      <SceneReferenceUploader 
                        sceneId={currentScene.id} 
                        projectId={projectId || currentScene.project_id} 
                      />
                    ) : (
                      <div className="p-8 text-center border border-border rounded-lg bg-card">
                        <Images className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium text-foreground mb-2">Save Scene First</h3>
                        <p className="text-muted-foreground text-sm">
                          Save this scene to a project before adding reference images.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Direction Tab */}
                  <TabsContent value="direction" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Scene Overview</h4>
                        <p className="text-muted-foreground">{currentScene.description || 'No description available'}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <h4 className="font-medium text-foreground mb-2">Characters</h4>
                          <div className="flex flex-wrap gap-2">
                            {(currentScene.characters || []).map((char: string, i: number) => (
                              <Badge key={i} variant="outline">{char}</Badge>
                            ))}
                            {(!currentScene.characters || currentScene.characters.length === 0) && (
                              <p className="text-sm text-muted-foreground">No characters</p>
                            )}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <h4 className="font-medium text-foreground mb-2">Estimated Duration</h4>
                          <p className="text-lg font-semibold text-foreground">{currentScene.estimated_duration || 0} minutes</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Cinematography Tab */}
                  <TabsContent value="cinematography" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Camera Directions</h4>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.camera_directions || []).map((dir: string, i: number) => (
                            <Badge key={i} variant="outline">{dir}</Badge>
                          ))}
                          {(!currentScene.camera_directions || currentScene.camera_directions.length === 0) && (
                            <p className="text-sm text-muted-foreground">No camera directions specified</p>
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <h4 className="font-medium text-foreground mb-2">Location</h4>
                          <p className="text-foreground">{currentScene.location || 'N/A'}</p>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <h4 className="font-medium text-foreground mb-2">Time of Day</h4>
                          <p className="text-foreground capitalize">{currentScene.time_of_day?.replace('_', ' ') || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Art Department Tab */}
                  <TabsContent value="art" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Props Required</h4>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.props || []).map((prop: string, i: number) => (
                            <Badge key={i} variant="secondary">{prop}</Badge>
                          ))}
                          {(!currentScene.props || currentScene.props.length === 0) && (
                            <p className="text-sm text-muted-foreground">No props required</p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Set/Location</h4>
                        <p className="text-foreground">{currentScene.location || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">{currentScene.time_of_day?.replace('_', ' ') || 'day'} scene</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Costume Tab */}
                  <TabsContent value="costume" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Costume Requirements</h4>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.costumes || []).map((costume: string, i: number) => (
                            <Badge key={i} variant="secondary">{costume}</Badge>
                          ))}
                          {(!currentScene.costumes || currentScene.costumes.length === 0) && (
                            <p className="text-sm text-muted-foreground">No specific costumes listed</p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Characters Needing Costumes</h4>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.characters || []).map((char: string, i: number) => (
                            <Badge key={i} variant="outline">{char}</Badge>
                          ))}
                          {(!currentScene.characters || currentScene.characters.length === 0) && (
                            <p className="text-sm text-muted-foreground">No characters</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* VFX Tab */}
                  <TabsContent value="vfx" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">VFX Status</h4>
                        {currentScene.vfx_required ? (
                          <div className="space-y-2">
                            <Badge variant={currentScene.vfx_complexity === 'extreme' ? 'destructive' : currentScene.vfx_complexity === 'high' ? 'default' : 'outline'}>
                              {currentScene.vfx_complexity?.toUpperCase() || 'REQUIRED'}
                            </Badge>
                            <p className="text-sm text-muted-foreground">VFX work is required for this scene</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No VFX required for this scene</p>
                        )}
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Scene Environment</h4>
                        <p className="text-foreground">{currentScene.location || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground mt-1">Consider environmental VFX needs based on location</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Sound Tab */}
                  <TabsContent value="sound" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border border-border bg-card">
                        <h4 className="font-medium text-foreground mb-2">Sound Cues</h4>
                        <div className="flex flex-wrap gap-2">
                          {(currentScene.sound_cues || []).map((cue: string, i: number) => (
                            <Badge key={i} variant="outline">{cue}</Badge>
                          ))}
                          {(!currentScene.sound_cues || currentScene.sound_cues.length === 0) && (
                            <p className="text-sm text-muted-foreground">No specific sound cues</p>
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <h4 className="font-medium text-foreground mb-2">Location Audio</h4>
                          <p className="text-foreground">{currentScene.location || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground mt-1">Consider ambient sound for location</p>
                        </div>
                        <div className="p-4 rounded-lg border border-border bg-card">
                          <h4 className="font-medium text-foreground mb-2">Dialogue</h4>
                          <p className="text-foreground">{currentScene.characters?.length || 0} characters</p>
                          <p className="text-sm text-muted-foreground mt-1">Prepare for character dialogue recording</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
