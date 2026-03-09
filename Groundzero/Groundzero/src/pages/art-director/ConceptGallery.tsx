import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Image, Search, MoreVertical, Download, Trash2, Check, XCircle, 
  Wand2, Eye, ChevronLeft, ChevronRight, ZoomIn, Grid3X3, Rows3, Send, MessageSquare, User
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';
import { toast } from 'sonner';

export default function ConceptGallery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const { sendApprovalRequest } = useNotificationRouting();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Gallery state
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<any>(null);

  // Get selected project name
  const selectedProject = (projects: any[] | undefined) => 
    projects?.find(p => p.id === selectedProjectId);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['ad-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch concept arts - ONLY those sent to approval (pending_approval or approved)
  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['ad-gallery', selectedProjectId, filterType],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      let query = supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', selectedProjectId)
        .in('status', ['pending_approval', 'approved', 'revision_requested'])
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('concept_type', filterType as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  // Filter by search
  const filteredConcepts = concepts?.filter(c => 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .delete()
        .eq('id', conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concept deleted');
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
      setDeleteDialogOpen(false);
      setConceptToDelete(null);
    },
    onError: () => toast.error('Failed to delete concept'),
  });

  // Approve mutation - forward to Director for final approval
  const approveMutation = useMutation({
    mutationFn: async (concept: any) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          art_director_approved: true, 
          review_status: 'pending_director',
          status: 'pending_approval'
        })
        .eq('id', concept.id);
      if (error) throw error;
      return concept;
    },
    onSuccess: (concept) => {
      toast.success('Approved and forwarded to Director');
      // Send notification to Director for final review
      sendApprovalRequest.mutate({
        title: 'Art Director Approved - Ready for Director Review',
        content: `Art Director has approved the concept art "${concept.title}". It's now ready for your final review.`,
        projectName: selectedProject(projects)?.title,
        entityType: 'Concept Art',
        entityName: concept.title,
        conceptId: concept.id,
      });
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
    },
    onError: () => toast.error('Failed to approve concept'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (concept: any) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          art_director_approved: false, 
          review_status: 'revision_requested',
          status: 'draft'
        })
        .eq('id', concept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concept sent for revision');
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
    },
    onError: () => toast.error('Failed to update concept'),
  });

  const handleDownload = (imageUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title}.png`;
    link.click();
  };

  const openGallery = (concept: any) => {
    setSelectedConcept(concept);
    setGalleryOpen(true);
  };

  const navigateGallery = (direction: 'prev' | 'next') => {
    if (!filteredConcepts || !selectedConcept) return;
    const currentIndex = filteredConcepts.findIndex(c => c.id === selectedConcept.id);
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + filteredConcepts.length) % filteredConcepts.length
      : (currentIndex + 1) % filteredConcepts.length;
    setSelectedConcept(filteredConcepts[newIndex]);
  };

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - No page title, just controls */}
      <div className="flex items-center justify-end">
        <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[280px]">
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
      </div>

      {selectedProjectId ? (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search concepts..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="character">Characters</SelectItem>
                    <SelectItem value="prop">Props</SelectItem>
                    <SelectItem value="environment">Environments</SelectItem>
                    <SelectItem value="costume">Costumes</SelectItem>
                    <SelectItem value="vehicle">Vehicles</SelectItem>
                    <SelectItem value="creature">Creatures</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <Rows3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery */}
          {conceptsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filteredConcepts && filteredConcepts.length > 0 ? (
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-3"
            }>
              {filteredConcepts.map((concept) => (
                <Card 
                  key={concept.id} 
                  className={`overflow-hidden group ${viewMode === 'list' ? 'flex' : ''}`}
                >
                  {/* Image */}
                  <div 
                    className={`relative cursor-pointer ${viewMode === 'list' ? 'w-40 h-28' : 'aspect-square'}`}
                    onClick={() => openGallery(concept)}
                  >
                    {concept.image_url ? (
                      <img 
                        src={concept.image_url} 
                        alt={concept.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Image className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      {concept.status === 'pending_approval' && (
                        <Badge className="text-[9px] bg-amber-500">Pending</Badge>
                      )}
                      {concept.status === 'approved' && (
                        <Badge className="text-[9px] bg-emerald-500">Approved</Badge>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <CardContent className={`p-3 ${viewMode === 'list' ? 'flex-1 flex items-center justify-between' : ''}`}>
                    <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}>
                      <div>
                        <h4 className="font-medium text-sm truncate">{concept.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {concept.concept_type}
                          </Badge>
                          {concept.art_director_approved && (
                            <Badge className="text-xs bg-green-500">AD ✓</Badge>
                          )}
                          {concept.director_approved && (
                            <Badge className="text-xs bg-blue-500">Dir ✓</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openGallery(concept)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {concept.image_url && (
                          <DropdownMenuItem onClick={() => handleDownload(concept.image_url, concept.title)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        )}
                        {concept.concept_type === 'character' && concept.image_url && (
                          <DropdownMenuItem 
                            onClick={() => navigate(`/art-director/facial-turnaround?referenceUrl=${encodeURIComponent(concept.image_url)}&name=${encodeURIComponent(concept.title)}`)}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Create Facial Turnaround
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {!concept.art_director_approved && (
                          <DropdownMenuItem onClick={() => approveMutation.mutate(concept)}>
                            <Check className="h-4 w-4 mr-2" />
                            Approve & Forward to Director
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => rejectMutation.mutate(concept)}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Request Revision
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setConceptToDelete(concept);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Concepts in Gallery</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Concepts sent for approval will appear here'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
            <p className="text-muted-foreground">Choose a project to view concept gallery.</p>
          </CardContent>
        </Card>
      )}

      {/* Gallery Modal with Annotations */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConcept?.title}
              {selectedConcept?.director_approved && (
                <Badge className="bg-blue-500 text-xs">Director Approved</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Image with Annotation Markers */}
            <div className="lg:col-span-2 relative">
              {selectedConcept?.image_url ? (
                <div className="relative">
                  <img 
                    src={selectedConcept.image_url} 
                    alt={selectedConcept.title}
                    className="w-full max-h-[60vh] object-contain rounded-lg"
                  />
                  {/* Render director annotations on the image */}
                  {(() => {
                    try {
                      const desc = selectedConcept?.description || '';
                      if (desc.includes('[[ANNOTATIONS]]')) {
                        const annotationsJson = desc.split('[[ANNOTATIONS]]')[1];
                        const annotations = JSON.parse(annotationsJson || '[]');
                        return annotations.map((ann: { id: string; x: number; y: number; text: string }, idx: number) => (
                          <div
                            key={ann.id}
                            className="absolute group"
                            style={{ 
                              left: `${ann.x}%`, 
                              top: `${ann.y}%`, 
                              transform: 'translate(-50%, -50%)' 
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer border-2 border-white">
                              {idx + 1}
                            </div>
                            <div className="absolute left-8 top-0 bg-popover border shadow-lg rounded px-2 py-1 text-xs max-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              {ann.text}
                            </div>
                          </div>
                        ));
                      }
                      return null;
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              ) : (
                <div className="w-full h-64 bg-muted flex items-center justify-center rounded-lg">
                  <Image className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              {/* Navigation */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={() => navigateGallery('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => navigateGallery('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Side Panel - Annotations List & Details */}
            <div className="space-y-4">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedConcept?.concept_type}</Badge>
                <Badge variant="outline">{selectedConcept?.art_style}</Badge>
                {selectedConcept?.art_director_approved && (
                  <Badge className="bg-green-500 text-xs">AD ✓</Badge>
                )}
                {selectedConcept?.director_approved && (
                  <Badge className="bg-blue-500 text-xs">Dir ✓</Badge>
                )}
              </div>

              {/* Director Annotations */}
              {(() => {
                try {
                  const desc = selectedConcept?.description || '';
                  if (desc.includes('[[ANNOTATIONS]]')) {
                    const annotationsJson = desc.split('[[ANNOTATIONS]]')[1];
                    const annotations = JSON.parse(annotationsJson || '[]');
                    if (annotations.length > 0) {
                      return (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            Director Annotations ({annotations.length})
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {annotations.map((ann: { id: string; text: string }, idx: number) => (
                              <div key={ann.id} className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 text-foreground">{ann.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                } catch {
                  return null;
                }
              })()}

              {/* Description (without annotations) */}
              {selectedConcept?.description && !selectedConcept.description.includes('[[ANNOTATIONS]]') && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedConcept.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {selectedConcept?.image_url && (
                  <Button variant="outline" size="sm" onClick={() => handleDownload(selectedConcept.image_url, selectedConcept.title)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                {!selectedConcept?.art_director_approved && (
                  <Button size="sm" onClick={() => {
                    approveMutation.mutate(selectedConcept);
                    setGalleryOpen(false);
                  }}>
                    <Check className="h-4 w-4 mr-2" />
                    Approve & Forward
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Concept</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{conceptToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate(conceptToDelete?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
