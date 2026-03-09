import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, CheckCircle2, AlertCircle, Plus, Upload, Film,
  Sparkles, Layers, FolderOpen, Brain, Video, Clapperboard,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useFileParser } from '@/hooks/useFileParser';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { NewProjectWithScriptDialog } from '@/components/supervisor/NewProjectWithScriptDialog';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';
import { VersionMergeReview } from '@/components/screenplay/VersionMergeReview';

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const { parseFile, isParsingFile } = useFileParser();
  const { profile } = useAuth();

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [versionUploadOpen, setVersionUploadOpen] = useState(false);
  const [versionTitle, setVersionTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedContent, setParsedContent] = useState<string | null>(null);
  
  const [hasCleared, setHasCleared] = useState(false);
  if (!hasCleared) {
    setSelectedProjectId(null);
    setHasCleared(true);
  }

  const { data: projects, isLoading } = useAssignedProjects();

  const { data: scriptVersions } = useQuery({
    queryKey: ['supervisor-versions', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('script_versions')
        .select('id, version_number, title, created_at, content, approval_status')
        .eq('project_id', selectedProjectId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  const { data: sceneCount } = useQuery({
    queryKey: ['supervisor-scene-count', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return 0;
      const { count } = await supabase
        .from('scenes')
        .select('id', { count: 'exact' })
        .eq('project_id', selectedProjectId);
      return count || 0;
    },
    enabled: !!selectedProjectId,
  });

  const { data: shotCount } = useQuery<number>({
    queryKey: ['supervisor-shot-count', selectedProjectId],
    queryFn: async (): Promise<number> => {
      if (!selectedProjectId) return 0;
      // @ts-ignore - deep type instantiation workaround
      const { count } = await supabase
        .from('storyboards')
        .select('id', { count: 'exact' })
        .eq('project_id', selectedProjectId);
      return count || 0;
    },
    enabled: !!selectedProjectId,
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const isComplete = selectedProject?.status === 'approved' || selectedProject?.status === 'completed';

  const handleNewProjectSuccess = (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: ['assigned-projects'] });
    setSelectedProjectId(projectId);
    navigate('/supervisor/script-breakdown');
  };

  // Step 1: Parse file and analyze
  const handleUploadAndAnalyze = async () => {
    if (!selectedProjectId || !selectedFile) return;
    try {
      setIsAnalyzing(true);
      const content = await parseFile(selectedFile);
      setParsedContent(content);

      const existingContent = scriptVersions?.[0]?.content || '';

      const res = await supabase.functions.invoke('analyze-script-version', {
        body: {
          newContent: content,
          existingContent,
          projectTitle: selectedProject?.title || '',
        },
      });

      if (res.error) throw new Error(res.error.message);
      setAnalysisResult(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Merge approved scenes
  const mergeMutation = useMutation({
    mutationFn: async (selectedScenes: any[]) => {
      if (!selectedProjectId || !parsedContent) throw new Error('Missing data');

      const nextVersion = (scriptVersions?.[0]?.version_number || 0) + 1;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', profile?.user_id || '')
        .single();

      const { data: newVersion, error: versionError } = await supabase
        .from('script_versions')
        .insert({
          project_id: selectedProjectId,
          version_number: nextVersion,
          title: versionTitle.trim() || `Version ${nextVersion}`,
          content: parsedContent,
          created_by: profileData?.id || null,
          changes_summary: analysisResult?.summary || 'New version uploaded',
          approval_status: 'pending_review',
        })
        .select('id')
        .single();

      if (versionError) throw versionError;

      const newScenes = selectedScenes.filter(s => s.status === 'new');
      const { count: existingCount } = await supabase
        .from('scenes')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', selectedProjectId);
      
      for (let i = 0; i < newScenes.length; i++) {
        const scene = newScenes[i];
        const sceneNum = String((existingCount || 0) + i + 1);
        await supabase.from('scenes').insert({
          project_id: selectedProjectId,
          slugline: scene.slugline || `Scene ${sceneNum}`,
          scene_number: sceneNum,
          description: scene.description,
          characters: scene.characters || [],
        });
      }

      return newVersion;
    },
    onSuccess: () => {
      toast.success('Version merged successfully! New scenes added.');
      queryClient.invalidateQueries({ queryKey: ['supervisor-versions'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-scene-count'] });
      handleCloseDialog();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to merge version'),
  });

  const handleCloseDialog = () => {
    setVersionUploadOpen(false);
    setVersionTitle('');
    setSelectedFile(null);
    setAnalysisResult(null);
    setParsedContent(null);
    setIsAnalyzing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      <WelcomeQuote tagline="Start Shaping Your Story" />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Script Supervisor</h1>
            <p className="text-sm text-muted-foreground">Manage scripts, scenes & shots</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedProjectId || ''} onValueChange={(id) => setSelectedProjectId(id)}>
            <SelectTrigger className="w-[180px] md:w-[200px]">
              <Film className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">New</span>
                <ChevronDown className="h-3 w-3 ml-1 hidden md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setNewProjectOpen(true)} className="cursor-pointer">
                <Film className="h-4 w-4 mr-2" />
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => selectedProjectId && setVersionUploadOpen(true)} 
                disabled={!selectedProjectId}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Version Upload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selectedProject ? (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-professional">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-[hsl(var(--info))]/10">
                    <Clapperboard className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
                  </div>
                  <span className="text-xs text-muted-foreground">Scenes</span>
                </div>
                <p className="text-2xl font-bold">{sceneCount}</p>
              </CardContent>
            </Card>

            <Card className="shadow-professional">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-purple-100">
                    <Video className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Shots</span>
                </div>
                <p className="text-2xl font-bold">{shotCount}</p>
              </CardContent>
            </Card>

            {/* Versions card with hover popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Card className="shadow-professional cursor-pointer hover:border-primary/30 transition-all">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded bg-[hsl(var(--warning))]/10">
                        <Layers className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                      </div>
                      <span className="text-xs text-muted-foreground">Versions</span>
                    </div>
                    <p className="text-2xl font-bold">{scriptVersions?.length || 0}</p>
                  </CardContent>
                </Card>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <p className="text-xs font-semibold mb-2 px-2">Script Versions</p>
                {scriptVersions && scriptVersions.length > 0 ? (
                  <div className="space-y-1 max-h-[200px] overflow-auto">
                    {scriptVersions.map(v => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                        onClick={() => navigate('/supervisor/script-editor')}
                      >
                        <span className="font-medium">v{v.version_number} – {v.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {v.approval_status === 'approved' ? '✓' : v.approval_status === 'pending_review' ? '⏳' : '—'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground px-2 py-2">No versions yet</p>
                )}
                <div className="border-t mt-2 pt-2 px-2">
                  <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => navigate('/supervisor/script-editor')}>
                    <FileText className="h-3 w-3 mr-1.5" /> Open Screenplay Editor
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Card className={`shadow-professional ${isComplete ? 'bg-[hsl(var(--success))]/5' : 'bg-[hsl(var(--warning))]/5'}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${isComplete ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {isComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                  </div>
                  <span className="text-xs text-muted-foreground">Status</span>
                </div>
                <Badge variant={isComplete ? 'default' : 'secondary'} className="text-xs">
                  {isComplete ? 'Complete' : 'In Progress'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="shadow-professional cursor-pointer hover:shadow-professional-lg hover:border-primary/30 transition-all" onClick={() => navigate('/supervisor/script-breakdown')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[hsl(var(--info))]/10"><FileText className="h-5 w-5 text-[hsl(var(--info))]" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Script Breakdown</h3>
                    <p className="text-xs text-muted-foreground truncate">Manage scenes, locations & characters</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-professional cursor-pointer hover:shadow-professional-lg hover:border-purple-300 transition-all" onClick={() => navigate('/supervisor/script-analysis')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-100"><Brain className="h-5 w-5 text-purple-600" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm flex items-center gap-1.5">
                      Script Analysis <Sparkles className="h-3 w-3 text-[hsl(var(--warning))]" />
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">AI-powered story & character analysis</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-professional cursor-pointer hover:shadow-professional-lg hover:border-amber-300 transition-all" onClick={() => navigate('/supervisor/shots')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100"><Video className="h-5 w-5 text-amber-600" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Shot Management</h3>
                    <p className="text-xs text-muted-foreground truncate">AI breakdown or manual shot count</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-professional cursor-pointer hover:shadow-professional-lg hover:border-emerald-300 transition-all" onClick={() => setVersionUploadOpen(true)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100"><Upload className="h-5 w-5 text-emerald-600" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Upload Version</h3>
                    <p className="text-xs text-muted-foreground truncate">Add new script revision</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-professional cursor-pointer hover:shadow-professional-lg hover:border-blue-300 transition-all" onClick={() => navigate('/supervisor/creative-context')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100"><FileText className="h-5 w-5 text-blue-600" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Context Upload</h3>
                    <p className="text-xs text-muted-foreground truncate">Upload story lore & character docs</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Info */}
          <Card className="shadow-professional bg-muted/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Film className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Current Project</p>
                  <p className="font-medium text-sm truncate">{selectedProject.title}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {new Date(selectedProject.created_at).toLocaleDateString()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-2 shadow-professional">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              {projects?.length ? 'Select a project from the dropdown' : 'Create your first project to begin'}
            </p>
            <Button onClick={() => setNewProjectOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <NewProjectWithScriptDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onSuccess={handleNewProjectSuccess}
      />

      <Dialog open={versionUploadOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload & Analyze Version
            </DialogTitle>
          </DialogHeader>

          {!analysisResult && !isAnalyzing ? (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Version Title</label>
                <Input
                  value={versionTitle}
                  onChange={(e) => setVersionTitle(e.target.value)}
                  placeholder={`Version ${(scriptVersions?.[0]?.version_number || 0) + 1}`}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Script File</label>
                <Input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              {scriptVersions && scriptVersions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Will compare against: v{scriptVersions[0].version_number} – {scriptVersions[0].title}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button
                  onClick={handleUploadAndAnalyze}
                  disabled={!selectedFile || isParsingFile}
                >
                  {isParsingFile ? 'Parsing...' : 'Analyze & Compare'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <VersionMergeReview
              analysis={analysisResult}
              isAnalyzing={isAnalyzing}
              onApproveAndMerge={(scenes) => mergeMutation.mutate(scenes)}
              isMerging={mergeMutation.isPending}
              versionTitle={versionTitle || `Version ${(scriptVersions?.[0]?.version_number || 0) + 1}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
