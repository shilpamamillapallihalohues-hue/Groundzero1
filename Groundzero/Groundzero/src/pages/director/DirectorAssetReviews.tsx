import { useState } from 'react';
// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, CheckCircle2, Eye, XCircle, Layers, MessageSquare, Box } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function DirectorAssetReviews() {
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const { data: allApprovals, isLoading } = useQuery({
    queryKey: ['director-asset-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          id, status, approval_level, comments, created_at,
          production_assets (id, name, category, thumbnail_url, status)
        `)
        .eq('approval_level', 'director')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const { error } = await supabase
        .from('approvals')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', approvalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset approved');
      queryClient.invalidateQueries({ queryKey: ['director-asset-reviews'] });
      setViewerOpen(false);
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ approvalId, notes }: { approvalId: string; notes: string }) => {
      const { error } = await supabase
        .from('approvals')
        .update({ status: 'rejected', comments: notes })
        .eq('id', approvalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Revision requested');
      queryClient.invalidateQueries({ queryKey: ['director-asset-reviews'] });
      setFeedbackOpen(false);
      setFeedback('');
    },
    onError: () => toast.error('Failed to request revision'),
  });

  const filteredApprovals = allApprovals?.filter((a: any) => {
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'approved') return a.status === 'approved';
    return true;
  }) || [];

  const pendingCount = allApprovals?.filter((a: any) => a.status === 'pending').length || 0;

  const is3DAsset = (asset: any) => {
    if (!asset) return false;
    const category = asset.category?.toLowerCase() || '';
    return category.includes('3d') || category.includes('model') || category === 'character' || category === 'prop' || category === 'environment';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-green-500" />
            Asset Reviews
          </h1>
          <p className="text-muted-foreground">Review production assets including 3D models</p>
        </div>
        <Badge variant={pendingCount > 0 ? 'destructive' : 'secondary'} className="text-lg px-4 py-2">
          {pendingCount} pending
        </Badge>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({allApprovals?.length || 0})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({(allApprovals?.length || 0) - pendingCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Assets Grid */}
      {filteredApprovals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApprovals.map((approval: any) => (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {is3DAsset(approval.production_assets) ? (
                      <Box className="h-5 w-5 text-purple-500" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                    {approval.production_assets?.name || 'Unknown Asset'}
                  </CardTitle>
                  <Badge variant={approval.status === 'approved' ? 'default' : 'secondary'}>
                    {approval.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {approval.production_assets?.thumbnail_url ? (
                    <img 
                      src={approval.production_assets.thumbnail_url} 
                      alt={approval.production_assets.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : is3DAsset(approval.production_assets) ? (
                    <Box className="h-12 w-12 text-muted-foreground" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{approval.production_assets?.category || 'Unknown'}</Badge>
                  {is3DAsset(approval.production_assets) && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500">3D Model</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {approval.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => approveMutation.mutate(approval.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => { setSelectedApproval(approval); setFeedbackOpen(true); }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => { setSelectedApproval(approval); setViewerOpen(true); }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">
              {filter === 'pending' ? 'No assets pending review' : 'No assets found'}
            </h3>
            <p className="text-sm text-muted-foreground">All assets have been reviewed.</p>
          </CardContent>
        </Card>
      )}

      {/* Asset Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {is3DAsset(selectedApproval?.production_assets) ? (
                <Box className="h-5 w-5 text-purple-500" />
              ) : (
                <Package className="h-5 w-5" />
              )}
              {selectedApproval?.production_assets?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Viewer */}
            <div className="lg:col-span-2 h-[50vh] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {selectedApproval?.production_assets?.thumbnail_url ? (
                <img 
                  src={selectedApproval.production_assets.thumbnail_url}
                  alt={selectedApproval.production_assets.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Layers className="h-16 w-16 text-muted-foreground" />
              )}
            </div>

            {/* Details Panel */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={selectedApproval?.status === 'approved' ? 'default' : 'secondary'}>
                  {selectedApproval?.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p>{selectedApproval?.production_assets?.category}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Approval Level</p>
                <p className="capitalize">{selectedApproval?.approval_level}</p>
              </div>

              {selectedApproval?.comments && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedApproval.comments}</p>
                </div>
              )}

              {selectedApproval?.status === 'pending' && (
                <div className="pt-4 space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => selectedApproval && approveMutation.mutate(selectedApproval.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Asset
                  </Button>
                  <Button 
                    variant="destructive"
                    className="w-full"
                    onClick={() => { setFeedbackOpen(true); setViewerOpen(false); }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide feedback for "{selectedApproval?.production_assets?.name}"
            </p>
            <Textarea
              placeholder="Describe what changes are needed..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => selectedApproval && rejectMutation.mutate({ approvalId: selectedApproval.id, notes: feedback })}
              disabled={rejectMutation.isPending}
            >
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}