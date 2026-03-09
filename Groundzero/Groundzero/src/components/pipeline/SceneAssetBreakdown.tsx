import React, { useState } from 'react';
import { 
  Plus, Folder, User, MapPin, Car, Sparkles, Box, MoreHorizontal,
  Calendar, Clock, CheckCircle2, Circle, ArrowRight, Trash2, Edit2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSceneAssets, type AssetCategory, type SceneAsset } from '@/hooks/useSceneAssets';
import { cn } from '@/lib/utils';

interface SceneAssetBreakdownProps {
  projectId: string;
  sceneId: string;
  sceneName?: string;
  readonly?: boolean;
}

const CATEGORY_CONFIG: Record<AssetCategory, { label: string; icon: React.ElementType; color: string }> = {
  environment: { label: 'Environments', icon: MapPin, color: 'text-green-500' },
  character: { label: 'Characters', icon: User, color: 'text-blue-500' },
  creature: { label: 'Creatures', icon: Sparkles, color: 'text-purple-500' },
  prop: { label: 'Props', icon: Box, color: 'text-orange-500' },
  vehicle: { label: 'Vehicles', icon: Car, color: 'text-red-500' },
  fx: { label: 'VFX', icon: Sparkles, color: 'text-pink-500' },
  custom: { label: 'Custom', icon: Folder, color: 'text-gray-500' },
};

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-gray-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  internal_review: { label: 'Internal Review', color: 'bg-yellow-500' },
  director_review: { label: 'Director Review', color: 'bg-orange-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
  locked: { label: 'Locked', color: 'bg-purple-500' },
};

export function SceneAssetBreakdown({ projectId, sceneId, sceneName, readonly = false }: SceneAssetBreakdownProps) {
  const {
    assets,
    sectorRoutes,
    isLoading,
    createAsset,
    updateAssetStatus,
    updateAssetProgress,
    deleteAsset,
    getAssetSectorRoute,
  } = useSceneAssets(projectId, sceneId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'character' as AssetCategory,
    description: '',
    customCategoryName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAsset = async () => {
    if (!newAsset.name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setIsSubmitting(true);
    const result = await createAsset(
      sceneId,
      newAsset.name,
      newAsset.category,
      newAsset.description,
      newAsset.customCategoryName
    );

    if (result.success) {
      toast.success('Asset created');
      setNewAsset({ name: '', category: 'character', description: '', customCategoryName: '' });
      setIsAddDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to create asset');
    }
    setIsSubmitting(false);
  };

  const handleDeleteAsset = async (assetId: string) => {
    const result = await deleteAsset(assetId);
    if (result.success) {
      toast.success('Asset deleted');
    } else {
      toast.error(result.error || 'Failed to delete asset');
    }
  };

  const handleStatusChange = async (assetId: string, status: SceneAsset['workflow_status']) => {
    const result = await updateAssetStatus(assetId, status);
    if (result.success) {
      toast.success('Status updated');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  // Group assets by category
  const assetsByCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, category) => {
    acc[category as AssetCategory] = assets.filter(a => a.category === category);
    return acc;
  }, {} as Record<AssetCategory, SceneAsset[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{sceneName || 'Scene'} Assets</h3>
          <p className="text-sm text-muted-foreground">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        {!readonly && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Create a new asset for this scene
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Asset Name</Label>
                  <Input
                    value={newAsset.name}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter asset name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newAsset.category}
                    onValueChange={(value) => setNewAsset(prev => ({ ...prev, category: value as AssetCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className={cn('w-4 h-4', config.color)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newAsset.category === 'custom' && (
                  <div>
                    <Label>Custom Category Name</Label>
                    <Input
                      value={newAsset.customCategoryName}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, customCategoryName: e.target.value }))}
                      placeholder="Enter category name"
                    />
                  </div>
                )}
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newAsset.description}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAsset} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Category Sections */}
      {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
        const categoryAssets = assetsByCategory[category as AssetCategory];
        if (categoryAssets.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <config.icon className={cn('w-5 h-5', config.color)} />
                <CardTitle className="text-base">{config.label}</CardTitle>
                <Badge variant="secondary">{categoryAssets.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryAssets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    sectorRoute={getAssetSectorRoute(asset.category)}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteAsset}
                    readonly={readonly}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {assets.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No assets defined for this scene</p>
              {!readonly && (
                <p className="text-sm mt-2">
                  Add assets to track them through the production pipeline
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AssetRowProps {
  asset: SceneAsset;
  sectorRoute: { sector_name: string; sector_order: number }[];
  onStatusChange: (assetId: string, status: SceneAsset['workflow_status']) => void;
  onDelete: (assetId: string) => void;
  readonly?: boolean;
}

function AssetRow({ asset, sectorRoute, onStatusChange, onDelete, readonly }: AssetRowProps) {
  const statusConfig = STATUS_CONFIG[asset.workflow_status];
  const currentSectorIndex = sectorRoute.findIndex(r => r.sector_name === asset.current_sector);

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {asset.workflow_status === 'approved' || asset.workflow_status === 'locked' ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium">{asset.name}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <div className={cn('w-2 h-2 rounded-full mr-1', statusConfig.color)} />
            {statusConfig.label}
          </Badge>
          {asset.current_sector && (
            <Badge variant="secondary" className="text-xs">
              {asset.current_sector}
            </Badge>
          )}
        </div>

        {!readonly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'in_progress')}>
                Start Work
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'internal_review')}>
                Submit for Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'approved')}>
                Mark Approved
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(asset.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Sector Progress */}
      {sectorRoute.length > 0 && (
        <div className="flex items-center gap-1 text-xs mt-2">
          {sectorRoute.map((sector, index) => (
            <React.Fragment key={sector.sector_name}>
              <span className={cn(
                'px-2 py-0.5 rounded',
                index < currentSectorIndex && 'bg-green-500/20 text-green-600',
                index === currentSectorIndex && 'bg-primary/20 text-primary font-medium',
                index > currentSectorIndex && 'text-muted-foreground'
              )}>
                {sector.sector_name}
              </span>
              {index < sectorRoute.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-2">
        <Progress value={asset.progress_percentage} className="h-1.5" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{asset.progress_percentage}% complete</span>
          {asset.revision_count > 0 && (
            <span>Rev {asset.revision_count}</span>
          )}
        </div>
      </div>

      {/* Dates */}
      {(asset.planned_start_date || asset.planned_delivery_date) && (
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {asset.planned_start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Start: {asset.planned_start_date}
            </span>
          )}
          {asset.planned_delivery_date && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due: {asset.planned_delivery_date}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
