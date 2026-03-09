import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Package, Plus, Loader2, Wand2, FileJson, 
  LayoutGrid, List, Filter 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ProductionAsset, ModelPlan, AssetCategory, 
  ASSET_CATEGORY_LABELS, ASSET_DETAIL_LABELS 
} from '@/types/pipeline';

interface AssetManagerProps {
  projectId: string;
}

export function AssetManager({ projectId }: AssetManagerProps) {
  const [assets, setAssets] = useState<ProductionAsset[]>([]);
  const [modelPlans, setModelPlans] = useState<Record<string, ModelPlan>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<string | null>(null);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'prop' as AssetCategory,
    description: '',
    owning_department: '',
  });

  useEffect(() => {
    loadAssets();
  }, [projectId]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const { data: assetsData, error: assetsError } = await supabase
        .from('production_assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (assetsError) throw assetsError;
      setAssets(assetsData as ProductionAsset[] || []);

      // Load model plans
      if (assetsData && assetsData.length > 0) {
        const assetIds = assetsData.map(a => a.id);
        const { data: plansData, error: plansError } = await supabase
          .from('model_plans')
          .select('*')
          .in('asset_id', assetIds);

        if (!plansError && plansData) {
          const plansMap: Record<string, ModelPlan> = {};
          plansData.forEach((plan: any) => {
            plansMap[plan.asset_id] = plan as ModelPlan;
          });
          setModelPlans(plansMap);
        }
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!newAsset.name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('production_assets').insert({
        project_id: projectId,
        name: newAsset.name,
        category: newAsset.category,
        description: newAsset.description,
        owning_department: newAsset.owning_department || null,
        status: 'identified',
      });

      if (error) throw error;
      toast.success('Asset created');
      setNewAsset({ name: '', category: 'prop', description: '', owning_department: '' });
      loadAssets();
    } catch (error) {
      toast.error('Failed to create asset');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateModelPlan = async (asset: ProductionAsset) => {
    setIsGeneratingPlan(asset.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-model-plan', {
        body: {
          assetName: asset.name,
          assetCategory: asset.category,
          description: asset.description,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Save model plan to database
      const plan = data.modelPlan;
      const { error: saveError } = await supabase.from('model_plans').insert({
        asset_id: asset.id,
        detail_level: plan.detailLevel,
        poly_density_guidance: plan.polyDensityGuidance,
        texture_resolution: plan.textureResolution,
        rigging_needs: plan.riggingNeeds || {},
        topology_suggestions: plan.topologySuggestions || [],
        scale_reference: plan.scaleReference || {},
        geometry_groups: plan.geometryGroups || [],
        material_slots: plan.materialSlots || [],
        texture_sets: plan.textureSets || [],
        rig_layers: plan.rigLayers || [],
        fx_attachment_points: plan.fxAttachmentPoints || [],
        lod_hierarchy: plan.lodHierarchy || [],
      });

      if (saveError) throw saveError;

      // Update asset complexity score
      await supabase
        .from('production_assets')
        .update({ 
          complexity_score: plan.complexityScore || 50,
          status: 'planned',
        })
        .eq('id', asset.id);

      toast.success('Model plan generated!');
      loadAssets();
    } catch (error) {
      console.error('Error generating model plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate plan');
    } finally {
      setIsGeneratingPlan(null);
    }
  };

  const filteredAssets = filterCategory === 'all' 
    ? assets 
    : assets.filter(a => a.category === filterCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border border-border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Production Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Asset Name</Label>
                <Input
                  value={newAsset.name}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Hero Sword, Main Character, Forest Environment"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newAsset.category}
                  onValueChange={(v) => setNewAsset(prev => ({ ...prev, category: v as AssetCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newAsset.description}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the asset..."
                />
              </div>
              <div className="space-y-2">
                <Label>Owning Department</Label>
                <Input
                  value={newAsset.owning_department}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, owning_department: e.target.value }))}
                  placeholder="e.g., Art, VFX, Animation"
                />
              </div>
              <Button onClick={handleCreateAsset} disabled={isCreating} className="w-full">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Asset'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Asset Grid/List */}
      {filteredAssets.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-3'
        }>
          {filteredAssets.map(asset => {
            const plan = modelPlans[asset.id];
            return (
              <Card key={asset.id} className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className={viewMode === 'grid' ? 'p-4' : 'p-4 flex items-center gap-4'}>
                  {/* Thumbnail */}
                  <div className={`${viewMode === 'grid' ? 'mb-3' : ''} ${viewMode === 'list' ? 'w-16 h-16 flex-shrink-0' : 'aspect-video'} rounded-lg bg-muted flex items-center justify-center`}>
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium truncate">{asset.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ASSET_CATEGORY_LABELS[asset.category]}
                          </Badge>
                          <Badge 
                            variant={asset.status === 'approved' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {asset.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Complexity</span>
                        <span>{asset.complexity_score}%</span>
                      </div>
                      <Progress value={asset.complexity_score} className="h-1" />
                    </div>

                    {/* Model Plan Status */}
                    <div className="mt-3 flex gap-2">
                      {plan ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <FileJson className="h-3 w-3" />
                          {ASSET_DETAIL_LABELS[plan.detail_level]} Plan
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateModelPlan(asset)}
                          disabled={isGeneratingPlan === asset.id}
                          className="text-xs gap-1"
                        >
                          {isGeneratingPlan === asset.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                          Generate Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No production assets yet. Add assets from script breakdown or create manually.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
