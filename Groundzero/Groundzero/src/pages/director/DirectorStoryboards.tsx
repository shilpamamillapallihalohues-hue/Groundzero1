import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Image, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { StoryboardScenePanel } from '@/components/director/StoryboardScenePanel';
import { useProjectContext } from '@/contexts/ProjectContext';

interface Storyboard {
  id: string;
  shot_number: string;
  image_url: string | null;
  action: string | null;
  camera_angle: string | null;
  shot_type: string | null;
  status: string | null;
  review_status: string | null;
  scene_id: string | null;
  mood: string | null;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  description: string | null;
}

export default function DirectorStoryboards() {
  const { selectedProjectId } = useProjectContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch scenes
  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['director-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch storyboards (filtered by scenes in the selected project)
  const sceneIds = scenes.map(s => s.id);
  
  const { data: storyboards = [], isLoading: storyboardsLoading } = useQuery({
    queryKey: ['director-storyboards', selectedProjectId, sceneIds],
    queryFn: async (): Promise<Storyboard[]> => {
      if (!selectedProjectId || sceneIds.length === 0) {
        // Fetch all if no project selected
        const { data, error } = await supabase
          .from('storyboards')
          .select('id, shot_number, image_url, action, camera_angle, shot_type, status, review_status, scene_id, mood')
          .order('shot_number');
        if (error) throw error;
        return (data || []) as Storyboard[];
      }
      
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, image_url, action, camera_angle, shot_type, status, review_status, scene_id, mood')
        .in('scene_id', sceneIds)
        .order('shot_number');
      
      if (error) throw error;
      return (data || []) as Storyboard[];
    },
    enabled: !scenesLoading
  });

  // Group storyboards by scene
  const groupedByScene = useMemo(() => {
    const groups: Record<string, Storyboard[]> = {};
    
    storyboards.forEach(board => {
      const sceneId = board.scene_id || 'unassigned';
      if (!groups[sceneId]) {
        groups[sceneId] = [];
      }
      groups[sceneId].push(board);
    });

    return groups;
  }, [storyboards]);

  // Filter storyboards
  const filteredStoryboards = useMemo(() => {
    let result = storyboards;

    if (filter === 'pending') {
      result = result.filter(b => b.review_status !== 'approved' && b.status !== 'approved');
    } else if (filter === 'approved') {
      result = result.filter(b => b.review_status === 'approved' || b.status === 'approved');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.action?.toLowerCase().includes(query) ||
        b.shot_number.toLowerCase().includes(query)
      );
    }

    return result;
  }, [storyboards, filter, searchQuery]);

  // Get filtered scenes that have matching storyboards
  const filteredScenes = useMemo(() => {
    const sceneIdsWithShots = new Set(filteredStoryboards.map(s => s.scene_id).filter(Boolean));
    return scenes.filter(scene => sceneIdsWithShots.has(scene.id));
  }, [scenes, filteredStoryboards]);

  const pendingCount = storyboards.filter(b => b.review_status !== 'approved' && b.status !== 'approved').length;
  const isLoading = scenesLoading || storyboardsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header - Controls Only */}
      <div className="flex items-center justify-end gap-3">
        <DirectorProjectSelector />
        <Badge variant={pendingCount > 0 ? 'destructive' : 'secondary'} className="text-xs">
          {pendingCount} pending
        </Badge>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-shrink-0">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6">All ({storyboards.length})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs h-6">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs h-6">Approved ({storyboards.length - pendingCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input 
            placeholder="Search shots..." 
            className="h-8 pl-7 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Badge variant="outline" className="text-xs">
          {filteredScenes.length} scenes • {filteredStoryboards.length} shots
        </Badge>
      </div>

      {/* Scene Panels */}
      {!selectedProjectId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Select a Project</h3>
            <p className="text-sm text-muted-foreground">
              Choose a project to view storyboards organized by scene
            </p>
          </CardContent>
        </Card>
      ) : filteredScenes.length > 0 ? (
        <div className="space-y-4">
          {filteredScenes.map((scene, idx) => {
            const sceneShots = filteredStoryboards.filter(s => s.scene_id === scene.id);
            if (sceneShots.length === 0) return null;
            
            return (
              <StoryboardScenePanel 
                key={scene.id}
                scene={scene}
                shots={sceneShots}
                defaultExpanded={idx === 0}
              />
            );
          })}

          {/* Unassigned shots */}
          {groupedByScene['unassigned']?.length > 0 && (
            <StoryboardScenePanel 
              scene={{ id: 'unassigned', scene_number: '?', slugline: 'Unassigned Shots', description: null }}
              shots={groupedByScene['unassigned'].filter(s => filteredStoryboards.includes(s))}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No storyboards found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'pending' ? 'No storyboards pending review' : 'Storyboards will appear here organized by scene.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
