import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Upload, Trash2, CheckCircle, Clock, Eye, X, Download, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/ui/video-player';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  asset_type: string;
  department: string;
  file_url: string | null;
  file_name: string | null;
  thumbnail_url: string | null;
  status: string;
  tags: string[];
  created_at: string;
}

interface ProjectDeliverablesTabProps {
  projectId: string;
  assetType: 'model' | 'video' | 'image' | 'document';
  title: string;
  acceptedFiles: string;
  showVideoPlayer?: boolean;
}

const DEPARTMENTS = [
  'Direction', 'Cinematography', 'Art Department', 'VFX', 
  'Costume', 'Sound', 'Props', 'Lighting', 'Animation', 'Modeling'
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/20 text-blue-500',
  review: 'bg-warning/20 text-warning',
  approved: 'bg-success/20 text-success',
  rejected: 'bg-destructive/20 text-destructive',
};

export function ProjectDeliverablesTab({ 
  projectId, 
  assetType, 
  title, 
  acceptedFiles,
  showVideoPlayer = false 
}: ProjectDeliverablesTabProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Deliverable | null>(null);
  const [previewImage, setPreviewImage] = useState<Deliverable | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);

  useEffect(() => {
    loadDeliverables();
  }, [projectId, assetType]);

  const loadDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('project_deliverables')
        .select('*')
        .eq('project_id', projectId)
        .eq('asset_type', assetType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliverables(data || []);
    } catch (error) {
      console.error('Error loading deliverables:', error);
      toast.error('Failed to load deliverables');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFile(file);
      if (!formTitle) {
        setFormTitle(file.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!formTitle || !formDepartment) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let thumbnailUrl = null;

      if (formFile) {
        const fileExt = formFile.name.split('.').pop();
        const filePath = `${projectId}/${assetType}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project-deliverables')
          .upload(filePath, formFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('project-deliverables')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = formFile.name;

        // For images, use the file URL as thumbnail
        if (assetType === 'image') {
          thumbnailUrl = fileUrl;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      const { error } = await supabase
        .from('project_deliverables')
        .insert({
          project_id: projectId,
          title: formTitle,
          description: formDescription || null,
          asset_type: assetType,
          department: formDepartment,
          file_url: fileUrl,
          file_name: fileName,
          thumbnail_url: thumbnailUrl,
          file_size: formFile?.size || null,
          created_by: profile?.id || null,
        });

      if (error) throw error;

      toast.success('Deliverable uploaded successfully');
      setDialogOpen(false);
      resetForm();
      loadDeliverables();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Failed to upload deliverable');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'approved') {
        const { data: userData } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userData.user?.id)
          .single();
        
        updates.approved_by = profile?.id;
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('project_deliverables')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated');
      loadDeliverables();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return;

    try {
      const { error } = await supabase
        .from('project_deliverables')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Deliverable deleted');
      loadDeliverables();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete deliverable');
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormDepartment('');
    setFormFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderAssetPreview = (deliverable: Deliverable) => {
    if (assetType === 'image' && deliverable.file_url) {
      return (
        <div 
          className="relative h-40 bg-muted rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => setPreviewImage(deliverable)}
        >
          <img 
            src={deliverable.file_url} 
            alt={deliverable.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="h-8 w-8 text-white" />
          </div>
        </div>
      );
    }

    if (assetType === 'video' && deliverable.file_url) {
      return (
        <div 
          className="relative h-40 bg-muted rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => setSelectedVideo(deliverable)}
        >
          <video 
            src={deliverable.file_url} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/70 transition-colors">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      );
    }

    return (
      <div className="h-40 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{deliverable.file_name || 'No file'}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{deliverables.length} items</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add {assetType === 'model' ? 'Model' : assetType === 'video' ? 'Video' : assetType === 'image' ? 'Image' : 'Document'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload {title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                  placeholder="Enter title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
              <div>
                <Label>Department *</Label>
                <Select value={formDepartment} onValueChange={setFormDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File</Label>
                <Input 
                  ref={fileInputRef}
                  type="file" 
                  accept={acceptedFiles}
                  onChange={handleFileChange}
                />
                {formFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {formFile.name} ({(formFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {deliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No {title.toLowerCase()} yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first {assetType} to get started</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add {assetType}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {deliverables.map(deliverable => (
            <Card key={deliverable.id} className="overflow-hidden">
              {renderAssetPreview(deliverable)}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground line-clamp-1">{deliverable.title}</h3>
                  <Badge className={STATUS_COLORS[deliverable.status]}>
                    {deliverable.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {deliverable.description || 'No description'}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{deliverable.department}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select 
                    value={deliverable.status} 
                    onValueChange={(value) => handleStatusChange(deliverable.id, value)}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {deliverable.file_url && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => window.open(deliverable.file_url!, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleDelete(deliverable.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo.title}</DialogTitle>
            </DialogHeader>
            <VideoPlayer 
              src={selectedVideo.file_url!} 
              title={selectedVideo.title}
            />
            {selectedVideo.description && (
              <p className="text-muted-foreground">{selectedVideo.description}</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewImage.title}</DialogTitle>
            </DialogHeader>
            <img 
              src={previewImage.file_url!} 
              alt={previewImage.title}
              className="w-full h-auto rounded-lg"
            />
            {previewImage.description && (
              <p className="text-muted-foreground">{previewImage.description}</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
