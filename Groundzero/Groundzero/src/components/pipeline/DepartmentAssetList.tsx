import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Clock,
  ArrowRight,
  Upload,
  Play,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePipelineRouting, AssetDepartmentStatus } from '@/hooks/usePipelineRouting';
import { useAuth } from '@/hooks/useAuth';
import { ASSET_CATEGORY_LABELS } from '@/types/pipeline';

interface DepartmentAssetListProps {
  projectId?: string;
  departmentName?: string;
  showAssignment?: boolean;
  showInternalApproval?: boolean;
  showDirectorApproval?: boolean;
}

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  internal_review: 'Internal Review',
  director_review: 'Director Review',
  client_review: 'Client Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
};

const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  internal_review: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  director_review: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  client_review: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  changes_requested: 'bg-destructive/10 text-destructive border-destructive/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export function DepartmentAssetList({
  projectId,
  departmentName,
  showAssignment = false,
  showInternalApproval = false,
  showDirectorApproval = false,
}: DepartmentAssetListProps) {
  const { profile } = useAuth();
  const {
    departmentAssets,
    isLoadingDeptAssets,
    getDepartmentOrder,
    assignArtist,
    updateStatus,
    submitForInternalReview,
    internalApproval,
    directorApproval,
    isApproving,
  } = usePipelineRouting(projectId);

  const [selectedAsset, setSelectedAsset] = useState<AssetDepartmentStatus | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalDialog, setApprovalDialog] = useState<'internal' | 'director' | null>(null);

  // Fetch artists in the department for assignment
  const { data: departmentArtists } = useQuery({
    queryKey: ['department-artists', profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('department_id', profile.department_id)
        .eq('role', 'artist');
      return data || [];
    },
    enabled: showAssignment && !!profile?.department_id,
  });

  const handleAssignArtist = (assetStatusId: string, artistId: string) => {
    assignArtist({ assetStatusId, artistId });
  };

  const handleStartWork = (assetStatusId: string) => {
    updateStatus({ assetStatusId, status: 'in_progress', startWork: true });
  };

  const handleSubmitForReview = (assetStatusId: string) => {
    submitForInternalReview(assetStatusId);
  };

  const handleInternalApproval = (approved: boolean) => {
    if (!selectedAsset) return;
    
    internalApproval({
      assetStatusId: selectedAsset.id,
      assetId: selectedAsset.asset_id,
      projectId: selectedAsset.project_id,
      department: selectedAsset.current_department,
      approved,
      notes: approvalNotes || undefined,
    });
    
    setApprovalDialog(null);
    setSelectedAsset(null);
    setApprovalNotes('');
  };

  const handleDirectorApproval = (approved: boolean) => {
    if (!selectedAsset) return;
    
    directorApproval({
      assetId: selectedAsset.asset_id,
      projectId: selectedAsset.project_id,
      department: selectedAsset.current_department,
      approved,
      notes: approvalNotes || undefined,
    });
    
    setApprovalDialog(null);
    setSelectedAsset(null);
    setApprovalNotes('');
  };

  if (isLoadingDeptAssets) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const assets = departmentAssets || [];
  const filteredAssets = departmentName 
    ? assets.filter(a => a.current_department === departmentName)
    : assets;

  // Group by workflow status
  const groupedAssets = {
    not_started: filteredAssets.filter(a => a.workflow_status === 'not_started'),
    in_progress: filteredAssets.filter(a => a.workflow_status === 'in_progress'),
    internal_review: filteredAssets.filter(a => a.workflow_status === 'internal_review'),
    director_review: filteredAssets.filter(a => a.workflow_status === 'director_review'),
    changes_requested: filteredAssets.filter(a => a.workflow_status === 'changes_requested'),
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(groupedAssets).map(([status, items]) => (
          <Card key={status} className={items.length > 0 ? WORKFLOW_STATUS_COLORS[status] : ''}>
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-xs text-muted-foreground">{WORKFLOW_STATUS_LABELS[status]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Assets in {departmentName || 'Department'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No assets currently in this department</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssets.map((assetStatus) => {
                const asset = assetStatus.asset;
                const departmentOrder = asset ? getDepartmentOrder(asset.category) : [];
                const currentIndex = assetStatus.department_order_index;
                const progress = departmentOrder.length > 0 
                  ? ((currentIndex + 1) / departmentOrder.length) * 100 
                  : 0;

                return (
                  <div
                    key={assetStatus.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            {asset?.thumbnail_url ? (
                              <img 
                                src={asset.thumbnail_url} 
                                alt={asset.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Layers className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{asset?.name || 'Unknown Asset'}</h4>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline">
                                {asset?.category ? ASSET_CATEGORY_LABELS[asset.category as keyof typeof ASSET_CATEGORY_LABELS] || asset.category : 'Unknown'}
                              </Badge>
                              <Badge className={WORKFLOW_STATUS_COLORS[assetStatus.workflow_status]}>
                                {WORKFLOW_STATUS_LABELS[assetStatus.workflow_status]}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Pipeline Progress */}
                        <div className="mt-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>Pipeline Progress</span>
                            <span className="ml-auto">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            {departmentOrder.map((dept, idx) => (
                              <span 
                                key={dept}
                                className={`flex items-center ${idx <= currentIndex ? 'text-primary' : 'text-muted-foreground'}`}
                              >
                                {dept}
                                {idx < departmentOrder.length - 1 && (
                                  <ArrowRight className="h-3 w-3 mx-1" />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Assigned Artist */}
                        {assetStatus.assigned_artist && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Assigned to:</span>
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {assetStatus.assigned_artist.full_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">
                              {assetStatus.assigned_artist.full_name}
                            </span>
                          </div>
                        )}

                        {/* Timestamps */}
                        {assetStatus.started_at && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Started: {new Date(assetStatus.started_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {/* Assignment (for HOD/Production Manager) */}
                        {showAssignment && !assetStatus.assigned_artist_id && (
                          <Select
                            onValueChange={(artistId) => handleAssignArtist(assetStatus.id, artistId)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Assign Artist" />
                            </SelectTrigger>
                            <SelectContent>
                              {departmentArtists?.map((artist) => (
                                <SelectItem key={artist.id} value={artist.id}>
                                  {artist.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Start Work (for assigned artist) */}
                        {assetStatus.workflow_status === 'not_started' && 
                         assetStatus.assigned_artist_id === profile?.id && (
                          <Button 
                            size="sm"
                            onClick={() => handleStartWork(assetStatus.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Work
                          </Button>
                        )}

                        {/* Submit for Review (for artist) */}
                        {assetStatus.workflow_status === 'in_progress' && 
                         assetStatus.assigned_artist_id === profile?.id && (
                          <Button 
                            size="sm"
                            onClick={() => handleSubmitForReview(assetStatus.id)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Submit for Review
                          </Button>
                        )}

                        {/* Internal Approval (for HOD) */}
                        {showInternalApproval && assetStatus.workflow_status === 'internal_review' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAsset(assetStatus);
                                setApprovalDialog('internal');
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </div>
                        )}

                        {/* Director Approval */}
                        {showDirectorApproval && assetStatus.workflow_status === 'director_review' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAsset(assetStatus);
                                setApprovalDialog('director');
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </div>
                        )}

                        {/* View Button */}
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog !== null} onOpenChange={() => {
        setApprovalDialog(null);
        setSelectedAsset(null);
        setApprovalNotes('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog === 'internal' ? 'Internal Review' : 'Director Review'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedAsset.asset?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Department: {selectedAsset.current_department}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add feedback or notes..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => approvalDialog === 'internal' 
                ? handleInternalApproval(false) 
                : handleDirectorApproval(false)
              }
              disabled={isApproving}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Request Changes
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => approvalDialog === 'internal' 
                ? handleInternalApproval(true) 
                : handleDirectorApproval(true)
              }
              disabled={isApproving}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {approvalDialog === 'internal' ? 'Forward to Director' : 'Approve & Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
