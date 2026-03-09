import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Film, FileText, Upload, Clapperboard, Video, Layers, CheckCircle2,
  AlertCircle, ChevronRight, FolderOpen, Palette, Brain, Sparkles,
  Clock, ImagePlus, PenLine, Activity,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useFileParser } from '@/hooks/useFileParser';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';
import { VersionMergeReview } from '@/components/screenplay/VersionMergeReview';
import { format } from 'date-fns';

export function DirectorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const { parseFile, isParsingFile } = useFileParser();
  const { profile } = useAuth();

  const [versionUploadOpen, setVersionUploadOpen] = useState(false);
  const [versionTitle, setVersionTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedContent, setParsedContent] = useState<string | null>(null);

  const { data: projects, isLoading } = useAssignedProjects();

  const { data: scriptVersions } = useQuery({
    queryKey: ['director-versions', selectedProjectId],
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
    queryKey: ['director-scene-count', selectedProjectId],
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
    queryKey: ['director-shot-count', selectedProjectId],
    queryFn: async (): Promise<number> => {
      if (!selectedProjectId) return 0;
      const { data: projectScenes } = await supabase
        .from('scenes')
        .select('id')
        .eq('project_id', selectedProjectId);
      if (!projectScenes || projectScenes.length === 0) return 0;
      const sceneIds = projectScenes.map(s => s.id);
      const { count } = await supabase
        .from('storyboards')
        .select('id', { count: 'exact' })
        .in('scene_id', sceneIds);
      return count || 0;
    },
    enabled: !!selectedProjectId,
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const isComplete = selectedProject?.status === 'approved' || selectedProject?.status === 'completed';

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['director-recent-activity', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const activities: { icon: string; text: string; time: string }[] = [];
      
      const { data: recentConcepts } = await supabase
        .from('concept_arts')
        .select('title, created_at')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .limit(3);
      recentConcepts?.forEach(c => activities.push({
        icon: 'concept',
        text: `Concept art "${c.title}" created`,
        time: c.created_at,
      }));

      const { data: recentVersions } = await supabase
        .from('script_versions')
        .select('title, version_number, created_at')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .limit(2);
      recentVersions?.forEach(v => activities.push({
        icon: 'script',
        text: `Script v${v.version_number} "${v.title}" uploaded`,
        time: v.created_at,
      }));

      const { data: recentScenes } = await supabase
        .from('scenes')
        .select('slugline, created_at')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .limit(2);
      recentScenes?.forEach(s => activities.push({
        icon: 'scene',
        text: `Scene "${s.slugline}" added`,
        time: s.created_at,
      }));

      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
    },
    enabled: !!selectedProjectId,
  });

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
      toast.success('Version merged successfully! New scenes added to screenplay.');
      queryClient.invalidateQueries({ queryKey: ['director-versions'] });
      queryClient.invalidateQueries({ queryKey: ['director-scene-count'] });
      setVersionUploadOpen(false);
      setVersionTitle('');
      setSelectedFile(null);
      setAnalysisResult(null);
      setParsedContent(null);
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
      <div className="space-y-8 p-4 md:p-8">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-5 space-y-4 pb-20 md:pb-5">
      {/* Project Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 backdrop-blur-sm px-3 py-2">
        <div className="flex items-center gap-2">
          <Select value={selectedProjectId || ''} onValueChange={(id) => setSelectedProjectId(id)}>
            <SelectTrigger className="w-[170px] h-8 text-xs font-medium border-border/80 bg-background">
              <Film className="h-3.5 w-3.5 mr-1.5 text-primary" />
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
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs px-2.5" onClick={() => navigate('/director/script')}>
            <Sparkles className="h-3 w-3" />
            Free Flow
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs px-2.5" onClick={() => navigate('/director/references')} disabled={!selectedProjectId}>
            <Palette className="h-3 w-3" />
            References
          </Button>
          <Button size="sm" className="gap-1.5 h-7 text-xs px-2.5" onClick={() => selectedProjectId && setVersionUploadOpen(true)} disabled={!selectedProjectId}>
            <Upload className="h-3 w-3" />
            Upload Version
          </Button>
        </div>
      </div>

      {/* Welcome Strip */}
      <div className="relative overflow-hidden rounded-lg border border-border/50 bg-gradient-to-r from-card via-card to-muted/30 px-4 py-3">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center gap-3">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <div>
            <p className="text-[11px] text-muted-foreground">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : new Date().getHours() < 21 ? 'Good evening' : 'Burning the midnight oil'}, Creator</p>
            <p className="text-sm font-semibold text-foreground tracking-tight">One Vision. One Direction.</p>
          </div>
        </div>
      </div>

      {selectedProject ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Metrics + Workflow */}
          <div className="lg:col-span-2 space-y-4">
            {/* Section: Project Metrics */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Metrics</h2>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="group rounded-lg border border-border/50 bg-card hover:border-primary/30 transition-all duration-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded bg-primary/10">
                      <Clapperboard className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Scenes</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-foreground">{sceneCount}</p>
                </div>

                <div className="group rounded-lg border border-border/50 bg-card hover:border-purple-500/30 transition-all duration-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 rounded bg-purple-500/10">
                      <Video className="h-3 w-3 text-purple-500" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Shots</span>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-foreground">{shotCount}</p>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <div className="group rounded-lg border border-border/50 bg-card hover:border-amber-500/30 transition-all duration-200 p-3 cursor-pointer">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="p-1 rounded bg-amber-500/10">
                          <Layers className="h-3 w-3 text-amber-500" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Versions</span>
                      </div>
                      <p className="text-xl font-bold tracking-tight text-foreground">{scriptVersions?.length || 0}</p>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2.5" align="start">
                    <p className="text-xs font-semibold mb-1.5 px-1">Script Versions</p>
                    {scriptVersions && scriptVersions.length > 0 ? (
                      <div className="space-y-0.5 max-h-[180px] overflow-auto">
                        {scriptVersions.map(v => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs transition-colors"
                            onClick={() => navigate('/director/script')}
                          >
                            <span className="font-medium">v{v.version_number} – {v.title}</span>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {v.approval_status === 'approved' ? '✓' : v.approval_status === 'pending_review' ? '⏳' : '—'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground px-2 py-1.5">No versions yet</p>
                    )}
                    <div className="border-t border-border/50 mt-1.5 pt-1.5">
                      <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => navigate('/director/script')}>
                        <FileText className="h-3 w-3 mr-1.5" /> Open Editor
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className={`group rounded-lg border border-border/50 bg-card transition-all duration-200 p-3 ${isComplete ? 'hover:border-emerald-500/30' : 'hover:border-amber-500/30'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`p-1 rounded ${isComplete ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      {isComplete ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-amber-500" />}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                  </div>
                  <Badge variant={isComplete ? 'default' : 'secondary'} className="text-[11px] px-2 py-0.5 font-medium">
                    {isComplete ? 'Complete' : 'In Progress'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Section: Director Workflow */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clapperboard className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Director Workflow</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 cursor-pointer hover:border-amber-500/30 hover:bg-muted/30 transition-all duration-200" onClick={() => navigate('/director/preprod/concept-review')}>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/15 transition-colors shrink-0">
                    <Palette className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-medium text-foreground">Concept Review</h3>
                    <p className="text-[11px] text-muted-foreground truncate">Review pending concept arts</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 cursor-pointer hover:border-purple-500/30 hover:bg-muted/30 transition-all duration-200" onClick={() => navigate('/director/scene-shot-review')}>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/15 transition-colors shrink-0">
                    <Video className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-medium text-foreground">Scene & Shot Review</h3>
                    <p className="text-[11px] text-muted-foreground truncate">Review scenes and shot breakdowns</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-all duration-200" onClick={() => navigate('/director/preprod/script-review')}>
                  <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-medium text-foreground">Script Review</h3>
                    <p className="text-[11px] text-muted-foreground truncate">Review script versions & notes</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 cursor-pointer hover:border-emerald-500/30 hover:bg-muted/30 transition-all duration-200" onClick={() => navigate('/preprod/script/story-analysis')}>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/15 transition-colors shrink-0">
                    <Brain className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                      Story Analysis
                      <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">AI-powered narrative insights</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </div>
            </div>

            {/* Project Summary */}
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/80 p-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Film className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Current Project</p>
                <p className="text-sm font-semibold text-foreground truncate">{selectedProject.title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground">Last Updated</p>
                <p className="text-[11px] font-medium text-foreground">{format(new Date(selectedProject.updated_at || selectedProject.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
            </div>
            <div className="rounded-lg border border-border/50 bg-card divide-y divide-border/40">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className="p-1 rounded bg-muted mt-0.5 shrink-0">
                      {activity.icon === 'concept' && <ImagePlus className="h-3 w-3 text-amber-500" />}
                      {activity.icon === 'script' && <PenLine className="h-3 w-3 text-primary" />}
                      {activity.icon === 'scene' && <Clapperboard className="h-3 w-3 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground leading-snug truncate">{activity.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(activity.time), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-center">
                  <Clock className="h-4 w-4 text-muted-foreground/40 mx-auto mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-dashed border border-border/60">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-sm mb-1">No Project Selected</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Select a project from the toolbar above
            </p>
          </CardContent>
        </Card>
      )}

      {/* Version Upload Dialog with Analysis */}
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
