import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { 
  Film, 
  Search, 
  Plus,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { NewProjectWithScriptDialog } from '@/components/supervisor/NewProjectWithScriptDialog';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

export default function SupervisorProjects() {
  const navigate = useNavigate();
  const { setSelectedProjectId } = useProjectContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  // Fetch only assigned projects based on role
  const { data: projects, isLoading } = useAssignedProjects();

  // Fetch script versions count per project
  const { data: scriptStats } = useQuery({
    queryKey: ['supervisor-script-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('script_versions')
        .select('project_id');
      
      if (error) throw error;
      
      // Count versions per project
      const counts: Record<string, number> = {};
      data?.forEach(v => {
        counts[v.project_id] = (counts[v.project_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch scene counts per project
  const { data: sceneCounts } = useQuery({
    queryKey: ['supervisor-scene-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('project_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(s => {
        counts[s.project_id] = (counts[s.project_id] || 0) + 1;
      });
      return counts;
    },
  });

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate('/supervisor/script-breakdown');
  };

  const handleNewProjectSuccess = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate('/supervisor/script-breakdown');
  };

  const getScriptStatus = (projectId: string) => {
    const versions = scriptStats?.[projectId] || 0;
    const scenes = sceneCounts?.[projectId] || 0;
    
    if (versions === 0) return { label: 'No Script', color: 'secondary', icon: AlertCircle };
    if (scenes === 0) return { label: 'Script Only', color: 'warning', icon: Clock };
    return { label: 'Breakdown Done', color: 'success', icon: CheckCircle2 };
  };

  const filteredProjects = projects?.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <PageLoader text="Loading projects..." />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">Script status for assigned projects</p>
          </div>
        </div>

        <Button onClick={() => setNewProjectOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {searchTerm ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? 'Try a different search term' : 'Create your first project to start'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setNewProjectOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const status = getScriptStatus(project.id);
            const StatusIcon = status.icon;
            const versions = scriptStats?.[project.id] || 0;
            const scenes = sceneCounts?.[project.id] || 0;

            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {project.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}

                  {/* Script Stats */}
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{versions} versions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{scenes} scenes</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge 
                    variant={status.color === 'success' ? 'default' : status.color === 'warning' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewProjectWithScriptDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onSuccess={handleNewProjectSuccess}
      />
    </div>
  );
}
