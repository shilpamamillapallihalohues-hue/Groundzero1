import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ListTodo, Calendar, User, Clock, Download, FolderKanban } from 'lucide-react';
import { WorkTask, WorkEmployee } from '@/pages/WorkTracking';
import { format } from 'date-fns';
import { exportToExcel, taskExportColumns } from '@/lib/excelExport';

interface Project {
  id: string;
  title: string;
}

interface TasksTabProps {
  tasks: WorkTask[];
  employees: WorkEmployee[];
  onRefresh: () => void;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-green-500/10 text-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-500' },
];

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-500/10 text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/10 text-green-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-500/10 text-yellow-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-500' },
];

export function TasksTab({ tasks, employees, onRefresh }: TasksTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    employee_id: '',
    priority: 'medium',
    due_date: '',
    project_id: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title')
      .order('title');
    if (!error && data) {
      setProjects(data);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      employee_id: '',
      priority: 'medium',
      due_date: '',
      project_id: '',
    });
    setEditingTask(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: WorkTask) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      employee_id: task.employee_id,
      priority: task.priority,
      due_date: task.due_date || '',
      project_id: task.project_id || '',
    });
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.employee_id) {
      toast.error('Please select an employee');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('work_tasks')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            employee_id: formData.employee_id,
            priority: formData.priority,
            due_date: formData.due_date || null,
            project_id: formData.project_id || null,
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('work_tasks')
          .insert({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            employee_id: formData.employee_id,
            priority: formData.priority,
            due_date: formData.due_date || null,
            project_id: formData.project_id || null,
          });

        if (error) throw error;
        toast.success('Task created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportTasks = () => {
    const exportData = filteredTasks.map(task => ({
      ...task,
      employee: employees.find(e => e.id === task.employee_id),
      project: projects.find(p => p.id === task.project_id),
    }));
    exportToExcel(exportData, taskExportColumns, `tasks_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Tasks exported successfully');
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('work_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task status updated');
      onRefresh();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (task: WorkTask) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"? This will also delete all progress reports for this task.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('work_tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;
      toast.success('Task deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return <Badge className={p?.color}>{p?.label || priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return <Badge className={s?.color}>{s?.label || status}</Badge>;
  };

  const filteredTasks = tasks.filter(task => {
    if (filterEmployee !== 'all' && task.employee_id !== filterEmployee) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterProject !== 'all' && task.project_id !== filterProject) return false;
    return true;
  });

  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Assign and track tasks for employees</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportTasks} disabled={filteredTasks.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} disabled={activeEmployees.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Enter task details and assign to an employee'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee">Assign To *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.designation ? `(${emp.designation})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {activeEmployees.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No employees available</h3>
            <p className="text-muted-foreground">Add employees first before creating tasks</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">Create your first task to start tracking work</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Employee:</Label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Status:</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Project:</Label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <div key={task.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-medium text-foreground">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{task.employee?.name || 'Unknown'}</span>
                        </div>
                        {task.project_id && (
                          <div className="flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            <span>{projects.find(p => p.id === task.project_id)?.title || 'Unknown Project'}</span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(task)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(task)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No tasks match the selected filters</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}