import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Upload,
  Loader2,
  Sparkles,
  BookOpen,
  User,
  Globe,
  MapPin,
  Package,
  Palette,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import DocumentAnalysisPanel from './DocumentAnalysisPanel';
import DocumentContentViewer from './DocumentContentViewer';

const DOC_TYPES = [
  { value: 'character_backstory', label: 'Character Backstory', icon: User, color: 'text-green-500' },
  { value: 'world_mythology', label: 'World & Mythology', icon: Globe, color: 'text-blue-500' },
  { value: 'location_environment', label: 'Location / Environment', icon: MapPin, color: 'text-amber-500' },
  { value: 'asset_prop_bible', label: 'Asset / Prop Bible', icon: Package, color: 'text-orange-500' },
  { value: 'cultural_symbolism', label: 'Cultural & Symbolism', icon: Palette, color: 'text-pink-500' },
  { value: 'general', label: 'General Reference', icon: FileText, color: 'text-muted-foreground' },
] as const;

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global (entire project)' },
  { value: 'character', label: 'Character-specific' },
  { value: 'world', label: 'World-specific' },
  { value: 'location', label: 'Location-specific' },
  { value: 'asset', label: 'Asset-specific' },
] as const;

const ACCEPTED_DOC_TYPES = '.pdf,.doc,.docx,.txt,.md,.rtf';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  draft: { label: 'Uploading...', icon: Loader2, color: 'text-blue-500' },
  pending_review: { label: 'Analyzed', icon: Sparkles, color: 'text-amber-500' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-500' },
  locked: { label: 'Locked', icon: CheckCircle2, color: 'text-green-600' },
  rejected: { label: 'Error', icon: AlertCircle, color: 'text-destructive' },
};

interface ReferenceDocumentsTabProps {
  projectId: string;
}

