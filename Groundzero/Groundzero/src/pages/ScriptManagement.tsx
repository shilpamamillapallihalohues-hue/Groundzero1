import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFileParser } from '@/hooks/useFileParser';
import { toast } from 'sonner';
import { 
  FileText,
  Lock,
  Unlock,
  History,
  Upload,
  Download,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Brain,
  Target,
  ListChecks,
  BookOpen,
  ArrowRight,
  Loader2,
  X,
  FolderPlus,
  FilePlus,
  FolderOpen,
  Languages
} from 'lucide-react';
import { ScriptTranslator } from '@/components/script/ScriptTranslator';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ScriptManagement = () => {
  const { role, canApprove } = useProductionRole();
  const [isLocked, setIsLocked] = useState(true);
  
  // Upload flow states
  const [uploadStep, setUploadStep] = useState<'idle' | 'parsing' | 'choose' | 'details'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedContent, setParsedContent] = useState<string>('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [uploadChoice, setUploadChoice] = useState<'new' | 'existing'>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { parseFile, isParsingFile } = useFileParser();

  // Fetch script versions from database
  const { data: scriptVersions, isLoading: versionsLoading } = useQuery({
    queryKey: ['script-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('script_versions')
        .select('*, profiles:created_by(full_name)')
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch scenes from database
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['scenes-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all projects for selection
  const { data: allProjects } = useQuery({
    queryKey: ['all-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Get user's profile ID
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Upload mutation - now handles both new project and existing project
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      content, 
      file,
      title, 
      summary,
      isNewProject,
      projectId,
      newProjectTitle 
    }: { 
      content: string;
      file: File;
      title: string; 
      summary: string;
      isNewProject: boolean;
      projectId?: string;
      newProjectTitle?: string;
    }) => {
      if (!profile?.id) throw new Error('User profile not found');

      let targetProjectId: string;

      if (isNewProject) {
        // Create new project
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            title: newProjectTitle || title,
            status: 'active'
          })
          .select('id')
          .single();
        
        if (projectError) throw projectError;
        targetProjectId = newProject.id;
      } else {
        if (!projectId) throw new Error('No project selected');
        targetProjectId = projectId;
      }

      // Get the next version number for the selected project
      const { data: existingVersions } = await supabase
        .from('script_versions')
        .select('version_number')
        .eq('project_id', targetProjectId)
        .order('version_number', { ascending: false })
        .limit(1);
      
      const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `script_v${nextVersion}_${Date.now()}.${fileExt}`;
      const filePath = `scripts/${targetProjectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('script-files')
        .upload(filePath, file);

      let fileUrl = null;
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('script-files')
          .getPublicUrl(filePath);
        fileUrl = urlData?.publicUrl;
      }

      // Insert script version record
      const { data, error } = await supabase
        .from('script_versions')
        .insert({
          project_id: targetProjectId,
          version_number: nextVersion,
          title: title || `Script Version ${nextVersion}`,
          content: content,
          changes_summary: summary || (isNewProject ? 'Initial script upload' : 'New version uploaded'),
          created_by: profile.id,
          file_url: fileUrl
        })
        .select()
        .single();

      if (error) throw error;
      return { scriptVersion: data, projectId: targetProjectId, isNewProject };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['script-versions'] });
      queryClient.invalidateQueries({ queryKey: ['all-projects'] });
      toast.success(data.isNewProject 
        ? 'New project created with script!' 
        : 'Script version added successfully!'
      );
      resetUploadState();
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    }
  });

  // Reset all upload state
  const resetUploadState = () => {
    setUploadStep('idle');
    setSelectedFile(null);
    setParsedContent('');
    setScriptTitle('');
    setChangesSummary('');
    setUploadChoice('new');
    setSelectedProjectId('');
    setNewProjectTitle('');
  };

  // File handling - now starts parsing immediately
  const handleFileSelect = async (file: File) => {
    const validTypes = ['.pdf', '.doc', '.docx', '.txt', '.fdx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(ext)) {
      toast.error('Invalid file type. Please upload PDF, DOC, DOCX, TXT, or FDX files.');
      return;
    }
    
    setSelectedFile(file);
    setScriptTitle(file.name.replace(/\.[^/.]+$/, ''));
    setNewProjectTitle(file.name.replace(/\.[^/.]+$/, ''));
    setUploadStep('parsing');
    
    try {
      const content = await parseFile(file);
      setParsedContent(content);
      setUploadStep('choose');
    } catch (error: any) {
      toast.error(`Failed to parse file: ${error.message}`);
      resetUploadState();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleProceedToDetails = () => {
    if (uploadChoice === 'existing' && !selectedProjectId) {
      toast.error('Please select a project');
      return;
    }
    setUploadStep('details');
  };

  const handleUploadSubmit = () => {
    if (!selectedFile || !parsedContent) return;
    
    uploadMutation.mutate({
      content: parsedContent,
      file: selectedFile,
      title: scriptTitle,
      summary: changesSummary,
      isNewProject: uploadChoice === 'new',
      projectId: selectedProjectId,
      newProjectTitle: newProjectTitle
    });
  };

  // Access: Producer, Director, Script Team
  const hasEditAccess = ['producer', 'director', 'super_user'].includes(role);

  // Story Framework Tools
  const storyTools = [
    {
      title: 'Story Analysis',
      description: 'AI-powered structural analysis against narrative frameworks',
      icon: Brain,
      href: '/preprod/script/story-analysis',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Story Frameworks',
      description: 'Configure Save the Cat, Hero\'s Journey, and more',
      icon: BookOpen,
      href: '/preprod/script/story-frameworks',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Continuity Assist',
      description: 'Scene-to-scene continuity and story completion',
      icon: ListChecks,
      href: '/preprod/script/continuity-assist',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ];

  const isLoading = versionsLoading || scenesLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Script Management</h1>
            <p className="text-muted-foreground">Manage script versions, scene breakdown, and story structure</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isLocked ? 'destructive' : 'default'} className="flex items-center gap-1">
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {isLocked ? 'Script Locked' : 'Script Unlocked'}
            </Badge>
            {hasEditAccess && (
              <Button 
                variant="outline" 
                onClick={() => setIsLocked(!isLocked)}
              >
                {isLocked ? 'Unlock Script' : 'Lock Script'}
              </Button>
            )}
          </div>
        </div>

        {/* Story Framework Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {storyTools.map(tool => (
            <Card 
              key={tool.title}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(tool.href)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                    <tool.icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="versions" className="w-full">
          <TabsList>
            <TabsTrigger value="versions">Script Versions</TabsTrigger>
            <TabsTrigger value="breakdown">Scene Breakdown</TabsTrigger>
            <TabsTrigger value="translation">
              <Languages className="h-4 w-4 mr-1" />
              Translation
            </TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="space-y-4">
            {/* Upload Area - Always Visible */}
            {hasEditAccess && !isLocked && (
              <Card>
                <CardContent className="pt-6">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold mb-2">
                      {isDragging ? 'Drop your script here' : 'Upload Script'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag & drop or click to browse. Supports PDF, DOC, DOCX, TXT
                    </p>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      id="script-upload" 
                      accept=".pdf,.doc,.docx,.txt,.fdx"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Version History
                  </CardTitle>
                  <CardDescription>Track all script revisions</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {scriptVersions && scriptVersions.length > 0 ? (
                  <div className="space-y-3">
                    {scriptVersions.map((version, index) => (
                      <div key={version.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">v{version.version_number}</span>
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">Current</Badge>
                              )}
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> v{version.version_number}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{version.title || version.changes_summary}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              By {(version.profiles as any)?.full_name || 'Unknown'} • {format(new Date(version.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <Button variant="ghost" size="sm">
                            <History className="w-4 h-4 mr-2" />
                            Compare
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No script versions yet</p>
                    <p className="text-sm mt-1">Upload your first script to get started</p>
                    {hasEditAccess && !isLocked && (
                      <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Script
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scene Breakdown</CardTitle>
                <CardDescription>Scenes extracted from current script version</CardDescription>
              </CardHeader>
              <CardContent>
                {scenes && scenes.length > 0 ? (
                  <div className="space-y-3">
                    {scenes.map((scene) => (
                      <div key={scene.id} className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Scene {scene.scene_number}: {scene.slugline || 'Untitled'}</span>
                          <Badge variant="outline">{(scene.props?.length || 0) + (scene.characters?.length || 0)} assets</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{scene.description || 'No description'}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(scene.characters || []).slice(0, 5).map((char: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{char}</Badge>
                          ))}
                          {(scene.characters?.length || 0) > 5 && (
                            <Badge variant="outline" className="text-xs">+{scene.characters.length - 5} more</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No scenes extracted yet</p>
                    <p className="text-sm mt-1">Upload and parse a script to see the breakdown</p>
                    <Button className="mt-4" onClick={() => navigate('/preprod/script/ai-breakdown')}>
                      <Brain className="w-4 h-4 mr-2" />
                      AI Breakdown
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="translation" className="space-y-4">
            {scriptVersions && scriptVersions.length > 0 ? (
              <ScriptTranslator projectId={scriptVersions[0].project_id} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Languages className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No script to translate</p>
                  <p className="text-sm mt-1">Upload a script first to use translation features</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Script Notes</CardTitle>
                <CardDescription>Director and producer notes on the script</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No notes added yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Multi-step Upload Dialog */}
      <Dialog open={uploadStep !== 'idle'} onOpenChange={(open) => !open && resetUploadState()}>
        <DialogContent className="sm:max-w-lg">
          {/* Step 1: Parsing */}
          {uploadStep === 'parsing' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Script
                </DialogTitle>
                <DialogDescription>
                  Parsing your script file...
                </DialogDescription>
              </DialogHeader>
              <div className="py-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">
                  Reading and analyzing <span className="font-medium">{selectedFile?.name}</span>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Choose new project or existing */}
          {uploadStep === 'choose' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Script Analyzed Successfully
                </DialogTitle>
                <DialogDescription>
                  Choose where to save this script
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {parsedContent.length.toLocaleString()} characters
                      </p>
                    </div>
                  </div>
                )}

                <RadioGroup value={uploadChoice} onValueChange={(v) => setUploadChoice(v as 'new' | 'existing')}>
                  <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${uploadChoice === 'new' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`}
                    onClick={() => setUploadChoice('new')}>
                    <RadioGroupItem value="new" id="new-project" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="new-project" className="flex items-center gap-2 cursor-pointer font-medium">
                        <FolderPlus className="h-4 w-4" />
                        Create New Project
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start a new project with this script
                      </p>
                      {uploadChoice === 'new' && (
                        <div className="mt-3">
                          <Input 
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            placeholder="Enter project title..."
                            className="bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${uploadChoice === 'existing' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`}
                    onClick={() => setUploadChoice('existing')}>
                    <RadioGroupItem value="existing" id="existing-project" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="existing-project" className="flex items-center gap-2 cursor-pointer font-medium">
                        <FilePlus className="h-4 w-4" />
                        Add to Existing Project
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add as a new version to an existing project
                      </p>
                      {uploadChoice === 'existing' && (
                        <div className="mt-3">
                          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select a project..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allProjects?.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    {project.title}
                                  </div>
                                </SelectItem>
                              ))}
                              {(!allProjects || allProjects.length === 0) && (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  No existing projects found
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetUploadState}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleProceedToDetails}
                  disabled={(uploadChoice === 'new' && !newProjectTitle) || (uploadChoice === 'existing' && !selectedProjectId)}
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 3: Script details */}
          {uploadStep === 'details' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Script Details
                </DialogTitle>
                <DialogDescription>
                  {uploadChoice === 'new' 
                    ? `Creating new project: ${newProjectTitle}` 
                    : `Adding to: ${allProjects?.find(p => p.id === selectedProjectId)?.title}`
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="script-title">Script Title</Label>
                  <Input 
                    id="script-title"
                    value={scriptTitle}
                    onChange={(e) => setScriptTitle(e.target.value)}
                    placeholder="e.g., Final Draft, Revision 2"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="changes-summary">
                    {uploadChoice === 'new' ? 'Description' : 'Changes Summary'}
                  </Label>
                  <Textarea 
                    id="changes-summary"
                    value={changesSummary}
                    onChange={(e) => setChangesSummary(e.target.value)}
                    placeholder={uploadChoice === 'new' 
                      ? "Describe this script..." 
                      : "What's changed in this version..."
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setUploadStep('choose')}>
                  Back
                </Button>
                <Button 
                  onClick={handleUploadSubmit}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadChoice === 'new' ? 'Creating Project...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      {uploadChoice === 'new' ? (
                        <>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Create Project
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Add Version
                        </>
                      )}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ScriptManagement;
