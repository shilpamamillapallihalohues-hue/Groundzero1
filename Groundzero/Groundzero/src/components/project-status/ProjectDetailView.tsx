import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Users, ListTodo, Film, Box, FileText, Calendar, Clock, 
  CheckCircle2, AlertCircle, Loader2, BarChart3, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

interface WorkTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  employee_id: string;
  employee_name?: string;
  employee_department?: string;
}

interface WorkEmployee {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  department_id: string | null;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  status: string;
  characters: string[] | null;
  props: string[] | null;
}

interface ProjectDeliverable {
  id: string;
  title: string;
  department: string;
  asset_type: string;
  status: string;
  created_at: string;
}

interface ProgressReport {
  id: string;
  progress_notes: string;
  percentage_complete: number;
  report_date: string;
  task_title?: string;
  employee_name?: string;
}

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
}

const PROJECT_STATUSES: Record<string, { label: string; color: string }> = {
  pre_production: { label: 'Pre-Production', color: 'bg-blue-500/20 text-blue-400' },
  production: { label: 'Production', color: 'bg-amber-500/20 text-amber-400' },
  post_production: { label: 'Post-Production', color: 'bg-purple-500/20 text-purple-400' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  on_hold: { label: 'On Hold', color: 'bg-gray-500/20 text-gray-400' },
};

const TASK_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-500/10 text-gray-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500' },
  on_hold: { label: 'On Hold', color: 'bg-yellow-500/10 text-yellow-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500' },
};

const PRIORITIES: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-green-500/10 text-green-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-500' },
};

