import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, CheckCircle, Clock, AlertCircle, BarChart3, Download, FolderKanban } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  exportToExcel, 
  departmentReportExportColumns, 
  employeeProgressExportColumns,
  projectReportExportColumns 
} from '@/lib/excelExport';

interface Department {
  id: string;
  name: string;
  color: string;
  team_lead_id: string | null;
}

interface Project {
  id: string;
  title: string;
}

interface TaskStats {
  department_id: string;
  department_name: string;
  color: string;
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

interface ProjectStats {
  project_id: string;
  project_name: string;
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

interface EmployeeProgress {
  id: string;
  name: string;
  department_id: string | null;
  department_name: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  recent_updates: number;
}

export default function DepartmentReports() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { canAccessPage, isLoading: permLoading } = usePagePermissions();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [employeeProgress, setEmployeeProgress] = useState<EmployeeProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !permLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
        return;
      }
      if (!canAccessPage('department-reports')) {
        navigate('/');
        return;
      }
      loadData();
    }
  }, [authLoading, permLoading, isAuthenticated, canAccessPage, navigate]);

  const loadData = async () => {
    try {
      // Fetch departments
      const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (deptError) throw deptError;
      setDepartments(depts || []);

      // Fetch projects
      const { data: projs, error: projError } = await supabase
        .from('projects')
        .select('id, title')
        .order('title');
      
      if (projError) throw projError;
      setProjects(projs || []);

      // Fetch employees with their departments
      const { data: employees, error: empError } = await supabase
        .from('work_employees')
        .select('*');
      
      if (empError) throw empError;

      // Fetch tasks
      const { data: tasks, error: taskError } = await supabase
        .from('work_tasks')
        .select('*');
      
      if (taskError) throw taskError;

      // Fetch recent progress reports (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: reports, error: repError } = await supabase
        .from('work_progress_reports')
        .select('*')
        .gte('created_at', weekAgo.toISOString());
      
      if (repError) throw repError;

      // Calculate department stats
      const deptMap = new Map<string, Department>();
      (depts || []).forEach(d => deptMap.set(d.id, d));

      // Calculate task stats per department
      const empDeptMap = new Map<string, string>();
      (employees || []).forEach(e => {
        if (e.department_id) empDeptMap.set(e.id, e.department_id);
      });

      const statsMap = new Map<string, TaskStats>();
      (depts || []).forEach(d => {
        statsMap.set(d.id, {
          department_id: d.id,
          department_name: d.name,
          color: d.color,
          total: 0,
          pending: 0,
          in_progress: 0,
          completed: 0
        });
      });

      // Add "Unassigned" department for employees without department
      statsMap.set('unassigned', {
        department_id: 'unassigned',
        department_name: 'Unassigned',
        color: '#9ca3af',
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0
      });

      // Calculate project stats
      const projMap = new Map<string, Project>();
      (projs || []).forEach(p => projMap.set(p.id, p));

      const projStatsMap = new Map<string, ProjectStats>();
      projStatsMap.set('no-project', {
        project_id: 'no-project',
        project_name: 'No Project',
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0
      });

      (projs || []).forEach(p => {
        projStatsMap.set(p.id, {
          project_id: p.id,
          project_name: p.title,
          total: 0,
          pending: 0,
          in_progress: 0,
          completed: 0
        });
      });

      (tasks || []).forEach(t => {
        // Department stats
        const deptId = empDeptMap.get(t.employee_id) || 'unassigned';
        const stats = statsMap.get(deptId);
        if (stats) {
          stats.total++;
          if (t.status === 'completed') stats.completed++;
          else if (t.status === 'in_progress') stats.in_progress++;
          else stats.pending++;
        }

        // Project stats
        const projId = t.project_id || 'no-project';
        const projStat = projStatsMap.get(projId);
        if (projStat) {
          projStat.total++;
          if (t.status === 'completed') projStat.completed++;
          else if (t.status === 'in_progress') projStat.in_progress++;
          else projStat.pending++;
        }
      });

      setTaskStats(Array.from(statsMap.values()).filter(s => s.total > 0));
      setProjectStats(Array.from(projStatsMap.values()).filter(s => s.total > 0));

      // Calculate employee progress
      const empProgress: EmployeeProgress[] = (employees || []).map(emp => {
        const empTasks = (tasks || []).filter(t => t.employee_id === emp.id);
        const completedTasks = empTasks.filter(t => t.status === 'completed').length;
        const recentUpdates = (reports || []).filter(r => 
          empTasks.some(t => t.id === r.task_id)
        ).length;

        const dept = emp.department_id ? deptMap.get(emp.department_id) : null;

        return {
          id: emp.id,
          name: emp.name,
          department_id: emp.department_id,
          department_name: dept?.name || 'Unassigned',
          total_tasks: empTasks.length,
          completed_tasks: completedTasks,
          completion_rate: empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : 0,
          recent_updates: recentUpdates
        };
      });

      setEmployeeProgress(empProgress.sort((a, b) => b.completion_rate - a.completion_rate));

    } catch (error) {
      console.error('Error loading department reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDepartments = () => {
    exportToExcel(taskStats, departmentReportExportColumns, `department_report_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Department report exported');
  };

  const handleExportProjects = () => {
    exportToExcel(projectStats, projectReportExportColumns, `project_report_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Project report exported');
  };

  const handleExportEmployees = () => {
    exportToExcel(employeeProgress, employeeProgressExportColumns, `employee_progress_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Employee progress exported');
  };

  if (authLoading || permLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const totalTasks = taskStats.reduce((acc, s) => acc + s.total, 0);
  const totalCompleted = taskStats.reduce((acc, s) => acc + s.completed, 0);
  const totalInProgress = taskStats.reduce((acc, s) => acc + s.in_progress, 0);
  const totalPending = taskStats.reduce((acc, s) => acc + s.pending, 0);

  const pieData = [
    { name: 'Completed', value: totalCompleted, color: '#10b981' },
    { name: 'In Progress', value: totalInProgress, color: '#f59e0b' },
    { name: 'Pending', value: totalPending, color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Department Reports</h1>
            <p className="text-muted-foreground">Task summaries and employee progress by department and project</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTasks}</p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCompleted}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalInProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">By Department</TabsTrigger>
            <TabsTrigger value="projects">By Project</TabsTrigger>
            <TabsTrigger value="employees">Employee Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tasks by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {taskStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={taskStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="department_name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="completed" name="Completed" fill="#10b981" />
                        <Bar dataKey="in_progress" name="In Progress" fill="#f59e0b" />
                        <Bar dataKey="pending" name="Pending" fill="#6b7280" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No task data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No task data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleExportDepartments} disabled={taskStats.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            {taskStats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No department data available
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {taskStats.map(stat => (
                  <Card key={stat.department_id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: stat.color }} />
                        <CardTitle className="text-lg">{stat.department_name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Completion Rate</span>
                        <span className="font-medium">
                          {stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stat.total > 0 ? (stat.completed / stat.total) * 100 : 0} 
                        className="h-2"
                      />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-green-500/10">
                          <p className="text-lg font-bold text-green-500">{stat.completed}</p>
                          <p className="text-xs text-muted-foreground">Done</p>
                        </div>
                        <div className="p-2 rounded bg-yellow-500/10">
                          <p className="text-lg font-bold text-yellow-500">{stat.in_progress}</p>
                          <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                        <div className="p-2 rounded bg-muted">
                          <p className="text-lg font-bold">{stat.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleExportProjects} disabled={projectStats.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            {projectStats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No project data available
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderKanban className="w-5 h-5" />
                      Tasks by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={projectStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="project_name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="completed" name="Completed" fill="#10b981" />
                        <Bar dataKey="in_progress" name="In Progress" fill="#f59e0b" />
                        <Bar dataKey="pending" name="Pending" fill="#6b7280" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projectStats.map(stat => (
                    <Card key={stat.project_id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-primary" />
                          <CardTitle className="text-lg">{stat.project_name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completion Rate</span>
                          <span className="font-medium">
                            {stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}%
                          </span>
                        </div>
                        <Progress 
                          value={stat.total > 0 ? (stat.completed / stat.total) * 100 : 0} 
                          className="h-2"
                        />
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded bg-green-500/10">
                            <p className="text-lg font-bold text-green-500">{stat.completed}</p>
                            <p className="text-xs text-muted-foreground">Done</p>
                          </div>
                          <div className="p-2 rounded bg-yellow-500/10">
                            <p className="text-lg font-bold text-yellow-500">{stat.in_progress}</p>
                            <p className="text-xs text-muted-foreground">Active</p>
                          </div>
                          <div className="p-2 rounded bg-muted">
                            <p className="text-lg font-bold">{stat.pending}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleExportEmployees} disabled={employeeProgress.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Employee Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {employeeProgress.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No employee data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employeeProgress.map(emp => (
                      <div key={emp.id} className="flex items-center gap-4 p-4 rounded-lg border">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-sm font-bold text-primary-foreground">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground truncate">{emp.name}</p>
                            <Badge variant="outline" className="text-xs">{emp.department_name}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{emp.total_tasks} tasks</span>
                            <span>{emp.completed_tasks} completed</span>
                            <span>{emp.recent_updates} updates (7d)</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">{emp.completion_rate}%</p>
                          <Progress value={emp.completion_rate} className="w-24 h-2 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}