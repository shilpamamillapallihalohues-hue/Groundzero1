import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useProductionRole } from '@/hooks/useProductionRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Film, Pencil, Calendar, DollarSign, Tag, Eye } from 'lucide-react';
import { ProjectDetailView } from '@/components/project-status/ProjectDetailView';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  genre: string | null;
  estimated_budget: number | null;
  created_at: string;
  updated_at: string;
}

const PROJECT_STATUSES = [
  { value: 'pre_production', label: 'Pre-Production', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'production', label: 'Production', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'post_production', label: 'Post-Production', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-gray-500/20 text-gray-400' },
];

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Fantasy', 'Horror', 'Musical', 'Mystery', 'Romance',
  'Sci-Fi', 'Thriller', 'War', 'Western'
];

export default function ProjectStatus() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { canAccessPage, isLoading: permLoading } = usePagePermissions();
  const { isProductionManager, isLoading: roleLoading } = useProductionRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (!authLoading && !permLoading && !roleLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
        return;
      }
      // Production Manager can always access project status
      const hasAccess = isProductionManager || canAccessPage('project-status');
      if (!hasAccess) {
        navigate('/');
        return;
      }
      loadProjects();
    }
  }, [authLoading, permLoading, roleLoading, isAuthenticated, canAccessPage, isProductionManager, navigate]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setTitle(project.title);
    setDescription(project.description || '');
    setStatus(project.status);
    setGenre(project.genre || '');
    setBudget(project.estimated_budget?.toString() || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProject || !title.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          status,
          genre: genre || null,
          estimated_budget: budget ? parseFloat(budget) : null
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast.success('Project updated successfully');
      setDialogOpen(false);
      loadProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusConfig = PROJECT_STATUSES.find(s => s.value === statusValue);
    return statusConfig || { label: statusValue, color: 'bg-muted text-muted-foreground' };
  };

  if (authLoading || permLoading || roleLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Show project detail view when a project is selected
  if (selectedProject) {
    return (
      <MainLayout>
        <ProjectDetailView 
          project={selectedProject} 
          onBack={() => setSelectedProject(null)} 
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Film className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Status</h1>
            <p className="text-muted-foreground">Click on a project to view complete details and reports</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No projects found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => {
              const statusBadge = getStatusBadge(project.status);
              return (
                <Card 
                  key={project.id} 
                  className="hover:border-primary/40 transition-colors cursor-pointer group"
                  onClick={() => setSelectedProject(project)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {project.title}
                          </h3>
                          <Badge className={statusBadge.color}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {project.genre && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-4 h-4" />
                              <span>{project.genre}</span>
                            </div>
                          )}
                          {project.estimated_budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>${project.estimated_budget.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                          }} 
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => openEdit(project, e)} className="gap-2">
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {GENRES.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estimated Budget ($)</Label>
                <Input 
                  type="number" 
                  value={budget} 
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., 100000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
