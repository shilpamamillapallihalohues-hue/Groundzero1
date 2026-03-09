import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Palette, 
  Clock, 
  CheckCircle,
  Upload,
  AlertCircle,
  Calendar,
  MessageSquare,
  Eye,
  Play,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePipelineRouting } from '@/hooks/usePipelineRouting';
import { ASSET_CATEGORY_LABELS } from '@/types/pipeline';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  internal_review: 'In Review',
  director_review: 'Director Review',
  changes_requested: 'Rework Needed',
  approved: 'Approved',
};

const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  internal_review: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  director_review: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  changes_requested: 'bg-destructive/10 text-destructive border-destructive/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export function ArtistDashboard() {
  const { profile } = useAuth();
  const { 
    myAssets, 
    isLoadingMyAssets,
    updateStatus,
    submitForInternalReview,
    getDepartmentOrder,
  } = usePipelineRouting();

  // Calculate stats
  const stats = {
    total: myAssets?.length || 0,
    notStarted: myAssets?.filter(a => a.workflow_status === 'not_started').length || 0,
    inProgress: myAssets?.filter(a => a.workflow_status === 'in_progress').length || 0,
    inReview: myAssets?.filter(a => ['internal_review', 'director_review'].includes(a.workflow_status)).length || 0,
    changesRequested: myAssets?.filter(a => a.workflow_status === 'changes_requested').length || 0,
  };

  const handleStartWork = (assetStatusId: string) => {
    updateStatus({ assetStatusId, status: 'in_progress', startWork: true });
  };

  const handleSubmitForReview = (assetStatusId: string) => {
    submitForInternalReview(assetStatusId);
  };

  // Assets needing attention (changes requested)
  const reworkAssets = myAssets?.filter(a => a.workflow_status === 'changes_requested') || [];
  
  // Active work
  const activeAssets = myAssets?.filter(a => 
    ['not_started', 'in_progress'].includes(a.workflow_status)
  ) || [];

  return (
    <div className="space-y-6">
      <WelcomeQuote />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            My Workspace
          </h1>
          <p className="text-muted-foreground">Your assigned assets and work progress</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Assets</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Not Started</p>
                <p className="text-2xl font-bold">{stats.notStarted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Play className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Eye className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold">{stats.inReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.changesRequested > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rework Needed</p>
                <p className="text-2xl font-bold">{stats.changesRequested}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rework Requests - High Priority */}
      {reworkAssets.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <MessageSquare className="h-5 w-5" />
              Rework Requested ({reworkAssets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reworkAssets.map((assetStatus) => {
                const asset = assetStatus.asset;
                return (
                  <div 
                    key={assetStatus.id} 
                    className="flex items-center justify-between p-4 bg-background rounded-lg border border-destructive/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{asset?.name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {asset?.category ? ASSET_CATEGORY_LABELS[asset.category as keyof typeof ASSET_CATEGORY_LABELS] || asset.category : 'Unknown'}
                          </Badge>
                          <span className="text-muted-foreground">
                            {assetStatus.current_department}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleStartWork(assetStatus.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume Work
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Assigned Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            My Assigned Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMyAssets ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : activeAssets.length > 0 ? (
            <div className="space-y-4">
              {activeAssets.map((assetStatus) => {
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

                        {/* Current Department */}
                        <div className="text-sm text-muted-foreground mb-2">
                          Current Department: <span className="font-medium text-foreground">{assetStatus.current_department}</span>
                        </div>

                        {/* Pipeline Progress */}
                        <div className="mt-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>Overall Progress</span>
                            <span className="ml-auto">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Timestamps */}
                        {assetStatus.started_at && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Started: {new Date(assetStatus.started_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {assetStatus.workflow_status === 'not_started' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStartWork(assetStatus.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Work
                          </Button>
                        )}

                        {assetStatus.workflow_status === 'in_progress' && (
                          <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleSubmitForReview(assetStatus.id)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Submit for Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <p className="text-lg font-medium">No active assets</p>
              <p className="text-sm">New assets will appear here when assigned by your HOD.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets in Review */}
      {stats.inReview > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Assets in Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAssets?.filter(a => ['internal_review', 'director_review'].includes(a.workflow_status)).map((assetStatus) => (
                <div key={assetStatus.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{assetStatus.asset?.name}</p>
                      <p className="text-sm text-muted-foreground">{assetStatus.current_department}</p>
                    </div>
                  </div>
                  <Badge className={WORKFLOW_STATUS_COLORS[assetStatus.workflow_status]}>
                    {WORKFLOW_STATUS_LABELS[assetStatus.workflow_status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Your Workflow</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="outline">Not Started</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30">In Progress</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline">Submit for Review</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline">HOD Review</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge variant="outline">Director Review</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restrictions Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Artist Access</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• View and work on assigned assets only</li>
                <li>• Cannot see other artists' work</li>
                <li>• Cannot approve any work</li>
                <li>• Cannot access client feedback directly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
