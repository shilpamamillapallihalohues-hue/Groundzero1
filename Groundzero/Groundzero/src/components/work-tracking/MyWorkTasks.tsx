import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ListTodo, Calendar, FolderKanban, FileText, Plus, Upload, X, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-500/10 text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/10 text-green-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-500/10 text-yellow-500' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-green-500/10 text-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-500' },
];

interface WorkTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  project_id: string | null;
  created_at: string;
  project?: { title: string } | null;
}

interface ProgressReport {
  id: string;
  task_id: string;
  report_date: string;
  progress_notes: string;
  percentage_complete: number;
  image_urls: string[] | null;
  created_at: string;
}

export function MyWorkTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reportForm, setReportForm] = useState({
    progress_notes: '',
    percentage_complete: 0,
    image_urls: [] as string[],
  });

  // Find the work_employee record linked to this user's profile
  const { data: workEmployee, isLoading: employeeLoading } = useQuery({
    queryKey: ['my-work-employee', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First get profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) return null;
      
      // Then find work_employee with this profile_id
      const { data: employee } = await supabase
        .from('work_employees')
        .select('id, name')
        .eq('profile_id', profile.id)
        .single();
      
      return employee;
    },
    enabled: !!user?.id
  });

  // Fetch work tasks assigned to this employee
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-work-tasks', workEmployee?.id],
    queryFn: async () => {
      if (!workEmployee?.id) return [];
      
      const { data } = await supabase
        .from('work_tasks')
        .select('id, title, description, priority, status, due_date, project_id, created_at')
        .eq('employee_id', workEmployee.id)
        .order('created_at', { ascending: false });
      
      if (!data) return [];
      
      // Fetch project titles
      const projectIds = [...new Set(data.filter(t => t.project_id).map(t => t.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000']);
      
      return data.map(task => ({
        ...task,
        project: projects?.find(p => p.id === task.project_id) || null
      }));
    },
    enabled: !!workEmployee?.id
  });

  // Fetch progress reports for selected task
  const { data: taskReports } = useQuery({
    queryKey: ['task-reports', selectedTask?.id],
    queryFn: async () => {
      if (!selectedTask?.id) return [];
      
      const { data } = await supabase
        .from('work_progress_reports')
        .select('*')
        .eq('task_id', selectedTask.id)
        .order('report_date', { ascending: false });
      
      return data || [];
    },
    enabled: !!selectedTask?.id
  });

  const resetReportForm = () => {
    setReportForm({
      progress_notes: '',
      percentage_complete: taskReports?.[0]?.percentage_complete || 0,
      image_urls: [],
    });
  };

  const openReportDialog = (task: WorkTask) => {
    setSelectedTask(task);
    resetReportForm();
    setIsReportDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImageUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('work-progress-images')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('work-progress-images')
          .getPublicUrl(data.path);

        newImageUrls.push(urlData.publicUrl);
      }

      if (newImageUrls.length > 0) {
        setReportForm(prev => ({
          ...prev,
          image_urls: [...prev.image_urls, ...newImageUrls]
        }));
        toast.success(`${newImageUrls.length} image(s) uploaded`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setReportForm(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReport = async () => {
    if (!selectedTask || !reportForm.progress_notes.trim()) {
      toast.error('Progress notes are required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('work_progress_reports')
        .insert({
          task_id: selectedTask.id,
          report_date: format(new Date(), 'yyyy-MM-dd'),
          progress_notes: reportForm.progress_notes.trim(),
          percentage_complete: reportForm.percentage_complete,
          image_urls: reportForm.image_urls,
          created_by: user?.id
        });

      if (error) throw error;

      // Update task status if completed
      if (reportForm.percentage_complete === 100) {
        await supabase
          .from('work_tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', selectedTask.id);
      } else if (selectedTask.status === 'pending') {
        await supabase
          .from('work_tasks')
          .update({ status: 'in_progress' })
          .eq('id', selectedTask.id);
      }

      toast.success('Progress report submitted');
      setIsReportDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-work-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-reports'] });
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsSaving(false);
    }
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
      queryClient.invalidateQueries({ queryKey: ['my-work-tasks'] });
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update status');
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

  if (employeeLoading || tasksLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workEmployee) {
    return null; // User is not linked as a work employee
  }

  const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingTasks}</p>
                <p className="text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{inProgressTasks}</p>
                <p className="text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedTasks}</p>
                <p className="text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            My Assigned Tasks
          </CardTitle>
          <CardDescription>Tasks assigned to you by production manager</CardDescription>
        </CardHeader>
        <CardContent>
          {!tasks || tasks.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <ListTodo className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium text-foreground mb-1">No tasks assigned</h3>
              <p className="text-sm text-muted-foreground">Tasks will appear here when assigned by your manager</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-medium text-foreground">{task.title}</h4>
                        {getPriorityBadge(task.priority || 'medium')}
                        {getStatusBadge(task.status || 'pending')}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {task.project && (
                          <div className="flex items-center gap-1">
                            <FolderKanban className="w-3 h-3" />
                            <span>{task.project.title}</span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={task.status || 'pending'}
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
                      <Button size="sm" onClick={() => openReportDialog(task)}>
                        <FileText className="w-4 h-4 mr-1" />
                        Report
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Progress Report</DialogTitle>
            <DialogDescription>
              {selectedTask?.title} - Record your daily progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="progress_notes">Progress Notes *</Label>
              <Textarea
                id="progress_notes"
                value={reportForm.progress_notes}
                onChange={(e) => setReportForm(prev => ({ ...prev, progress_notes: e.target.value }))}
                placeholder="Describe today's progress, what was accomplished, any blockers..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Completion: {reportForm.percentage_complete}%</Label>
              <Slider
                value={[reportForm.percentage_complete]}
                onValueChange={([value]) => setReportForm(prev => ({ ...prev, percentage_complete: value }))}
                max={100}
                step={5}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Images</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Images
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Max 5MB per image</p>
                </div>

                {reportForm.image_urls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {reportForm.image_urls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Previous Reports */}
            {taskReports && taskReports.length > 0 && (
              <div className="space-y-2">
                <Label>Previous Reports</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {taskReports.slice(0, 3).map(report => (
                    <div key={report.id} className="text-sm p-2 bg-muted/50 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{format(new Date(report.report_date), 'MMM d, yyyy')}</span>
                        <Badge variant="outline">{report.percentage_complete}%</Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{report.progress_notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={isSaving || isUploading}>
              {isSaving ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
