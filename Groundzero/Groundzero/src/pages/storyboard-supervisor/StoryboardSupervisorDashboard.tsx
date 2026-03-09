import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Image, 
  Clapperboard, 
  Video,
  CheckCircle2,
  Clock,
  Layers,
  Eye,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';

export default function StoryboardSupervisorDashboard() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['sb-supervisor-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch project details
  const { data: currentProject } = useQuery({
    queryKey: ['sb-supervisor-current-project', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', activeProjectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeProjectId
  });

  // Fetch scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['sb-supervisor-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId
  });

  // Fetch storyboards for the project
  const { data: storyboards = [] } = useQuery({
    queryKey: ['sb-supervisor-storyboards', activeProjectId, scenes],
    queryFn: async () => {
      if (!activeProjectId || scenes.length === 0) return [];
      const sceneIds = scenes.map(s => s.id);
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, scene_id, review_status')
        .in('scene_id', sceneIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId && scenes.length > 0
  });

  // Stats
  const totalScenes = scenes.length;
  const totalPanels = storyboards.length;
  const approvedPanels = storyboards.filter((s: any) => s.review_status === 'approved').length;
  const pendingPanels = storyboards.filter((s: any) => s.review_status === 'pending').length;
  const panelsWithNotes = 0; // Director notes feature to be added

  if (projectsLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <WelcomeQuote tagline="The First Cut Lives Here" />
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Image className="h-8 w-8 text-amber-500" />
              Storyboard Supervisor
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage storyboard panels, shots, and director feedback
            </p>
          </div>
          <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
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

        {activeProjectId ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Clapperboard className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalScenes}</p>
                      <p className="text-sm text-muted-foreground">Scenes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Layers className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalPanels}</p>
                      <p className="text-sm text-muted-foreground">Total Panels</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{approvedPanels}</p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <Clock className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingPanels}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{panelsWithNotes}</p>
                      <p className="text-sm text-muted-foreground">Director Notes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate('/storyboard-supervisor/scene-breakdown')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clapperboard className="h-5 w-5 text-amber-500" />
                    Scene Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View scene-wise asset breakdown with concept art references
                  </p>
                  <Badge className="mt-3">{totalScenes} scenes</Badge>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate('/storyboard-supervisor/shots-breakdown')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    Shots Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generate storyboard panels with style, camera & lighting settings
                  </p>
                  <Badge variant="secondary" className="mt-3">AI Generation</Badge>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate('/storyboard-supervisor/panel-view')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5 text-green-500" />
                    Panel View
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View, edit, download and manage storyboard panels by scene
                  </p>
                  <Badge variant="outline" className="mt-3">{totalPanels} panels</Badge>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate('/storyboard-supervisor/director-inputs')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    Director Inputs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View director feedback and notes for each panel
                  </p>
                  <Badge variant="secondary" className="mt-3">{panelsWithNotes} with notes</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Project Info */}
            {currentProject && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{currentProject.title}</h3>
                      <p className="text-muted-foreground">{currentProject.description || 'No description'}</p>
                    </div>
                    <Badge variant={currentProject.status === 'pre_production' ? 'default' : 'secondary'}>
                      {currentProject.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">Choose a project to manage storyboards.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
