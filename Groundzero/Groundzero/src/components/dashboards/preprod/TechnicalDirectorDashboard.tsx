import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, AlertTriangle, Send, Cpu, Database, Workflow } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function TechnicalDirectorDashboard() {
  const navigate = useNavigate();

  const { data: scenes, isLoading } = useQuery({
    queryKey: ['scenes-tech-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, description')
        .order('scene_number');
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const highComplexityScenes = 0; // Will be calculated based on scene analysis

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Technical Director Dashboard</h1>
        <p className="text-muted-foreground">Decide how production will be executed</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{scenes?.length || 0}</div>
            <p className="text-muted-foreground">Total Scenes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{highComplexityScenes}</div>
            <p className="text-muted-foreground">High VFX Complexity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Badge variant="outline" className="text-lg px-4 py-2">Not Configured</Badge>
            <p className="text-muted-foreground mt-1">Pipeline Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Technical Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Technical Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {scenes && scenes.length > 0 ? (
              scenes.slice(0, 10).map((scene: any) => (
                <div key={scene.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="font-medium">Scene {scene.scene_number}</span>
                  </div>
                  <Badge variant="secondary">Pending Analysis</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No scenes to analyze.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Technical Assist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Technical Assist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scenes && scenes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Analyzing {scenes.length} scenes for technical requirements...
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No scenes available for technical analysis.</p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            ✔ Render time estimation • ✔ FX complexity warnings • ✔ Mocap feasibility flags
          </p>
        </CardContent>
      </Card>

      {/* Manual Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Pipeline Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex-col" onClick={() => navigate('/preprod/tech/pipeline')}>
              <Database className="h-6 w-6 mb-2" />
              <span>Pipeline Type</span>
              <span className="text-xs text-muted-foreground">2D / 3D / Hybrid</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={() => navigate('/preprod/tech/pipeline')}>
              <Cpu className="h-6 w-6 mb-2" />
              <span>Software Stack</span>
              <span className="text-xs text-muted-foreground">Tools & Plugins</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col" onClick={() => navigate('/preprod/tech/render')}>
              <Settings className="h-6 w-6 mb-2" />
              <span>Render Strategy</span>
              <span className="text-xs text-muted-foreground">Farm & Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Technical Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/preprod/tech/approval')}>
            Send to Director & Producer
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Production cannot be unlocked until Technical Plan is approved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
