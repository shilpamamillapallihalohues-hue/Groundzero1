import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Presentation, Film, Clock, CheckCircle, XCircle, 
  Eye, MessageSquare, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useProjectContext } from '@/contexts/ProjectContext';
import { format } from 'date-fns';
import { FullscreenPresentationReview } from '@/components/director/FullscreenPresentationReview';

interface Presentation {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  status: string;
  director_notes: string | null;
  annotations: any[];
  slide_images: string[];
  current_slide: number;
  created_at: string;
  reviewed_at: string | null;
  uploaded_by: string | null;
}

export default function DirectorPresentationReview() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Fetch only assigned projects for director
  const { data: projects } = useQuery({
    queryKey: ['director-assigned-projects-presentations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const client = supabase as any;
      const { data: assignments } = await client
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = (assignments || []).map((a: any) => a.project_id);

      if (projectIds.length === 0) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select first project
  useMemo(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  // Fetch presentations
  const { data: presentations, isLoading } = useQuery({
    queryKey: ['director-presentations', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('asset_review_presentations')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Presentation[];
    },
    enabled: !!selectedProjectId
  });

  // Filter presentations
  const filteredPresentations = useMemo(() => {
    if (!presentations) return [];
    if (filter === 'pending') return presentations.filter(p => p.status === 'pending_review');
    if (filter === 'reviewed') return presentations.filter(p => p.status !== 'pending_review');
    return presentations;
  }, [presentations, filter]);

  const pendingCount = presentations?.filter(p => p.status === 'pending_review').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'revision_requested':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Revisions</Badge>;
      case 'pending_review':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenReview = (pres: Presentation) => {
    setSelectedPresentation(pres);
    setReviewOpen(true);
  };

  if (isLoading && selectedProjectId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="flex-1 sm:w-[200px] sm:flex-none">
              <Film className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedProjectId && pendingCount > 0 && (
            <Badge variant="destructive" className="shrink-0">
              {pendingCount}
            </Badge>
          )}
        </div>

        {selectedProjectId && (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="pending" className="text-xs sm:text-sm">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="reviewed" className="text-xs sm:text-sm">Reviewed</TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Content */}
      {selectedProjectId ? (
        filteredPresentations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredPresentations.map(pres => (
              <Card 
                key={pres.id} 
                className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
                onClick={() => handleOpenReview(pres)}
              >
                <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Presentation className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
                      <CardTitle className="text-sm sm:text-base truncate">{pres.title}</CardTitle>
                    </div>
                    {getStatusBadge(pres.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-xs text-muted-foreground truncate">
                    {pres.file_name}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(pres.created_at), 'MMM d')}
                    </span>
                    
                    {pres.annotations && pres.annotations.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <MessageSquare className="h-3 w-3" />
                        {pres.annotations.length}
                      </div>
                    )}
                  </div>

                  <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs sm:text-sm">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Review
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold mb-2">
                {filter === 'pending' ? 'No presentations pending review' : 'No presentations found'}
              </h3>
              <p className="text-sm">
                {filter === 'pending' 
                  ? 'All presentations have been reviewed' 
                  : 'Asset review presentations will appear here'
                }
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a project to review presentations</p>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Review */}
      <FullscreenPresentationReview
        presentation={selectedPresentation}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </div>
  );
}
