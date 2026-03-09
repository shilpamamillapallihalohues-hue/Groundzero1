import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, Search, Trash2, MoreVertical } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { getTasks, updateTaskStatus, deleteTask } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { ProductionTaskDialog } from '@/components/tasks/ProductionTaskDialog';

export default function Tasks() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { role } = useUserRole();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showProductionTask, setShowProductionTask] = useState(false);
  
  // Check if user can create production tasks (Production Head, HOD, Producer, Production Manager)
  const canCreateProductionTask = ['production_head', 'production_manager', 'hod', 'producer', 'super_user', 'admin'].includes(role || '');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTasks();
    }
  }, [isAuthenticated]);

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoadingData(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      await loadTasks();
      toast.success('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteTask(taskToDelete.id);
      toast.success(`Task "${taskToDelete.title}" deleted`);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const columns = [
    { title: 'To Do', status: 'todo', tasks: tasks.filter(t => t.status === 'todo') },
    { title: 'In Progress', status: 'in_progress', tasks: tasks.filter(t => t.status === 'in_progress') },
    { title: 'Review', status: 'review', tasks: tasks.filter(t => t.status === 'review') },
    { title: 'Done', status: 'done', tasks: tasks.filter(t => t.status === 'done') },
  ];

  const columnColors: Record<string, string> = {
    todo: 'border-muted-foreground/30',
    in_progress: 'border-info/50',
    review: 'border-warning/50',
    done: 'border-success/50',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-info/20 text-info',
    high: 'bg-warning/20 text-warning',
    urgent: 'bg-destructive/20 text-destructive',
  };

  const departmentColors: Record<string, string> = {
    direction: 'bg-primary/20 text-primary',
    cinematography: 'bg-info/20 text-info',
    art: 'bg-success/20 text-success',
    costume: 'bg-pink-500/20 text-pink-400',
    vfx: 'bg-purple-500/20 text-purple-400',
    sound: 'bg-warning/20 text-warning',
    production: 'bg-secondary text-secondary-foreground',
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Board</h1>
            <p className="text-muted-foreground mt-1">
              Track production tasks across all departments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            {canCreateProductionTask ? (
              <Button variant="gold" className="gap-2" onClick={() => setShowProductionTask(true)}>
                <Plus className="w-4 h-4" />
                Assign Task
              </Button>
            ) : (
              <Button variant="gold" className="gap-2" onClick={() => setShowNewTask(true)}>
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        {loadingData ? (
          <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div key={column.status} className="flex flex-col min-w-[300px] w-[300px]">
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-t-xl border-t-2 bg-card",
                  columnColors[column.status]
                )}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{column.title}</h3>
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {column.tasks.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-3 space-y-3 bg-secondary/30 rounded-b-xl border border-t-0 border-border min-h-[400px]">
                  {column.tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No tasks
                    </div>
                  ) : (
                    column.tasks.map((task, index) => (
                      <div 
                        key={task.id}
                        className="group relative p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Actions Menu */}
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => handleDeleteClick(e, task)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className={cn("text-xs capitalize", priorityColors[task.priority])}>
                            {task.priority}
                          </Badge>
                        </div>

                        <h4 className="font-medium text-foreground mb-2 line-clamp-2 pr-6">{task.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>

                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium capitalize",
                            departmentColors[task.department] || 'bg-secondary text-secondary-foreground'
                          )}>
                            {task.department}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
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

      <NewTaskDialog
        open={showNewTask}
        onOpenChange={setShowNewTask}
        onSuccess={loadTasks}
      />

      <ProductionTaskDialog
        open={showProductionTask}
        onOpenChange={setShowProductionTask}
        onSuccess={loadTasks}
      />
    </MainLayout>
  );
}