export default function ReferenceDocumentsTab({ projectId }: ReferenceDocumentsTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadDocType, setUploadDocType] = useState<string>('general');
  const [uploadScope, setUploadScope] = useState<string>('global');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['reference-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const selectedDoc = documents.find(d => d.id === selectedDocId) || null;

  // Fetch rules for selected document
  const { data: docRules = [] } = useQuery({
    queryKey: ['doc-rules', selectedDocId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('*')
        .eq('document_id', selectedDocId!)
        .order('priority', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDocId,
  });

  // AI Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async (doc: { id: string; rawContent?: string; documentType: string; scope: string; fileUrl?: string; fileType?: string }) => {
      const { data, error } = await supabase.functions.invoke('parse-creative-context', {
        body: {
          documentId: doc.id,
          rawContent: doc.rawContent || '',
          documentType: doc.documentType,
          scope: doc.scope,
          projectId,
          fileUrl: doc.fileUrl,
          fileType: doc.fileType,
        },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Analysis failed');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reference-documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['doc-rules'] });
      toast.success(`Analyzed! Found ${data.charactersFound || 0} characters, ${data.worldsFound || 0} worlds, ${data.rulesCount || 0} rules`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to analyze document');
    },
  });

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadDocType('general');
    setUploadScope('global');
    setUploadProgress(0);
    setShowUploadDialog(false);
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const title = files.length === 1 ? (uploadTitle.trim() || file.name) : file.name;

        setUploadProgress(20 + (i / files.length) * 30);
        const fileName = `projects/${projectId}/documents/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reference-images')
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('reference-images').getPublicUrl(uploadData.path);
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        const { data: { user } } = await supabase.auth.getUser();
        let profileId: string | null = null;
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          profileId = profile?.id || null;
        }

        setUploadProgress(50 + (i / files.length) * 20);
        const { data: doc, error: insertError } = await supabase
          .from('creative_context_documents')
          .insert({
            project_id: projectId,
            title,
            document_type: uploadDocType as any,
            scope: uploadScope as any,
            file_url: publicUrl,
            file_name: file.name,
            file_type: ext,
            file_size_bytes: file.size,
            uploaded_by: profileId,
            status: 'draft',
            raw_content: uploadDescription.trim() || null,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        await supabase.from('scene_references').insert({
          project_id: projectId,
          title,
          description: `${getDocTypeLabel(uploadDocType)} — AI-analyzed document`,
          image_url: publicUrl,
          source_type: 'upload',
          category: 'document',
        });

        setUploadProgress(70 + (i / files.length) * 25);
        analyzeMutation.mutate({
          id: doc.id,
          documentType: uploadDocType,
          scope: uploadScope,
          fileUrl: publicUrl,
          fileType: ext,
        });
      }

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ['reference-documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['director-references', projectId] });
      toast.success(`${files.length > 1 ? `${files.length} documents` : 'Document'} uploaded & queued for analysis`);
      resetUploadForm();
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [projectId, uploadTitle, uploadDocType, uploadScope, uploadDescription, analyzeMutation, queryClient]);

  const handleReanalyze = (doc: any) => {
    analyzeMutation.mutate({
      id: doc.id,
      rawContent: doc.raw_content || '',
      documentType: doc.document_type,
      scope: doc.scope,
      fileUrl: doc.file_url || undefined,
      fileType: doc.file_type || undefined,
    });

    supabase
      .from('creative_context_documents')
      .update({ status: 'draft' })
      .eq('id', doc.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['reference-documents', projectId] });
      });
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await supabase.from('creative_context_rules').delete().eq('document_id', docId);
      const { error } = await supabase.from('creative_context_documents').delete().eq('id', docId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['reference-documents', projectId] });
      toast.success('Document deleted');
      if (selectedDocId === docId) setSelectedDocId(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDocTypeInfo = (type: string) => DOC_TYPES.find(d => d.value === type) || DOC_TYPES[5];
  const getDocTypeLabel = (type: string) => getDocTypeInfo(type).label;
  const getStatusInfo = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  // === SPLIT PANEL VIEW (document selected) ===
  if (selectedDoc) {
    const isAnalyzing = analyzeMutation.isPending && analyzeMutation.variables?.id === selectedDoc.id;

    return (
      <div className="flex h-[calc(100vh-280px)] min-h-[500px] rounded-lg border border-border overflow-hidden bg-card">
        {/* Left: Analysis Panel */}
        <div className="w-[380px] shrink-0">
          <DocumentAnalysisPanel
            document={selectedDoc}
            rules={docRules}
            isAnalyzing={isAnalyzing}
            onReanalyze={() => handleReanalyze(selectedDoc)}
            onDelete={() => handleDeleteDoc(selectedDoc.id)}
            onBack={() => setSelectedDocId(null)}
            onRuleHover={setActiveRuleId}
            activeRuleId={activeRuleId}
          />
        </div>

        {/* Right: Document Content Viewer */}
        <div className="flex-1 min-w-0">
          <DocumentContentViewer
            rawContent={selectedDoc.raw_content}
            aiInterpretation={selectedDoc.ai_interpretation}
            aiSummary={selectedDoc.ai_summary}
            rules={docRules}
            fileUrl={selectedDoc.file_url}
            fileName={selectedDoc.file_name}
          />
        </div>
      </div>
    );
  }

  // === DOCUMENT LIST VIEW ===
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No Documents Yet</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
              Upload character backstories, world mythology docs, reference materials — AI will analyze and extract rules for concept art & storyboard generation.
            </p>
            <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
        {renderUploadDialog()}
      </>
    );
  }

  function renderUploadDialog() {
    return (
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Upload Reference Document
            </DialogTitle>
            <DialogDescription>
              Upload character backstories, world docs, or production references. AI will analyze and extract creative rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title (optional)</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Shiva Character Bible"
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes / Context (optional)</Label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Any additional context for the AI analyzer..."
                className="bg-secondary/50 min-h-[50px]"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        <div className="flex items-center gap-2">
                          <dt.icon className={cn('h-3 w-3', dt.color)} />
                          {dt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <Select value={uploadScope} onValueChange={setUploadScope}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {uploadProgress < 50 ? 'Uploading...' : uploadProgress < 70 ? 'Saving...' : 'Starting AI analysis...'}
                  </span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetUploadForm}>Cancel</Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_DOC_TYPES}
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Processing...' : 'Upload & Analyze'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload button bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? 's' : ''} — click to view analysis & highlighted content
        </p>
        <Button size="sm" onClick={() => setShowUploadDialog(true)} className="gap-2">
          <Upload className="h-3.5 w-3.5" />
          Upload Document
        </Button>
      </div>

      {/* Document cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {documents.map((doc) => {
          const typeInfo = getDocTypeInfo(doc.document_type);
          const statusInfo = getStatusInfo(doc.status);
          const StatusIcon = statusInfo.icon;
          const isAnalyzing = analyzeMutation.isPending && analyzeMutation.variables?.id === doc.id;

          return (
            <Card
              key={doc.id}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group"
              onClick={() => setSelectedDocId(doc.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary/50 shrink-0">
                    <typeInfo.icon className={cn('h-5 w-5', typeInfo.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className={cn('text-[9px] shrink-0 py-0 px-1', statusInfo.color)}>
                        <StatusIcon className={cn('h-2 w-2 mr-0.5', (doc.status === 'draft' || isAnalyzing) && 'animate-spin')} />
                        {isAnalyzing ? 'Analyzing...' : statusInfo.label}
                      </Badge>
                      <span>{doc.scope}</span>
                    </div>
                    {doc.ai_summary && (
                      <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{doc.ai_summary}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {renderUploadDialog()}
    </div>
  );
}
