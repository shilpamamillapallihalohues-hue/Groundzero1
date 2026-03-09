import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, CheckCircle2, XCircle, ZoomIn, Filter, Clock, Film, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { ConceptReviewPopup } from '@/components/director/ConceptReviewPopup';
import { useProjectContext } from '@/contexts/ProjectContext';

interface ConceptArt {
  id: string;
  title: string;
  image_url: string | null;
  description: string | null;
  concept_type: string;
  art_style: string;
  status: string;
  is_approved: boolean;
  created_at: string;
  scenes?: { scene_number: string; slugline: string; estimated_duration?: number } | null;
}

export default function DirectorConceptArt() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  const [selectedConcept, setSelectedConcept] = useState<ConceptArt | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conceptArts, isLoading } = useQuery({
    queryKey: ['director-concept-art', selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('concept_arts')
        .select(`
          id, title, image_url, description, concept_type, art_style, status, is_approved, created_at,
          scenes (
            scene_number,
            slugline,
            estimated_duration
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true
  });

  // Get unique categories
  const categories = useMemo(() => {
    if (!conceptArts) return [];
    const types = new Set(conceptArts.map(c => c.concept_type));
    return Array.from(types);
  }, [conceptArts]);

  // Calculate scene presence and runtime for each concept
  const conceptsWithMetrics = useMemo(() => {
    if (!conceptArts) return [];
    
    // Group by type to calculate scene presence
    const typeSceneCount: Record<string, number> = {};
    conceptArts.forEach(c => {
      if (c.scenes) {
        typeSceneCount[c.concept_type] = (typeSceneCount[c.concept_type] || 0) + 1;
      }
    });

    return conceptArts.map(c => ({
      ...c,
      scene_presence: typeSceneCount[c.concept_type] || 0,
      runtime_seconds: c.scenes?.estimated_duration || 0
    }));
  }, [conceptArts]);

  const approveMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ status: 'approved', is_approved: true, director_approved: true })
        .eq('id', conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concept approved');
      queryClient.invalidateQueries({ queryKey: ['director-concept-art'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  // Apply filters
  const filteredConcepts = useMemo(() => {
    let result = conceptsWithMetrics;

    // Status filter
    if (filter === 'pending') {
      result = result.filter(c => !c.is_approved);
    } else if (filter === 'approved') {
      result = result.filter(c => c.is_approved);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(c => c.concept_type === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.scenes?.slugline?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [conceptsWithMetrics, filter, categoryFilter, searchQuery]);

  const pendingCount = conceptArts?.filter(c => !c.is_approved).length || 0;

  const formatRuntime = (seconds: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header - Controls Only */}
      <div className="flex items-center justify-end gap-3">
        <DirectorProjectSelector />
        <Badge variant={pendingCount > 0 ? 'destructive' : 'secondary'} className="text-xs">
          {pendingCount} pending
        </Badge>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-shrink-0">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6">All ({conceptArts?.length || 0})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs h-6">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs h-6">Approved ({(conceptArts?.length || 0) - pendingCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-8">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input 
            placeholder="Search concepts..." 
            className="h-8 pl-7 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredConcepts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredConcepts.map((art) => (
            <Card 
              key={art.id} 
              className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => { setSelectedConcept(art); setViewerOpen(true); }}
            >
              <div className="relative">
                {art.image_url ? (
                  <img 
                    src={art.image_url} 
                    alt={art.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <Palette className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
                <Badge 
                  className="absolute top-2 right-2"
                  variant={art.is_approved ? 'default' : 'secondary'}
                >
                  {art.is_approved ? 'Approved' : art.status || 'pending'}
                </Badge>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium truncate">{art.title}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {art.description || 'No description'}
                </p>
                
                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                  <Badge variant="outline">{art.concept_type}</Badge>
                  <Badge variant="outline">{art.art_style}</Badge>
                </div>

                {/* Scene presence and runtime */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
                  {art.scenes && (
                    <span className="flex items-center gap-1">
                      <Film className="h-3 w-3" />
                      Scene {art.scenes.scene_number}
                    </span>
                  )}
                  {art.runtime_seconds > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRuntime(art.runtime_seconds)}
                    </span>
                  )}
                </div>

                {!art.is_approved && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); approveMutation.mutate(art.id); }}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); setSelectedConcept(art); setViewerOpen(true); }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No concept art found</h3>
            <p className="text-sm text-muted-foreground">
              {!selectedProjectId ? 'Select a project to view concepts' : 
               filter === 'pending' ? 'No concepts pending review' : 'Concept art will appear here for review.'}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Concept Review Popup */}
      <ConceptReviewPopup 
        concept={selectedConcept}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
