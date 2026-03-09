import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, Calendar, Image, Upload, X, Loader2, Download } from 'lucide-react';
import { WorkTask, WorkProgressReport } from '@/pages/WorkTracking';
import { format } from 'date-fns';
import { exportToExcel, ExportColumn } from '@/lib/excelExport';

const progressReportExportColumns: ExportColumn[] = [
  { header: 'Task', accessor: (row) => row.task?.title || 'Unknown' },
  { header: 'Employee', accessor: (row) => row.task?.employee?.name || 'Unknown' },
  { header: 'Report Date', accessor: (row) => row.report_date ? format(new Date(row.report_date), 'yyyy-MM-dd') : '' },
  { header: 'Progress Notes', accessor: 'progress_notes' },
  { header: 'Completion %', accessor: 'percentage_complete' },
  { header: 'Images Count', accessor: (row) => row.image_urls?.length || 0 },
  { header: 'Image 1 URL', accessor: (row) => row.image_urls?.[0] || '' },
  { header: 'Image 2 URL', accessor: (row) => row.image_urls?.[1] || '' },
  { header: 'Image 3 URL', accessor: (row) => row.image_urls?.[2] || '' },
  { header: 'Image 4 URL', accessor: (row) => row.image_urls?.[3] || '' },
  { header: 'Image 5 URL', accessor: (row) => row.image_urls?.[4] || '' },
  { header: 'All Image URLs', accessor: (row) => row.image_urls?.join(' | ') || '' },
];

interface ProgressReportsTabProps {
  reports: WorkProgressReport[];
  tasks: WorkTask[];
  onRefresh: () => void;
}

export function ProgressReportsTab({ reports, tasks, onRefresh }: ProgressReportsTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterTask, setFilterTask] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    task_id: '',
    report_date: format(new Date(), 'yyyy-MM-dd'),
    progress_notes: '',
    percentage_complete: 0,
    image_urls: [] as string[],
  });

  const [uploadingImages, setUploadingImages] = useState<string[]>([]);

  const resetForm = () => {
    setFormData({
      task_id: '',
      report_date: format(new Date(), 'yyyy-MM-dd'),
      progress_notes: '',
      percentage_complete: 0,
      image_urls: [],
    });
    setUploadingImages([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
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
        setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.task_id) {
      toast.error('Please select a task');
      return;
    }
    if (!formData.progress_notes.trim()) {
      toast.error('Progress notes are required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('work_progress_reports')
        .insert({
          task_id: formData.task_id,
          report_date: formData.report_date,
          progress_notes: formData.progress_notes.trim(),
          percentage_complete: formData.percentage_complete,
          image_urls: formData.image_urls,
        });

      if (error) throw error;
      toast.success('Progress report added successfully');

      setIsDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving progress report:', error);
      toast.error('Failed to save progress report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (report: WorkProgressReport) => {
    if (!confirm('Are you sure you want to delete this progress report?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('work_progress_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;
      toast.success('Progress report deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting progress report:', error);
      toast.error('Failed to delete progress report');
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  
  const filteredReports = reports.filter(report => {
    if (filterTask !== 'all' && report.task_id !== filterTask) return false;
    if (filterDate && report.report_date !== filterDate) return false;
    return true;
  });

  const handleExportReports = () => {
    exportToExcel(filteredReports, progressReportExportColumns, `progress_reports_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Progress reports exported successfully');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Progress Reports</CardTitle>
          <CardDescription>Daily end-of-day progress updates with reference images</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReports} disabled={filteredReports.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} disabled={activeTasks.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Progress Report</DialogTitle>
              <DialogDescription>
                Record daily progress for a task with notes and reference images
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task">Task *</Label>
                  <Select
                    value={formData.task_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, task_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTasks.map(task => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title} ({task.employee?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report_date">Report Date</Label>
                  <Input
                    id="report_date"
                    type="date"
                    value={formData.report_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, report_date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="progress_notes">Progress Notes *</Label>
                <Textarea
                  id="progress_notes"
                  value={formData.progress_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, progress_notes: e.target.value }))}
                  placeholder="Describe today's progress, what was accomplished, any blockers..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Completion: {formData.percentage_complete}%</Label>
                <Slider
                  value={[formData.percentage_complete]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, percentage_complete: value }))}
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
                  
                  {formData.image_urls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {formData.image_urls.map((url, index) => (
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isUploading}>
                {isSaving ? 'Saving...' : 'Add Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {activeTasks.length === 0 && reports.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No active tasks</h3>
            <p className="text-muted-foreground">Create tasks first before adding progress reports</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No progress reports yet</h3>
            <p className="text-muted-foreground mb-4">Add daily progress updates for tasks</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Task:</Label>
                <Select value={filterTask} onValueChange={setFilterTask}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    {tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Date:</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-40"
                />
                {filterDate && (
                  <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
              {filteredReports.map(report => (
                <div key={report.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-medium text-foreground">{report.task?.title || 'Unknown Task'}</h4>
                        <Badge variant="outline">{report.task?.employee?.name}</Badge>
                        <Badge className="bg-primary/10 text-primary">{report.percentage_complete}% complete</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(report.report_date), 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{report.progress_notes}</p>
                      
                      {report.image_urls && report.image_urls.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Image className="w-3 h-3" />
                            <span>{report.image_urls.length} reference image(s)</span>
                          </div>
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {report.image_urls.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={url}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(report)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No reports match the selected filters</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}