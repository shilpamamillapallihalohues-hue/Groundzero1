import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Box, Search, Eye, CheckCircle, AlertCircle, Clock, Loader2, Grid3X3, List
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { lazy, Suspense } from 'react';
const ModelViewerWithAnnotations = lazy(() => import('@/components/models/ModelViewerWithAnnotations').then(mod => ({ default: mod.ModelViewerWithAnnotations })));
import { toast } from 'sonner';

interface Asset3D {
  id: string;
  title: string;
  file_url: string | null;
  asset_type: string | null;
  department: string | null;
  status: string | null;
  thumbnail_url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  description: string | null;
}

export default function Director3DReview() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<Asset3D | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: assets, isLoading } = useQuery({
    queryKey: ['director-3d-assets', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('project_deliverables')
        .select('id, title, file_url, asset_type, department, status, thumbnail_url, created_at, metadata, description')
        .eq('project_id', selectedProjectId)
        .eq('asset_type', '3d_model')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Asset3D[];
    },
    enabled: !!selectedProjectId,
  });

  const filteredAssets = assets?.filter(asset => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      if (!asset.title?.toLowerCase().includes(search) && !asset.department?.toLowerCase().includes(search)) return false;
    }
    if (filterDepartment !== 'all' && asset.department !== filterDepartment) return false;
    if (filterStatus !== 'all' && asset.status !== filterStatus) return false;
    return true;
  });

  const approveMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase.from('project_deliverables').update({ status: 'approved' }).eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Asset approved'); queryClient.invalidateQueries({ queryKey: ['director-3d-assets'] }); },
    onError: () => toast.error('Failed to approve asset'),
  });

  const revisionMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase.from('project_deliverables').update({ status: 'revision_requested' }).eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Revision requested'); queryClient.invalidateQueries({ queryKey: ['director-3d-assets'] }); },
    onError: () => toast.error('Failed to request revision'),
  });

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'revision_requested': return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
      case 'in_review': return <Clock className="h-3.5 w-3.5 text-blue-500" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">Approved</Badge>;
      case 'revision_requested': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Revision</Badge>;
      case 'in_review': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">In Review</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
    }
  };

  const openViewer = (asset: Asset3D) => { setSelectedAsset(asset); setViewerOpen(true); };
  const departments = [...new Set(assets?.map(a => a.department).filter(Boolean) || [])];

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-cyan-500/10">
              <Box className="h-4 w-4 text-cyan-500" />
            </div>
            <h1 className="font-semibold text-sm">3D Asset Review</h1>
          </div>
          <DirectorProjectSelector />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Box className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select a project to review 3D assets</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Single unified header */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10">
            <Box className="h-4 w-4 text-cyan-500" />
          </div>
          <h1 className="font-semibold text-sm">3D Asset Review</h1>
          <Badge variant="secondary" className="text-[10px] h-5">{filteredAssets?.length || 0} assets</Badge>
        </div>
        
        <div className="flex-1" />
        
        <div className="relative w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Dept" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {departments.map(dept => (<SelectItem key={dept} value={dept!}>{dept}</SelectItem>))}
          </SelectContent>
        </Select>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="revision_requested">Revision</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-6 w-6 p-0" onClick={() => setViewMode('grid')}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-6 w-6 p-0" onClick={() => setViewMode('list')}>
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <DirectorProjectSelector />
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="aspect-square rounded-lg" />))}
          </div>
        ) : filteredAssets && filteredAssets.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="overflow-hidden hover:border-primary/30 transition-all group cursor-pointer">
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 relative flex items-center justify-center" onClick={() => openViewer(asset)}>
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
                    ) : (
                      <Box className="h-12 w-12 text-muted-foreground/30" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs">
                        <Eye className="h-3 w-3" /> View 3D
                      </Button>
                    </div>
                    <div className="absolute top-1.5 right-1.5">{getStatusIcon(asset.status)}</div>
                  </div>
                  <CardContent className="p-2.5">
                    <p className="font-medium text-xs truncate mb-1">{asset.title}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] h-4">{asset.department || 'N/A'}</Badge>
                      {getStatusBadge(asset.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-1.5">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="hover:border-primary/20 transition-all">
                  <CardContent className="p-2.5 flex items-center gap-3">
                    <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center shrink-0 cursor-pointer" onClick={() => openViewer(asset)}>
                      {asset.thumbnail_url ? (
                        <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <Box className="h-6 w-6 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{asset.title}</span>
                        <Badge variant="outline" className="text-[10px]">{asset.department || 'N/A'}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(asset.status)}
                        {getStatusBadge(asset.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openViewer(asset)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      {asset.status !== 'approved' && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => revisionMutation.mutate(asset.id)} disabled={revisionMutation.isPending}>Revise</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => approveMutation.mutate(asset.id)} disabled={approveMutation.isPending}>Approve</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <Box className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No 3D Assets Found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {searchQuery || filterDepartment !== 'all' || filterStatus !== 'all' ? 'Try adjusting your filters' : 'No 3D assets have been uploaded yet'}
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* 3D Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Box className="h-4 w-4 text-cyan-500" />
              {selectedAsset?.title}
              <Badge variant="outline" className="ml-1 text-[10px]">{selectedAsset?.department}</Badge>
              {selectedAsset && getStatusBadge(selectedAsset.status)}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 pt-2 overflow-hidden">
            {selectedAsset?.file_url && selectedProjectId && (
              <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <ModelViewerWithAnnotations
                  modelUrl={selectedAsset.file_url}
                  deliverableId={selectedAsset.id}
                  projectId={selectedProjectId}
                  modelName={selectedAsset.title}
                  height="100%"
                  canEdit={true}
                  onSendForApproval={() => { approveMutation.mutate(selectedAsset.id); setViewerOpen(false); }}
                />
              </Suspense>
            )}
          </div>
          {selectedAsset && selectedAsset.status !== 'approved' && (
            <div className="p-3 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { revisionMutation.mutate(selectedAsset.id); setViewerOpen(false); }} disabled={revisionMutation.isPending}>
                {revisionMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Request Revision
              </Button>
              <Button size="sm" onClick={() => { approveMutation.mutate(selectedAsset.id); setViewerOpen(false); }} disabled={approveMutation.isPending}>
                {approveMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Approve Asset
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
