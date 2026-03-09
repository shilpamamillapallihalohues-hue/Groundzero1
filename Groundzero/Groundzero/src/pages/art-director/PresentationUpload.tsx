import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Upload, Presentation, Film, Trash2, Eye, Clock, 
  CheckCircle, XCircle, Loader2, AlertCircle, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useProjectContext } from '@/contexts/ProjectContext';
import { format } from 'date-fns';

interface Presentation {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  status: string;
  director_notes: string | null;
  annotations: any[];
  created_at: string;
  reviewed_at: string | null;
}

export default function PresentationUpload() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['art-director-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch presentations for selected project
  const { data: presentations, isLoading } = useQuery({
    queryKey: ['asset-presentations', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('asset_review_presentations')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Presentation[];
    },
    enabled: !!selectedProjectId
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile || !selectedProjectId || !uploadTitle.trim()) {
        throw new Error('Missing required fields');
      }

      setIsUploading(true);

      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `${selectedProjectId}/${Date.now()}-${uploadFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('asset-presentations')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('asset-presentations')
        .getPublicUrl(filePath);

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Insert presentation record
      const { error: insertError } = await supabase
        .from('asset_review_presentations')
        .insert({
          project_id: selectedProjectId,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          file_url: urlData.publicUrl,
          file_name: uploadFile.name,
          file_size_bytes: uploadFile.size,
          file_type: fileExt,
          uploaded_by: profile?.id,
          status: 'pending_review'
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Presentation uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['asset-presentations'] });
      resetUploadForm();
      setShowUploadDialog(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload presentation');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_review_presentations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Presentation deleted');
      queryClient.invalidateQueries({ queryKey: ['asset-presentations'] });
    },
    onError: () => toast.error('Failed to delete presentation')
  });

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadFile(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'revision_requested':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Revisions Needed</Badge>;
      case 'pending_review':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Presentation className="h-8 w-8 text-primary" />
            Asset Review Presentations
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload PPT presentations for Director review and feedback
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select 
            value={selectedProjectId || ''} 
            onValueChange={(v) => setSelectedProjectId(v || null)}
          >
            <SelectTrigger className="w-64">
              <Film className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProjectId && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload PPT
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Asset Review Presentation</DialogTitle>
                  <DialogDescription>
                    Upload a PowerPoint presentation for Director review
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Presentation Title *</Label>
                    <Input
                      placeholder="e.g., Character Concepts Q1 Review"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of what's included in this presentation..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>PowerPoint File *</Label>
                    <Input
                      type="file"
                      accept=".ppt,.pptx,.pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PPT, PPTX, PDF
                    </p>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => uploadMutation.mutate()}
                    disabled={!uploadFile || !uploadTitle.trim() || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Content */}
      {selectedProjectId ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : presentations && presentations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presentations.map(pres => (
              <Card key={pres.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Presentation className="h-5 w-5 text-orange-500 shrink-0" />
                      <CardTitle className="text-base truncate">{pres.title}</CardTitle>
                    </div>
                    {getStatusBadge(pres.status)}
                  </div>
                  {pres.description && (
                    <CardDescription className="line-clamp-2">
                      {pres.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{pres.file_name}</span>
                    <span>{formatFileSize(pres.file_size_bytes)}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Uploaded {format(new Date(pres.created_at), 'MMM d, yyyy')}
                  </div>

                  {/* Director Notes */}
                  {pres.director_notes && (
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-1 text-xs font-medium mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Director Notes
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {pres.director_notes}
                      </p>
                    </div>
                  )}

                  {/* Annotations indicator */}
                  {pres.annotations && pres.annotations.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {pres.annotations.length} annotation(s) from Director
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(pres.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this presentation?')) {
                          deleteMutation.mutate(pres.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Presentation className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No presentations yet</h3>
              <p className="text-sm mb-4">Upload your first asset review presentation</p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload PPT
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a project to manage presentations</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
