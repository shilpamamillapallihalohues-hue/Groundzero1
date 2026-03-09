import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Palette, 
  Package, 
  User, 
  MapPin, 
  Trees, 
  Wand2, 
  Image,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Film,
  FolderOpen,
  ChevronRight,
  Clapperboard,
  Video,
  Box
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';

export default function ArtDirectorDashboard() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const navigate = useNavigate();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['ad-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Scenes with breakdown
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['ad-scenes-breakdown', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location, estimated_duration')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });
  // Shots count per scene - simplified
  const shotsPerScene = new Map<string, number>();
  // We'll calculate this from storyboards in a separate simpler query if needed

  const { data: conceptStats } = useQuery({
    queryKey: ['ad-concept-stats', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return { total: 0, pending: 0, approved: 0 };
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, art_director_approved, director_approved')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      
      const total = data?.length || 0;
      const approved = data?.filter(c => c.art_director_approved)?.length || 0;
      const pending = total - approved;
      
      return { total, pending, approved };
    },
    enabled: !!selectedProjectId,
  });

  const assetBreakdown = {
    characters: new Set<string>(),
    props: new Set<string>(),
    locations: new Set<string>(),
    environments: new Set<string>(),
  };

  scenes?.forEach(scene => {
    if (scene.characters) {
      const charData = scene.characters as string | string[];
      const chars = Array.isArray(charData) 
        ? charData 
        : String(charData).split(',').map((c: string) => c.trim());
      chars.forEach((c: string) => c && assetBreakdown.characters.add(c));
    }
    if (scene.props) {
      const propData = scene.props as string | string[];
      const propList = Array.isArray(propData) 
        ? propData 
        : String(propData).split(',').map((p: string) => p.trim());
      propList.forEach((p: string) => p && assetBreakdown.props.add(p));
    }
    if (scene.location) {
      assetBreakdown.locations.add(scene.location);
    }
    if (scene.slugline) {
      assetBreakdown.environments.add(scene.slugline);
    }
  });

  const assetCategories = [
    { key: 'characters', title: 'Characters', icon: User, data: assetBreakdown.characters, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    { key: 'props', title: 'Props', icon: Package, data: assetBreakdown.props, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { key: 'locations', title: 'Locations', icon: MapPin, data: assetBreakdown.locations, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
    { key: 'environments', title: 'Environments', icon: Trees, data: assetBreakdown.environments, color: 'text-cyan-600', bgColor: 'bg-cyan-500/10' },
  ];

  if (projectsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <WelcomeQuote tagline="Design the World Before Camera Rolls" />
      {/* Header with project selector only */}
      <div className="flex items-center justify-end pb-4 border-b border-border">
        <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[200px] md:w-[240px]">
            <Film className="h-4 w-4 mr-2 text-muted-foreground" />
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

      {selectedProjectId ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-primary/10">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Total Concepts</span>
                </div>
                <p className="text-2xl font-bold">{conceptStats?.total || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-amber-500/10">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold">{conceptStats?.pending || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-emerald-500/10">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Approved</span>
                </div>
                <p className="text-2xl font-bold">{conceptStats?.approved || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded bg-blue-500/10">
                    <Film className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Scenes</span>
                </div>
                <p className="text-2xl font-bold">{scenes?.length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Asset Breakdown - Clickable */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Asset Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assetCategories.map((category) => (
                <div 
                  key={category.key}
                  className="p-3 rounded-lg border hover:border-primary/30 hover:bg-muted/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/art-director/assets/${category.key}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${category.bgColor}`}>
                        <category.icon className={`h-4 w-4 ${category.color}`} />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{category.title}</span>
                        <p className="text-xs text-muted-foreground">
                          {category.data.size} item{category.data.size !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {category.data.size}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {category.data.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from(category.data).slice(0, 5).map((item, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0.5 font-normal"
                        >
                          {item}
                        </Badge>
                      ))}
                      {category.data.size > 5 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          +{category.data.size - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scene Reference for Concept Art */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clapperboard className="h-4 w-4" />
                Scene Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {scenes && scenes.length > 0 ? (
                    scenes.map(scene => (
                      <div key={scene.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Scene {scene.scene_number}
                            </Badge>
                            <span className="text-sm font-medium truncate max-w-[200px]">
                              {scene.slugline || 'Untitled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {scene.estimated_duration || 0}min
                          </div>
                        </div>
                        {scene.characters && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(scene.characters) ? scene.characters : String(scene.characters).split(',')).slice(0, 3).map((char: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-[10px]">
                                {char.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No scenes in this project yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card 
              className="cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => navigate('/art-director/concepts/automate')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Wand2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm flex items-center gap-1.5">
                      AI Concept Generation
                      <Sparkles className="h-3 w-3 text-amber-500" />
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">Generate with lighting & camera</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-purple-300 transition-all"
              onClick={() => navigate('/art-director/concepts/gallery')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-500/10">
                    <Layers className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Concept Gallery</h3>
                    <p className="text-xs text-muted-foreground truncate">Review approved concepts</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-cyan-300 transition-all"
              onClick={() => navigate('/art-director/facial-turnaround')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10">
                    <User className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm flex items-center gap-1.5">
                      Facial Turnaround
                      <Sparkles className="h-3 w-3 text-amber-500" />
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">KeenTools-ready turnarounds</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-emerald-300 transition-all"
              onClick={() => navigate('/model-generator')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10">
                    <Box className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm flex items-center gap-1.5">
                      3D Model Generator
                      <Sparkles className="h-3 w-3 text-amber-500" />
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">Characters, creatures, props with simulation</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Select a project to view asset breakdown and manage concepts
            </p>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <Film className="h-4 w-4 mr-2" />
              Browse Projects
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}