import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, FileText, Loader2, CheckCircle, AlertCircle, 
  ChevronRight, ChevronLeft, Sparkles, Film
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFileParser } from '@/hooks/useFileParser';
import { parseScript, createScenes, ParsedScene, ParsedScript } from '@/lib/api';
import { toast } from 'sonner';

interface NewProjectWithScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (projectId: string) => void;
}

type Step = 'upload' | 'analyzing' | 'review' | 'creating' | 'complete';

export function NewProjectWithScriptDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: NewProjectWithScriptDialogProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  
  // Form state
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Parsing state
  const { parseFile, isParsingFile } = useFileParser();
  const [scriptContent, setScriptContent] = useState('');
  
  // Analysis state
  const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const resetDialog = useCallback(() => {
    setCurrentStep('upload');
    setProjectTitle('');
    setSelectedFile(null);
    setScriptContent('');
    setParsedScript(null);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setIsCreating(false);
    setCreatedProjectId(null);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill project title from filename if empty
      if (!projectTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setProjectTitle(nameWithoutExt);
      }
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile || !projectTitle.trim()) {
      toast.error('Please enter a project title and select a script file');
      return;
    }

    try {
      // Step 1: Parse the file
      setCurrentStep('analyzing');
      setAnalysisProgress(10);
      
      const content = await parseFile(selectedFile);
      setScriptContent(content);
      setAnalysisProgress(30);

      // Step 2: Analyze with AI
      setIsAnalyzing(true);
      setAnalysisProgress(50);
      
      const result = await parseScript(content);
      setParsedScript(result);
      
      setAnalysisProgress(100);
      setCurrentStep('review');
      
      toast.success(`Found ${result.scenes?.length || 0} scenes in the script`);
    } catch (error: any) {
      console.error('Error analyzing script:', error);
      toast.error(error.message || 'Failed to analyze script');
      setCurrentStep('upload');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateProject = async () => {
    if (!parsedScript) return;

    try {
      setIsCreating(true);
      setCurrentStep('creating');

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectTitle.trim(),
          description: `Auto-generated from script: ${selectedFile?.name}`,
          genre: parsedScript.genre?.toLowerCase() || 'other',
          status: 'pre_production',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create script version
      const { error: versionError } = await supabase
        .from('script_versions')
        .insert({
          project_id: project.id,
          version_number: 1,
          title: 'Initial Script',
          content: scriptContent,
        });

      if (versionError) {
        console.error('Version creation error:', versionError);
        // Continue anyway, scenes are more important
      }

      // Create scenes from parsed data
      if (parsedScript.scenes && parsedScript.scenes.length > 0) {
        await createScenes(project.id, parsedScript.scenes);
      }

      setCreatedProjectId(project.id);
      setCurrentStep('complete');
      toast.success('Project created with scene breakdown!');
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
      setCurrentStep('review');
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = () => {
    if (createdProjectId) {
      onSuccess(createdProjectId);
    }
    handleOpenChange(false);
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'upload': return 1;
      case 'analyzing': return 2;
      case 'review': return 3;
      case 'creating': return 4;
      case 'complete': return 4;
      default: return 1;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            New Project with Script Analysis
          </DialogTitle>
          <DialogDescription>
            Upload a script file to automatically analyze and break it down into scenes
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-3 border-b">
          {[
            { step: 1, label: 'Upload' },
            { step: 2, label: 'Analyze' },
            { step: 3, label: 'Review' },
            { step: 4, label: 'Create' },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                getStepNumber() >= item.step 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {getStepNumber() > item.step ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  item.step
                )}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${
                getStepNumber() >= item.step ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>
              {idx < 3 && (
                <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground hidden sm:inline" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto py-4">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-title">Project Title *</Label>
                <Input
                  id="project-title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Enter project title"
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Script File (PDF, DOCX, TXT) *</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="script-file"
                  />
                  <label htmlFor="script-file" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          PDF, DOCX, or TXT files supported
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {currentStep === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Analyzing Script...</h3>
                <p className="text-sm text-muted-foreground">
                  {isParsingFile ? 'Parsing file content...' : 'AI is extracting scene information...'}
                </p>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={analysisProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {analysisProgress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && parsedScript && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {parsedScript.scenes?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Scenes</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {new Set(parsedScript.scenes?.flatMap(s => s.characters) || []).size}
                      </p>
                      <p className="text-sm text-muted-foreground">Characters</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {new Set(parsedScript.scenes?.map(s => s.location) || []).size}
                      </p>
                      <p className="text-sm text-muted-foreground">Locations</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {parsedScript.scenes?.reduce((acc, s) => acc + (s.estimated_duration || 0), 0)} min
                      </p>
                      <p className="text-sm text-muted-foreground">Est. Duration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detected Info */}
              <div className="flex gap-2 flex-wrap">
                {parsedScript.title && (
                  <Badge variant="secondary">Title: {parsedScript.title}</Badge>
                )}
                {parsedScript.genre && (
                  <Badge variant="outline">Genre: {parsedScript.genre}</Badge>
                )}
              </div>

              {/* Scene List Preview */}
              <div>
                <Label className="mb-2 block">Scene Breakdown Preview</Label>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {parsedScript.scenes?.map((scene, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-2 bg-muted/50 rounded"
                      >
                        <Badge variant="outline" className="shrink-0">
                          {scene.scene_number || idx + 1}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {scene.slugline || 'No slugline'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {scene.description || 'No description'}
                          </p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {scene.characters?.slice(0, 3).map((char, cIdx) => (
                              <Badge key={cIdx} variant="secondary" className="text-xs">
                                {char}
                              </Badge>
                            ))}
                            {(scene.characters?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(scene.characters?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {scene.time_of_day || 'day'}
                        </div>
                      </div>
                    ))}
                    
                    {(!parsedScript.scenes || parsedScript.scenes.length === 0) && (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        No scenes detected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 4: Creating */}
          {currentStep === 'creating' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Creating Project...</h3>
                <p className="text-sm text-muted-foreground">
                  Setting up project and saving scene breakdown...
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Project Created Successfully!</h3>
                <p className="text-muted-foreground">
                  Your project "{projectTitle}" has been created with {parsedScript?.scenes?.length || 0} scenes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="border-t pt-4">
          {currentStep === 'upload' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadAndAnalyze}
                disabled={!selectedFile || !projectTitle.trim() || isParsingFile}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Script
              </Button>
            </>
          )}

          {currentStep === 'analyzing' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </Button>
          )}

          {currentStep === 'review' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('upload')}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={isCreating}
              >
                Create Project with {parsedScript?.scenes?.length || 0} Scenes
              </Button>
            </>
          )}

          {currentStep === 'creating' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </Button>
          )}

          {currentStep === 'complete' && (
            <Button onClick={handleComplete}>
              Go to Script Breakdown
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
