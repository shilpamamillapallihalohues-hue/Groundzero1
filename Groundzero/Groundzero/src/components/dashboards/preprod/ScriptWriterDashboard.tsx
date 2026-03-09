import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Brain, Users, MapPin, Send, MessageSquare, FolderOpen, Upload, Lock, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function ScriptWriterDashboard() {
  const navigate = useNavigate();

  const { data: scripts, isLoading: scriptsLoading } = useQuery({
    queryKey: ['script-versions-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('script_versions')
        .select('*, projects(id, title)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['scenes-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, location, characters, project_id')
        .order('scene_number')
        .limit(15);
      return data || [];
    }
  });

  const { data: projects } = useQuery({
    queryKey: ['script-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, status')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['script-stats'],
    queryFn: async () => {
      const { count: totalScenes } = await supabase
        .from('scenes')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalScripts } = await supabase
        .from('script_versions')
        .select('*', { count: 'exact', head: true });

      return { 
        totalScenes: totalScenes || 0, 
        totalScripts: totalScripts || 0 
      };
    }
  });

  if (scriptsLoading || scenesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const latestScript = scripts?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Script Writer Dashboard</h1>
        <p className="text-muted-foreground">Create, refine, and manage script structure</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalScripts || 0}</p>
                <p className="text-muted-foreground">Script Versions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalScenes || 0}</p>
                <p className="text-muted-foreground">Total Scenes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">v{latestScript?.version_number || 0}</p>
                <p className="text-muted-foreground">Latest Version</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {projects && projects.length > 0 ? (
              projects.map((project: any) => (
                <Button 
                  key={project.id} 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.title}
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground">No active projects.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Script Status Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Script Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestScript ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Project:</span>
                <span>{latestScript.projects?.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Current Version:</span>
                <Badge variant="outline">v{latestScript.version_number}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge variant="secondary">Draft</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button onClick={() => navigate('/preprod/script/dashboard')}>
                  Open Script Editor
                </Button>
                <Button variant="outline" onClick={() => navigate('/preprod/script/versions')}>
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No scripts found. Start by uploading a script.</p>
              <Button onClick={() => navigate('/preprod/script/versions')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Script
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scene Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎬 Scene Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {scenes && scenes.length > 0 ? (
              scenes.map((scene: any) => (
                <div key={scene.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 cursor-pointer"
                     onClick={() => navigate('/preprod/script/scenes')}>
                  <div>
                    <span className="font-medium">Scene {scene.scene_number}</span>
                    {scene.slugline && <span className="text-muted-foreground ml-2">- {scene.slugline}</span>}
                    {scene.location && (
                      <span className="text-xs text-muted-foreground block">
                        📍 {scene.location}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline">Ready</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No scenes extracted yet. Use AI Breakdown to extract scenes.</p>
            )}
          </div>
          <Button variant="link" className="mt-2 p-0" onClick={() => navigate('/preprod/script/scenes')}>
            View all scenes →
          </Button>
        </CardContent>
      </Card>

      {/* AI Script Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Script Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate('/preprod/script/ai-breakdown')}>
              <Brain className="h-4 w-4 mr-2" />
              AI Scene Breakdown
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/script/scenes')}>
              <Users className="h-4 w-4 mr-2" />
              Character Extraction
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/script/scenes')}>
              <MapPin className="h-4 w-4 mr-2" />
              Location & Props
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/script/versions')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Dialogue Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="default" onClick={() => navigate('/preprod/script/versions')}>
            <Upload className="h-4 w-4 mr-2" />
            Upload New Script Version
          </Button>
          <Button className="w-full" variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Send Script for Director Review
          </Button>
          <p className="text-xs text-muted-foreground">
            ⚠️ You cannot lock the script. Only the Producer can lock via{' '}
            <span className="underline cursor-pointer" onClick={() => navigate('/preprod/script/lock')}>
              Script Lock
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
