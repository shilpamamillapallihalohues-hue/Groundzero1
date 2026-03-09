import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Layers, RefreshCw, Search, Grid, List, Check, Clock, AlertCircle, Image, User } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CONCEPT_TYPE_LABELS, ART_STYLE_LABELS } from '@/constants/conceptArtLabels';
import type { ConceptArt } from '@/types/conceptArt';
import { AssetActionMenu } from '@/components/director/AssetActionMenu';
import { EnhanceDialog } from '@/components/director/EnhanceDialog';
import { RepromptDialog } from '@/components/director/RepromptDialog';
import { AnnotationOverlay } from '@/components/director/AnnotationOverlay';

interface Project {
  id: string;
  title: string;
}

export default function ConceptWall() {
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedConcept, setSelectedConcept] = useState<ConceptArt | null>(null);
  const [enhanceConcept, setEnhanceConcept] = useState<ConceptArt | null>(null);
  const [repromptConcept, setRepromptConcept] = useState<ConceptArt | null>(null);
  const [annotateConcept, setAnnotateConcept] = useState<ConceptArt | null>(null);
  
  const queryClient = useQueryClient();
  const selectedProjectId = globalProjectId || '';
  const setSelectedProjectId = (id: string) => setGlobalProjectId(id || null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      if (!globalProjectId && data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const { data: conceptArts = [], isLoading, refetch } = useQuery({
    queryKey: ['concept-wall-arts', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .limit(200);
        
      if (error) throw error;
      return (data || []) as ConceptArt[];
    },
    enabled: !!selectedProjectId
  });

  const filteredConcepts = conceptArts.filter(concept => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        concept.title?.toLowerCase().includes(query) ||
        concept.description?.toLowerCase().includes(query) ||
        concept.concept_type?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (filterType !== 'all' && concept.concept_type !== filterType) return false;
    if (filterStyle !== 'all' && concept.art_style !== filterStyle) return false;
    if (filterStatus === 'approved' && !concept.is_approved) return false;
    if (filterStatus === 'pending' && concept.review_status !== 'pending_review') return false;
    if (filterStatus === 'draft' && (concept.is_approved || concept.review_status === 'pending_review')) return false;
    return true;
  });

  const getTypeLabel = (type: string | undefined | null): string => {
    if (!type) return 'Unknown';
    return CONCEPT_TYPE_LABELS[type as keyof typeof CONCEPT_TYPE_LABELS] || type || 'Unknown';
  };

  const getStyleLabel = (style: string | undefined | null): string => {
    if (!style) return 'Unknown';
    return ART_STYLE_LABELS[style as keyof typeof ART_STYLE_LABELS] || style || 'Unknown';
  };

  const handleConceptClick = (concept: ConceptArt) => {
    setSelectedConcept(concept);
  };

  const handleApprove = async (concept: ConceptArt) => {
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({ is_approved: !concept.is_approved })
        .eq('id', concept.id);
      if (error) throw error;
      toast.success(concept.is_approved ? 'Approval removed' : 'Concept approved');
      refetch();
      setSelectedConcept(prev => prev ? { ...prev, is_approved: !prev.is_approved } : null);
    } catch (error) {
      toast.error('Failed to update approval status');
    }
  };

  const handleDelete = async (concept: ConceptArt) => {
    const hasApproval = concept.is_approved || concept.director_approved;
    if (hasApproval && !confirm('This concept is approved. Are you sure you want to delete it?')) return;
    if (!hasApproval && !confirm('Delete this concept art?')) return;

    try {
      const { error } = await supabase.from('concept_arts').delete().eq('id', concept.id);
      if (error) throw error;
      toast.success('Concept deleted');
      refetch();
      if (selectedConcept?.id === concept.id) setSelectedConcept(null);
    } catch {
      toast.error('Failed to delete concept');
    }
  };

  const uniqueTypes = [...new Set(conceptArts.map(c => c.concept_type).filter(Boolean))];
  const uniqueStyles = [...new Set(conceptArts.map(c => c.art_style).filter(Boolean))];

  return (
    <MainLayout>
      <div className="p-3 md:p-6 space-y-4 md:space-y-5">
        {/* Header - stacked on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Concept Wall</h1>
              <p className="text-xs text-muted-foreground">Browse and manage all generated concept art</p>
            </div>
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-[200px] h-11 sm:h-9">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters - responsive layout */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search concepts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-11 sm:h-9" />
              </div>
              <div className="grid grid-cols-3 sm:flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-11 sm:h-9 sm:w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => <SelectItem key={type} value={type || 'unknown'}>{getTypeLabel(type)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStyle} onValueChange={setFilterStyle}>
                  <SelectTrigger className="h-11 sm:h-9 sm:w-[140px]"><SelectValue placeholder="Style" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Styles</SelectItem>
                    {uniqueStyles.map(style => <SelectItem key={style} value={style || 'unknown'}>{getStyleLabel(style)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-11 sm:h-9 sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 border rounded-lg p-0.5">
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => setViewMode('grid')}><Grid className="h-3.5 w-3.5" /></Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 sm:h-8 sm:w-8" onClick={() => setViewMode('list')}><List className="h-3.5 w-3.5" /></Button>
                </div>
                <Button variant="outline" size="icon" className="h-11 w-11 sm:h-9 sm:w-9" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {!selectedProjectId ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground"><AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Select a project to view concept art</p></CardContent></Card>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        ) : filteredConcepts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground"><Image className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No concept art found</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredConcepts.map(concept => (
              <div
                key={concept.id}
                className="group rounded-lg border overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-md relative"
                onClick={() => handleConceptClick(concept)}
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  {concept.image_url ? (
                    <img src={concept.image_url} alt={concept.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground/20" /></div>
                  )}
                  {concept.is_approved && (
                    <div className="absolute top-1.5 left-1.5">
                      <Badge variant="default" className="text-[9px] px-1.5">Approved</Badge>
                    </div>
                  )}
                  {concept.version > 1 && (
                    <div className="absolute bottom-1.5 left-1.5">
                      <Badge variant="secondary" className="text-[9px] px-1.5">v{concept.version}</Badge>
                    </div>
                  )}
                  {/* Action menu - visible on hover */}
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AssetActionMenu
                      onView={() => handleConceptClick(concept)}
                      onEnhance={() => { setEnhanceConcept(concept); }}
                      onReprompt={() => { setRepromptConcept(concept); }}
                      onAnnotate={() => { setAnnotateConcept(concept); }}
                      onApprove={() => handleApprove(concept)}
                      onDelete={() => handleDelete(concept)}
                      isApproved={!!concept.is_approved}
                    />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{concept.title}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-[9px]">{getTypeLabel(concept.concept_type)}</Badge>
                    <Badge variant="secondary" className="text-[9px]">{getStyleLabel(concept.art_style)}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedConcept} onOpenChange={(open) => { if (!open) setSelectedConcept(null); }}>
        <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
          {selectedConcept && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-muted rounded-lg overflow-hidden">
                {selectedConcept.image_url ? (
                  <img src={selectedConcept.image_url} alt={selectedConcept.title || ''} className="w-full h-auto max-h-[70vh] object-contain" />
                ) : (
                  <div className="h-64 flex items-center justify-center"><Image className="h-12 w-12 text-muted-foreground/20" /></div>
                )}
              </div>
              <div className="w-full md:w-64 space-y-3">
                <h3 className="font-semibold text-sm">{selectedConcept.title}</h3>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{getTypeLabel(selectedConcept.concept_type)}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{getStyleLabel(selectedConcept.art_style)}</Badge>
                </div>
                {selectedConcept.description && <p className="text-xs text-muted-foreground">{selectedConcept.description}</p>}
                {selectedConcept.generated_prompt && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Prompt</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedConcept.generated_prompt}</p>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 pt-2">
                  <Button size="sm" variant={selectedConcept.is_approved ? "secondary" : "default"} onClick={() => handleApprove(selectedConcept)} className="w-full">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {selectedConcept.is_approved ? 'Remove Approval' : 'Approve'}
                  </Button>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEnhanceConcept(selectedConcept); setSelectedConcept(null); }}>
                      Enhance
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setRepromptConcept(selectedConcept); setSelectedConcept(null); }}>
                      Reprompt
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setAnnotateConcept(selectedConcept); setSelectedConcept(null); }}>
                    Annotate
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { handleDelete(selectedConcept); setSelectedConcept(null); }}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhance Dialog */}
      {enhanceConcept && (
        <EnhanceDialog
          open={!!enhanceConcept}
          onOpenChange={(open) => { if (!open) setEnhanceConcept(null); }}
          entityType="concept"
          entity={enhanceConcept}
          onComplete={() => refetch()}
        />
      )}

      {/* Reprompt Dialog */}
      {repromptConcept && (
        <RepromptDialog
          open={!!repromptConcept}
          onOpenChange={(open) => { if (!open) setRepromptConcept(null); }}
          entityType="concept"
          entity={repromptConcept}
          onComplete={() => refetch()}
        />
      )}

      {/* Annotation Overlay */}
      {annotateConcept && (
        <AnnotationOverlay
          open={!!annotateConcept}
          onOpenChange={(open) => { if (!open) setAnnotateConcept(null); }}
          entityType="concept"
          entityId={annotateConcept.id}
          projectId={annotateConcept.project_id}
          imageUrl={annotateConcept.image_url}
          title={annotateConcept.title}
        />
      )}
    </MainLayout>
  );
}
