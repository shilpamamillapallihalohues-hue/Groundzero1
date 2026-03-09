import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useTeamLead } from '@/hooks/useTeamLead';
import { useProductionRole } from '@/hooks/useProductionRole';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardList, Users, ListTodo, FileText, Loader2, Plus, Crown } from 'lucide-react';
import { EmployeesTab } from '@/components/work-tracking/EmployeesTab';
import { TasksTab } from '@/components/work-tracking/TasksTab';
import { ProgressReportsTab } from '@/components/work-tracking/ProgressReportsTab';

export interface WorkEmployee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  profile_id: string | null;
  is_active: boolean;
  created_at: string;
  department_id?: string | null;
}

export interface WorkTask {
  id: string;
  title: string;
  description: string | null;
  employee_id: string;
  assigned_by: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  project_id: string | null;
  employee?: WorkEmployee;
}

export interface WorkProgressReport {
  id: string;
  task_id: string;
  report_date: string;
  progress_notes: string;
  percentage_complete: number;
  image_urls: string[];
  created_by: string | null;
  created_at: string;
  task?: WorkTask;
}

export default function WorkTracking() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { canAccessPage, isAdmin, isLoading: permissionsLoading } = usePagePermissions();
  const { isTeamLead, departmentName, isLoading: teamLeadLoading } = useTeamLead();
  const { isProductionManager, isLoading: roleLoading } = useProductionRole();
  
  const [employees, setEmployees] = useState<WorkEmployee[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [reports, setReports] = useState<WorkProgressReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('employees');

  useEffect(() => {
    if (!authLoading && !permissionsLoading && !teamLeadLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      // Check if user has access: Admin, Production Manager, Team Lead, or explicit page permission
      const hasAccess = isAdmin || isProductionManager || isTeamLead || canAccessPage('work-tracking');
      if (!hasAccess) {
        toast.error('Access denied. You do not have permission to access this page.');
        navigate('/');
        return;
      }
      loadData();
    }
  }, [user, isAdmin, isProductionManager, isTeamLead, authLoading, permissionsLoading, teamLeadLoading, roleLoading, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('work_employees')
        .select('*')
        .order('name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Load tasks with employee info
      const { data: tasksData, error: tasksError } = await supabase
        .from('work_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      
      // Map employee data to tasks
      const tasksWithEmployees = (tasksData || []).map(task => ({
        ...task,
        employee: employeesData?.find(e => e.id === task.employee_id)
      }));
      setTasks(tasksWithEmployees);

      // Load progress reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('work_progress_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (reportsError) throw reportsError;
      
      // Map task data to reports
      const reportsWithTasks = (reportsData || []).map(report => ({
        ...report,
        task: tasksWithEmployees.find(t => t.id === report.task_id)
      }));
      setReports(reportsWithTasks);

    } catch (error) {
      console.error('Error loading work tracking data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || permissionsLoading || teamLeadLoading || roleLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Daily Work Tracking</h1>
              <p className="text-muted-foreground">Manage employees, tasks, and daily progress reports</p>
            </div>
          </div>
          {isTeamLead && departmentName && (
            <Badge variant="outline" className="gap-2 py-1.5 px-3 bg-amber-500/10 text-amber-500 border-amber-500/30">
              <Crown className="w-4 h-4" />
              Team Lead: {departmentName}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees ({employees.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Progress Reports ({reports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeesTab 
              employees={employees} 
              onRefresh={loadData} 
            />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab 
              tasks={tasks} 
              employees={employees}
              onRefresh={loadData} 
            />
          </TabsContent>

          <TabsContent value="reports">
            <ProgressReportsTab 
              reports={reports}
              tasks={tasks}
              onRefresh={loadData} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}