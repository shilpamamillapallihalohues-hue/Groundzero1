import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Gauge, RefreshCw, Loader2, AlertTriangle, 
  CheckCircle2, XCircle, Film 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShotReadiness, ReadinessStatus } from '@/types/pipeline';

interface ShotReadinessPanelProps {
  projectId: string;
}

interface Storyboard {
  id: string;
  shot_number: string;
  action?: string;
  lighting?: string;
  scene: {
    id: string;
    scene_number: string;
    slugline: string;
    vfx_required?: boolean;
    vfx_complexity?: string;
  };
}

export function ShotReadinessPanel({ projectId }: ShotReadinessPanelProps) {
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [readinessData, setReadinessData] = useState<Record<string, ShotReadiness>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get all storyboards for this project's scenes
      const { data: scenes, error: scenesError } = await supabase
        .from('scenes')
        .select('id')
        .eq('project_id', projectId);

      if (scenesError) throw scenesError;
      if (!scenes || scenes.length === 0) {
        setStoryboards([]);
        setIsLoading(false);
        return;
      }

      const sceneIds = scenes.map(s => s.id);
      
      const { data: storyboardsData, error: storyboardsError } = await supabase
        .from('storyboards')
        .select(`
          id, shot_number, action, lighting,
          scene:scenes(id, scene_number, slugline, vfx_required, vfx_complexity)
        `)
        .in('scene_id', sceneIds)
        .order('shot_number');

      if (storyboardsError) throw storyboardsError;
      
      const formattedStoryboards = (storyboardsData || []).map((sb: any) => ({
        ...sb,
        scene: Array.isArray(sb.scene) ? sb.scene[0] : sb.scene
      }));
      setStoryboards(formattedStoryboards);

      // Load existing readiness data
      if (formattedStoryboards.length > 0) {
        const storyboardIds = formattedStoryboards.map((s: any) => s.id);
        const { data: readiness, error: readinessError } = await supabase
          .from('shot_readiness')
          .select('*')
          .in('storyboard_id', storyboardIds);

        if (!readinessError && readiness) {
          const readinessMap: Record<string, ShotReadiness> = {};
          readiness.forEach((r: any) => {
            readinessMap[r.storyboard_id] = r as ShotReadiness;
          });
          setReadinessData(readinessMap);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load shots');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateReadiness = async (storyboard: Storyboard) => {
    setIsCalculating(storyboard.id);
    try {
      // Get linked assets for this shot
      const { data: shotAssets } = await supabase
        .from('shot_assets')
        .select('asset_id, production_assets(id, status, complexity_score)')
        .eq('storyboard_id', storyboard.id);

      const linkedAssets = (shotAssets || []).map((sa: any) => ({
        id: sa.asset_id,
        status: sa.production_assets?.status || 'identified',
        complexityScore: sa.production_assets?.complexity_score || 50,
      }));

      const { data, error } = await supabase.functions.invoke('calculate-shot-readiness', {
        body: {
          storyboardId: storyboard.id,
          linkedAssets,
          shotDetails: {
            vfxRequired: storyboard.scene?.vfx_required,
            vfxComplexity: storyboard.scene?.vfx_complexity,
            action: storyboard.action,
            lighting: storyboard.lighting,
          },
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const readiness = data.readiness;

      // Upsert readiness data
      const { error: upsertError } = await supabase
        .from('shot_readiness')
        .upsert({
          storyboard_id: storyboard.id,
          asset_readiness_pct: readiness.assetReadinessPct,
          fx_complexity_score: readiness.fxComplexityScore,
          animation_difficulty_score: readiness.animationDifficultyScore,
          lighting_cost_score: readiness.lightingCostScore,
          overall_status: readiness.overallStatus,
          missing_assets: readiness.missingAssets,
          risk_flags: readiness.riskFlags,
          ai_recommendations: readiness.aiRecommendations,
          calculated_at: readiness.calculatedAt,
        }, { onConflict: 'storyboard_id' });

      if (upsertError) throw upsertError;

      toast.success('Readiness calculated');
      loadData();
    } catch (error) {
      console.error('Error calculating readiness:', error);
      toast.error('Failed to calculate readiness');
    } finally {
      setIsCalculating(null);
    }
  };

  const getStatusIcon = (status: ReadinessStatus) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'risky':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Gauge className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: ReadinessStatus) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400';
      case 'risky': return 'bg-yellow-500/20 text-yellow-400';
      case 'blocked': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{storyboards.length}</p>
              <p className="text-xs text-muted-foreground">Total Shots</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-400">
                {Object.values(readinessData).filter(r => r.overall_status === 'ready').length}
              </p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-400">
                {Object.values(readinessData).filter(r => r.overall_status === 'risky').length}
              </p>
              <p className="text-xs text-muted-foreground">Risky</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-400">
                {Object.values(readinessData).filter(r => r.overall_status === 'blocked').length}
              </p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shot List */}
      {storyboards.length > 0 ? (
        <div className="space-y-3">
          {storyboards.map(shot => {
            const readiness = readinessData[shot.id];
            return (
              <Card key={shot.id} className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {readiness ? (
                        getStatusIcon(readiness.overall_status as ReadinessStatus)
                      ) : (
                        <Gauge className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">Shot {shot.shot_number}</span>
                          <Badge variant="outline" className="text-xs">
                            Scene {shot.scene?.scene_number}
                          </Badge>
                          {readiness && (
                            <Badge className={getStatusColor(readiness.overall_status as ReadinessStatus)}>
                              {readiness.overall_status.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {shot.scene?.slugline}
                        </p>

                        {readiness && (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Assets</p>
                              <Progress value={readiness.asset_readiness_pct} className="h-2" />
                              <p className="text-xs mt-1">{readiness.asset_readiness_pct}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">FX Complexity</p>
                              <Progress value={readiness.fx_complexity_score} className="h-2" />
                              <p className="text-xs mt-1">{readiness.fx_complexity_score}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Animation</p>
                              <Progress value={readiness.animation_difficulty_score} className="h-2" />
                              <p className="text-xs mt-1">{readiness.animation_difficulty_score}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Lighting</p>
                              <Progress value={readiness.lighting_cost_score} className="h-2" />
                              <p className="text-xs mt-1">{readiness.lighting_cost_score}%</p>
                            </div>
                          </div>
                        )}

                        {readiness?.risk_flags && readiness.risk_flags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {readiness.risk_flags.map((flag, i) => (
                              <Badge key={i} variant="outline" className="text-xs text-yellow-500">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => calculateReadiness(shot)}
                      disabled={isCalculating === shot.id}
                    >
                      {isCalculating === shot.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No storyboards found. Create storyboards first to track shot readiness.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
