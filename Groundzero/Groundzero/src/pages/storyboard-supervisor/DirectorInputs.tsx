import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Clapperboard,
  Image,
  ChevronRight,
  Film,
  CheckCircle2,
  AlertCircle,
  Clock,
  User
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function DirectorInputs() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['sb-director-inputs-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['sb-director-inputs-scenes', activeProjectId],
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

  // Fetch all storyboards with director notes
  const { data: allStoryboards = [] } = useQuery({
    queryKey: ['sb-director-inputs-storyboards', activeProjectId, scenes],
    queryFn: async () => {
      if (!activeProjectId || scenes.length === 0) return [];
      const sceneIds = scenes.map(s => s.id);
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .in('scene_id', sceneIds)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId && scenes.length > 0
  });

  // Filter panels based on tab and scene
  const filteredPanels = useMemo(() => {
    let panels = allStoryboards;
    
    // Filter by scene if selected
    if (selectedSceneId) {
      panels = panels.filter(p => p.scene_id === selectedSceneId);
    }
    
    // Filter by tab
    switch (activeTab) {
      case 'with-notes':
        return panels.filter((p: any) => p.mood); // Use mood as proxy for notes
      case 'approved':
        return panels.filter((p: any) => p.review_status === 'approved');
      case 'pending':
        return panels.filter((p: any) => p.review_status === 'pending' || !p.review_status);
      case 'revisions':
        return panels.filter((p: any) => p.review_status === 'revision');
      default:
        return panels;
    }
  }, [allStoryboards, selectedSceneId, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const panels = selectedSceneId 
      ? allStoryboards.filter(p => p.scene_id === selectedSceneId)
      : allStoryboards;
    
    return {
      total: panels.length,
      withNotes: panels.filter((p: any) => p.mood).length,
      approved: panels.filter((p: any) => p.review_status === 'approved').length,
      pending: panels.filter((p: any) => p.review_status === 'pending' || !p.review_status).length,
      revisions: panels.filter((p: any) => p.review_status === 'revision').length,
    };
  }, [allStoryboards, selectedSceneId]);

  const selectedScene = useMemo(() => {
    return scenes.find(s => s.id === selectedSceneId);
  }, [selectedSceneId, scenes]);

  // Get scene for a panel
  const getSceneForPanel = (sceneId: string) => {
    return scenes.find(s => s.id === sceneId);
  };

  if (projectsLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-purple-500" />
              Director Inputs
            </h1>
            <p className="text-muted-foreground">
              View director feedback and notes for each storyboard panel
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
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="cursor-pointer hover:border-primary" onClick={() => setActiveTab('all')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xl font-bold">{stats.total}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Panels</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary" onClick={() => setActiveTab('with-notes')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    <span className="text-xl font-bold">{stats.withNotes}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">With Notes</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary" onClick={() => setActiveTab('approved')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xl font-bold">{stats.approved}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary" onClick={() => setActiveTab('pending')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-xl font-bold">{stats.pending}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary" onClick={() => setActiveTab('revisions')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xl font-bold">{stats.revisions}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Revisions</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Scene Filter */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Filter by Scene
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          !selectedSceneId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedSceneId(null)}
                      >
                        <p className="font-medium text-sm">All Scenes</p>
                      </div>
                      {scenes.map((scene: any) => (
                        <div
                          key={scene.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSceneId === scene.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedSceneId(scene.id)}
                        >
                          <Badge variant="outline" className="text-xs mb-1">
                            Scene {scene.scene_number}
                          </Badge>
                          <p className="font-medium text-sm truncate">{scene.slugline}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Panels with Notes */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Director Feedback
                    {selectedScene && (
                      <Badge variant="secondary" className="ml-2">
                        Scene {selectedScene.scene_number}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="with-notes">With Notes</TabsTrigger>
                      <TabsTrigger value="approved">Approved</TabsTrigger>
                      <TabsTrigger value="pending">Pending</TabsTrigger>
                      <TabsTrigger value="revisions">Revisions</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {filteredPanels.length > 0 ? (
                    <div className="space-y-4">
                      {filteredPanels.map((panel: any) => {
                        const scene = getSceneForPanel(panel.scene_id);
                        return (
                          <div key={panel.id} className="flex gap-4 p-4 border rounded-lg">
                            {/* Thumbnail */}
                            <div className="w-32 h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                              {panel.image_url ? (
                                <img 
                                  src={panel.image_url} 
                                  alt={`Shot ${panel.shot_number}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Image className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {scene ? `Scene ${scene.scene_number}` : 'Unknown'}
                                </Badge>
                                <span className="font-medium">Shot {panel.shot_number}</span>
                                <Badge 
                                  variant={
                                    panel.review_status === 'approved' ? 'default' : 
                                    panel.review_status === 'revision' ? 'destructive' : 
                                    'secondary'
                                  }
                                >
                                  {panel.review_status || 'pending'}
                                </Badge>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                {panel.action || panel.description || 'No description'}
                              </p>

                              {/* Director Notes - Using mood field as proxy */}
                              {panel.mood ? (
                                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium text-purple-700">Director Mood/Notes:</span>
                                  </div>
                                  <p className="text-sm">{panel.mood}</p>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  No director notes yet
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No panels found with the selected filter</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">Choose a project to view director inputs.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