export function ProjectDetailView({ project, onBack }: ProjectDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [employees, setEmployees] = useState<WorkEmployee[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);

  useEffect(() => {
    loadProjectData();
  }, [project.id]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Load tasks for this project with employee info
      const { data: tasksData, error: tasksError } = await supabase
        .from('work_tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('work_employees')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Map employee names to tasks
      const tasksWithEmployees = (tasksData || []).map(task => {
        const emp = employeesData?.find(e => e.id === task.employee_id);
        return {
          ...task,
          employee_name: emp?.name || 'Unknown',
          employee_department: emp?.department || 'N/A'
        };
      });
      setTasks(tasksWithEmployees);

      // Load scenes for this project
      const { data: scenesData, error: scenesError } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', project.id)
        .order('scene_number');

      if (scenesError) throw scenesError;
      setScenes(scenesData || []);

      // Load deliverables for this project
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('project_deliverables')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (deliverablesError) throw deliverablesError;
      setDeliverables(deliverablesData || []);

      // Load progress reports for tasks in this project
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: reportsData, error: reportsError } = await supabase
          .from('work_progress_reports')
          .select('*')
          .in('task_id', taskIds)
          .order('report_date', { ascending: false })
          .limit(20);

        if (!reportsError && reportsData) {
          const reportsWithInfo = reportsData.map(report => {
            const task = tasksWithEmployees.find(t => t.id === report.task_id);
            return {
              ...report,
              task_title: task?.title || 'Unknown Task',
              employee_name: task?.employee_name || 'Unknown'
            };
          });
          setProgressReports(reportsWithInfo);
        }
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  // Get unique employees working on this project
  const projectEmployees = employees.filter(emp => 
    tasks.some(task => task.employee_id === emp.id)
  );

  // Calculate task stats
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  const completionPercentage = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  // Get all props and characters from scenes
  const allCharacters = scenes.flatMap(s => s.characters || []).filter((v, i, a) => a.indexOf(v) === i);
  const allProps = scenes.flatMap(s => s.props || []).filter((v, i, a) => a.indexOf(v) === i);

  // Deliverables by department
  const deliverablesByDept = deliverables.reduce((acc, d) => {
    acc[d.department] = (acc[d.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusConfig = PROJECT_STATUSES[project.status] || { label: project.status, color: 'bg-muted text-muted-foreground' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground">{project.title}</h2>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mb-2">{project.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {project.genre && <span>Genre: {project.genre}</span>}
              {project.estimated_budget && (
                <span>Budget: ${project.estimated_budget.toLocaleString()}</span>
              )}
              <span>Updated: {format(new Date(project.updated_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ListTodo className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projectEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Film className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scenes.length}</p>
                <p className="text-sm text-muted-foreground">Scenes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {taskStats.completed} Completed
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {taskStats.inProgress} In Progress
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              {taskStats.pending} Pending
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="w-4 h-4" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="w-4 h-4" />
            Team ({projectEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Box className="w-4 h-4" />
            Assets & Props
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="gap-2">
            <FileText className="w-4 h-4" />
            Deliverables ({deliverables.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Tasks</CardTitle>
              <CardDescription>All tasks linked to this project</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tasks assigned to this project yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {tasks.map(task => {
                      const statusConf = TASK_STATUSES[task.status] || { label: task.status, color: '' };
                      const priorityConf = PRIORITIES[task.priority] || { label: task.priority, color: '' };
                      return (
                        <div key={task.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge className={priorityConf.color}>{priorityConf.label}</Badge>
                                <Badge className={statusConf.color}>{statusConf.label}</Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {task.employee_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {task.employee_department}
                                </span>
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Employees working on this project</CardDescription>
            </CardHeader>
            <CardContent>
              {projectEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No team members assigned yet</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {projectEmployees.map(emp => {
                    const empTasks = tasks.filter(t => t.employee_id === emp.id);
                    const empCompleted = empTasks.filter(t => t.status === 'completed').length;
                    return (
                      <div key={emp.id} className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium mb-1">{emp.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {emp.designation || 'Team Member'} • {emp.department || 'N/A'}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{empTasks.length} Tasks</Badge>
                          <Badge variant="outline" className="text-green-500">{empCompleted} Done</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets & Props Tab */}
        <TabsContent value="assets">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Characters</CardTitle>
                <CardDescription>Characters from script breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {allCharacters.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No characters identified</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allCharacters.map((char, idx) => (
                      <Badge key={idx} variant="secondary">{char}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Props</CardTitle>
                <CardDescription>Props from script breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {allProps.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No props identified</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allProps.map((prop, idx) => (
                      <Badge key={idx} variant="outline">{prop}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Scenes</CardTitle>
                <CardDescription>All scenes in this project</CardDescription>
              </CardHeader>
              <CardContent>
                {scenes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No scenes created yet</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {scenes.map(scene => (
                        <div key={scene.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                          <div>
                            <span className="font-medium">Scene {scene.scene_number}</span>
                            <span className="mx-2 text-muted-foreground">—</span>
                            <span className="text-muted-foreground">{scene.slugline}</span>
                          </div>
                          <Badge variant="outline">{scene.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <Card>
            <CardHeader>
              <CardTitle>Project Deliverables</CardTitle>
              <CardDescription>Assets and files uploaded for this project</CardDescription>
            </CardHeader>
            <CardContent>
              {deliverables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No deliverables uploaded yet</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(deliverablesByDept).map(([dept, count]) => (
                      <Badge key={dept} variant="secondary">{dept}: {count}</Badge>
                    ))}
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {deliverables.map(del => (
                        <div key={del.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                          <div>
                            <span className="font-medium">{del.title}</span>
                            <span className="ml-2 text-sm text-muted-foreground">({del.asset_type})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{del.department}</Badge>
                            <Badge variant="secondary">{del.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Progress Reports</CardTitle>
              <CardDescription>Recent work updates from team members</CardDescription>
            </CardHeader>
            <CardContent>
              {progressReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No progress reports submitted yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {progressReports.map(report => (
                      <div key={report.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{report.task_title}</h4>
                            <p className="text-sm text-muted-foreground">By {report.employee_name}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{report.percentage_complete}%</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(report.report_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.progress_notes}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
