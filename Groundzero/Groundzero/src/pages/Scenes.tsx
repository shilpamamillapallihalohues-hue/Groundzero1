import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Grid, List, Plus, Search, Wand2, Clapperboard, Trash2, MoreVertical } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { getProjects, getProjectScenes, deleteScene } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Scenes() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(searchParams.get('project') || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedProjectId) {
      loadScenes(selectedProjectId);
      setSearchParams({ project: selectedProjectId });
    } else {
      setScenes([]);
      setLoadingData(false);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (!selectedProjectId && data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      } else if (!selectedProjectId) {
        setLoadingData(false);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
      setLoadingData(false);
    }
  };

  const loadScenes = async (projectId: string) => {
    setLoadingData(true);
    try {
      const data = await getProjectScenes(projectId);
      setScenes(data || []);
    } catch (error) {
      console.error('Error loading scenes:', error);
      toast.error('Failed to load scenes');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, scene: any) => {
    e.stopPropagation();
    setSceneToDelete(scene);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sceneToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteScene(sceneToDelete.id);
      toast.success(`Scene ${sceneToDelete.scene_number} deleted`);
      loadScenes(selectedProjectId);
    } catch (error) {
      console.error('Error deleting scene:', error);
      toast.error('Failed to delete scene');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSceneToDelete(null);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const filteredScenes = scenes.filter(s => 
    s.slugline.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const statusVariants: Record<string, 'secondary' | 'info' | 'warning' | 'success'> = {
    not_started: 'secondary',
    in_progress: 'info',
    review: 'warning',
    approved: 'success',
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Scene Management</h1>
            <p className="text-muted-foreground mt-1">
              {selectedProject ? `${selectedProject.title} • ${scenes.length} Scenes` : 'Select a project'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px] bg-secondary/50">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/breakdown')}>
              <Wand2 className="w-4 h-4" />
              AI Breakdown
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Clapperboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">Create a project first to manage scenes</p>
            <Button variant="gold" onClick={() => navigate('/projects')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search scenes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
                <div className="flex border border-border rounded-lg p-1">
                  <Button 
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scene Grid */}
            {loadingData ? (
              <div className="text-center py-12 text-muted-foreground">Loading scenes...</div>
            ) : filteredScenes.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Clapperboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm ? 'No scenes found' : 'No scenes in this project'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try a different search term' : 'Upload a script to add scenes'}
                </p>
                {!searchTerm && (
                  <Button variant="gold" onClick={() => navigate('/breakdown')}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Upload Script
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              )}>
                {filteredScenes.map((scene, index) => (
                  <div 
                    key={scene.id}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/breakdown?project=${selectedProjectId}`)}
                  >
                    {/* Actions Menu */}
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteClick(e, scene)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Scene
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="absolute top-14 right-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{scene.scene_number}</span>
                      </div>
                    </div>

                    <Badge variant={statusVariants[scene.status] || 'secondary'} className="mb-3">
                      {scene.status?.replace('_', ' ')}
                    </Badge>

                    <h3 className="text-base font-semibold text-foreground mb-2 pr-12 group-hover:text-primary transition-colors">
                      {scene.slugline}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {scene.description || 'No description'}
                    </p>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{scene.location}</span>
                      <span>•</span>
                      <span className="capitalize">{scene.time_of_day}</span>
                      {scene.vfx_required && (
                        <>
                          <span>•</span>
                          <span className="text-purple-400">VFX</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scene</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Scene {sceneToDelete?.scene_number} "{sceneToDelete?.slugline}"? This will also delete all associated storyboards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
