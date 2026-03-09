import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, 
  Search, 
  Film,
  Camera,
  Sun,
  CheckCircle,
  AlertCircle,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShotData {
  id: string;
  shot_number: string;
  shot_type: string | null;
  camera_angle: string | null;
  lighting: string | null;
  action: string | null;
  review_status: string | null;
  scene_id: string;
  image_url: string | null;
  scenes: {
    scene_number: string;
    slugline: string;
  } | null;
}

export default function DirectorShotWall() {
  const { selectedProjectId } = useProjectContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Fetch all shots for the project via scenes
  const { data: shots, isLoading } = useQuery({
    queryKey: ['director-shot-gallery-shots', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const { data: projectScenes } = await supabase
        .from('scenes')
        .select('id')
        .eq('project_id', selectedProjectId);
      
      if (!projectScenes || projectScenes.length === 0) return [];
      
      const sceneIds = projectScenes.map(s => s.id);
      
      const { data, error } = await supabase
        .from('storyboards')
        .select(`
          id,
          shot_number,
          shot_type,
          camera_angle,
          lighting,
          action,
          review_status,
          scene_id,
          image_url,
          scenes!inner(scene_number, slugline)
        `)
        .in('scene_id', sceneIds)
        .order('shot_number');
      
      if (error) throw error;
      return (data || []) as ShotData[];
    },
    enabled: !!selectedProjectId,
  });

  // Fetch all storyboard images for the entire project
  const { data: allStoryboardImages } = useQuery({
    queryKey: ['project-storyboard-gallery', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const { data: projectScenes } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      
      if (!projectScenes || projectScenes.length === 0) return [];
      
      const sceneIds = projectScenes.map(s => s.id);
      
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, image_url, action, scene_id')
        .in('scene_id', sceneIds)
        .not('image_url', 'is', null)
        .order('shot_number');
      
      if (error) throw error;
      
      // Merge scene info
      return (data || []).map(img => ({
        ...img,
        scene: projectScenes.find(s => s.id === img.scene_id)
      }));
    },
    enabled: !!selectedProjectId && galleryOpen,
  });

  // Filter shots by search
  const filteredShots = shots?.filter(shot => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      shot.shot_number?.toString().includes(search) ||
      shot.shot_type?.toLowerCase().includes(search) ||
      shot.action?.toLowerCase().includes(search) ||
      shot.scenes?.slugline?.toLowerCase().includes(search)
    );
  });

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'revision_requested': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
      case 'revision_requested': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Revision</Badge>;
      case 'pending': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Pending</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-end">
          <DirectorProjectSelector />
        </div>
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-4">
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Select a project to view all shots
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="font-semibold">Shot List</h1>
          <Badge variant="secondary">{filteredShots?.length || 0} shots</Badge>
        </div>
        
        <div className="flex-1" />
        
        {/* View Storyboards Button */}
        <Button
          variant="outline"
          onClick={() => setGalleryOpen(true)}
          className="gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          View Storyboards
        </Button>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <DirectorProjectSelector />
      </div>

      {/* Shot List - Flat View */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredShots && filteredShots.length > 0 ? (
          <div className="p-4 space-y-3">
            {filteredShots.map((shot) => (
              <Card key={shot.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="shrink-0 mt-1">
                      {getStatusIcon(shot.review_status)}
                    </div>
                    
                    {/* Shot Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-base">Shot {shot.shot_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {shot.shot_type || 'N/A'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Scene {shot.scenes?.scene_number} • {shot.scenes?.slugline}
                        </span>
                        {getStatusBadge(shot.review_status)}
                      </div>
                      
                      {/* Technical Details */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Camera className="h-4 w-4 shrink-0" />
                          <span>{shot.camera_angle || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Sun className="h-4 w-4 shrink-0" />
                          <span>{shot.lighting || 'Not specified'}</span>
                        </div>
                      </div>
                      
                      {/* Full Description */}
                      {shot.action && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-foreground leading-relaxed">
                            {shot.action}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No Shots Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'No shots have been created yet'}
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Project Storyboards Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Project Storyboards
              {allStoryboardImages && (
                <Badge variant="secondary" className="ml-2">
                  {allStoryboardImages.length} panels
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[75vh]">
            {allStoryboardImages && allStoryboardImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                {allStoryboardImages.map((img) => (
                  <div key={img.id} className="space-y-2 group">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                      <img
                        src={img.image_url!}
                        alt={`Shot ${img.shot_number}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Scene {img.scene?.scene_number} • Shot {img.shot_number}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {img.scene?.slugline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No storyboard panels generated yet</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}