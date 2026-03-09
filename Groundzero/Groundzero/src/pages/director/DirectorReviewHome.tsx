import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Film,
  Clapperboard,
  ChevronRight,
  FolderOpen,
  Palette,
  Clock,
  CheckCircle2,
  AlertCircle,
  StickyNote,
  Columns,
  AlertTriangle,
  Download,
  FileText,
  Image,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '@/contexts/ProjectContext';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';
import { DirectorPersonalNotes } from '@/components/director/DirectorPersonalNotes';
import { ConceptCompareView } from '@/components/director/ConceptCompareView';
import { DirectorPriorityQueue } from '@/components/director/DirectorPriorityQueue';
import { DownloadApprovedPack } from '@/components/director/DownloadApprovedPack';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

export default function DirectorReviewHome() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('overview');

  // Clear project selection on mount
  useEffect(() => {
    setSelectedProjectId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch only projects assigned to the director
  const { data: projects, isLoading } = useAssignedProjects();

  // Auto-select if only one project
  useEffect(() => {
    if (projects?.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  // Concept art stats for selected project
  const { data: conceptStats } = useQuery({
    queryKey: ['director-concept-stats', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return { pending: 0, approved: 0, total: 0, priority: 0 };
      
      const { data } = await supabase
        .from('concept_arts')
        .select('id, review_status, is_approved, is_priority')
        .eq('project_id', selectedProjectId);

      const concepts = data || [];
      const pending = concepts.filter(c => c.review_status === 'pending' || c.review_status === 'pending_review').length;
      const approved = concepts.filter(c => c.review_status === 'approved' || c.is_approved).length;
      const priority = concepts.filter(c => c.is_priority).length;

      return { pending, approved, total: concepts.length, priority };
    },
    enabled: !!selectedProjectId,
  });

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const hasOnlyOneProject = projects?.length === 1;

  // Auto-select single project
  if (hasOnlyOneProject && !selectedProjectId && projects?.[0]) {
    setSelectedProjectId(projects[0].id);
  }

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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <WelcomeQuote tagline="One Vision, One Direction" />
      
      {/* Header - stacked on mobile */}
      <div className="flex flex-col gap-3 pb-3 md:pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-2.5 rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-foreground">Director's Hub</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Creative Command Center</p>
          </div>
        </div>

        {/* Controls row - full width on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select 
            value={selectedProjectId || ''} 
            onValueChange={(id) => setSelectedProjectId(id)}
            disabled={hasOnlyOneProject}
          >
            <SelectTrigger className={`w-full sm:w-[200px] h-11 sm:h-9 ${hasOnlyOneProject ? 'opacity-70' : ''}`}>
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-1.5 h-11 sm:h-9"
              onClick={() => navigate('/director/script')}
            >
              <FileText className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span>Script</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-1.5 h-11 sm:h-9"
              onClick={() => navigate('/director/references')}
            >
              <Image className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span>References</span>
            </Button>
          </div>
        </div>
      </div>

      {selectedProject ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 h-11 sm:h-9">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="priority" className="gap-1.5 text-xs relative">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Priority</span>
              {conceptStats?.priority ? (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                  {conceptStats.priority}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5 text-xs">
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs">
              <StickyNote className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Concept Art Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="shadow-professional">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-amber-100">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold">{conceptStats?.pending || 0}</p>
                </CardContent>
              </Card>

              <Card className="shadow-professional">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-emerald-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Approved</span>
                  </div>
                  <p className="text-2xl font-bold">{conceptStats?.approved || 0}</p>
                </CardContent>
              </Card>

              <Card className="shadow-professional">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-red-100">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Priority</span>
                  </div>
                  <p className="text-2xl font-bold">{conceptStats?.priority || 0}</p>
                </CardContent>
              </Card>

              <Card className="shadow-professional">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-blue-100">
                      <Palette className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{conceptStats?.total || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Action - Concept Review */}
            <Card 
              className="shadow-professional cursor-pointer hover:shadow-professional-lg hover:border-primary/30 transition-all"
              onClick={() => navigate('/director/preprod/concept-review')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100">
                    <Palette className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Concept Review</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {conceptStats?.pending || 0} concepts pending your review
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

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
          </TabsContent>

          <TabsContent value="priority">
            <DirectorPriorityQueue projectId={selectedProjectId!} />
          </TabsContent>

          <TabsContent value="compare">
            <ConceptCompareView projectId={selectedProjectId!} />
          </TabsContent>

          <TabsContent value="notes">
            <DirectorPersonalNotes projectId={selectedProjectId!} />
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <DownloadApprovedPack 
              projectId={selectedProjectId!} 
              projectTitle={selectedProject.title}
            />
            
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed border-2 shadow-professional">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Select a project from the dropdown to access your director tools
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
