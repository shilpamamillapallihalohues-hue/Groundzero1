import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Clapperboard, Trash2, MoreVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { getProjects, deleteProject, renameProject } from '@/lib/api';
import { toast } from 'sonner';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Projects() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Rename state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<any>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

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

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      toast.success(`"${projectToDelete.title}" deleted successfully`);
      loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setProjectToRename(project);
    setNewProjectName(project.title);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!projectToRename || !newProjectName.trim()) return;
    
    setIsRenaming(true);
    try {
      await renameProject(projectToRename.id, newProjectName.trim());
      toast.success(`Project renamed to "${newProjectName.trim()}"`);
      loadProjects();
    } catch (error) {
      console.error('Error renaming project:', error);
      toast.error('Failed to rename project');
    } finally {
      setIsRenaming(false);
      setRenameDialogOpen(false);
      setProjectToRename(null);
      setNewProjectName('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header - simplified, no title */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <Button variant="gold" className="gap-2" onClick={() => setShowNewProject(true)}>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Projects Grid */}
      {loadingData ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Clapperboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try a different search term' : 'Create your first project to get started'}
          </p>
          {!searchTerm && (
            <Button variant="gold" onClick={() => setShowNewProject(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <div 
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-500 hover:border-primary/40 hover:shadow-xl cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
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
                      onClick={(e) => handleRenameClick(e, project)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename Project
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDeleteClick(e, project)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative h-32 bg-gradient-to-br from-secondary via-accent to-muted overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <Clapperboard className="w-10 h-10 text-primary/60" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {project.description || 'No description'}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {project.genre || 'Unspecified'}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {project.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewProjectDialog 
        open={showNewProject} 
        onOpenChange={setShowNewProject}
        onSuccess={loadProjects}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.title}"? This will permanently remove the project and all its scenes, storyboards, and tasks. This action cannot be undone.
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for "{projectToRename?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename} disabled={isRenaming || !newProjectName.trim()}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
