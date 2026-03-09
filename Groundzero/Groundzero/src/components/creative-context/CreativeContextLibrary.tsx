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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { 
  Book, Upload, FileText, Sparkles, Check, X, Lock, Unlock, 
  ChevronDown, ChevronRight, Eye, Edit2, Trash2, Clock, 
  AlertCircle, CheckCircle, Globe, User, MapPin, Box, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  CreativeContextDocument, 
  CreativeContextRule,
  CreativeDocType,
  CreativeContextScope,
  DOC_TYPE_LABELS,
  SCOPE_LABELS,
  RULE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS
} from '@/types/creativeContext';

interface CreativeContextLibraryProps {
  projectId: string;
  isDirector?: boolean; // Directors can manage, Art Directors can only view
  hideUpload?: boolean; // Hide upload for certain roles (director only reviews)
}

const SCOPE_ICONS: Record<CreativeContextScope, React.ReactNode> = {
  global: <Globe className="h-4 w-4" />,
  world: <Globe className="h-4 w-4" />,
  character: <User className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  asset: <Box className="h-4 w-4" />
};

export function CreativeContextLibrary({ projectId, isDirector = true, hideUpload = false }: CreativeContextLibraryProps) {
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<CreativeContextDocument | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  
  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState<CreativeDocType>('general');
  const [uploadScope, setUploadScope] = useState<CreativeContextScope>('global');
  const [uploadScopeTarget, setUploadScopeTarget] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<{ stage: string; percent: number } | null>(null);

  // Fetch documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['creative-context-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextDocument[];
    },
    enabled: !!projectId
  });

  // Fetch rules for selected document
  const { data: selectedRules } = useQuery({
    queryKey: ['creative-context-rules', selectedDocument?.id],
    queryFn: async () => {
      if (!selectedDocument?.id) return [];
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('*')
        .eq('document_id', selectedDocument.id)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextRule[];
    },
    enabled: !!selectedDocument?.id
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;
      let rawContent = uploadContent;

      // Upload file if provided
      if (uploadFile) {
        const fileExt = uploadFile.name.split('.').pop();
        const filePath = `${projectId}/${Date.now()}-${uploadFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('script-files')
          .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('script-files')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = uploadFile.name;
        fileSize = uploadFile.size;
        fileType = fileExt;

        // If it's a text file, read content
        if (['txt', 'md'].includes(fileExt?.toLowerCase() || '')) {
          rawContent = await uploadFile.text();
        }
      }

      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Insert document
      const { data: doc, error: insertError } = await supabase
        .from('creative_context_documents')
        .insert({
          project_id: projectId,
          title: uploadTitle,
          document_type: uploadDocType,
          scope: uploadScope,
          file_url: fileUrl,
          file_name: fileName,
          file_size_bytes: fileSize,
          file_type: fileType,
          raw_content: rawContent,
          world_name: uploadScope === 'world' ? uploadScopeTarget : null,
          character_name: uploadScope === 'character' ? uploadScopeTarget : null,
          location_name: uploadScope === 'location' ? uploadScopeTarget : null,
          asset_name: uploadScope === 'asset' ? uploadScopeTarget : null,
          uploaded_by: profile?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return doc;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['creative-context-documents'] });
      toast.success('Document uploaded successfully');
      
      // Auto-parse if we have content
      if (uploadContent || uploadFile) {
        parseDocument(doc as CreativeContextDocument);
      }
      
      resetUploadForm();
      setShowUploadDialog(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    }
  });

  // Parse document with AI
  const parseDocument = async (doc: CreativeContextDocument) => {
    // Allow parsing if we have raw_content OR a file URL (for PDF/DOCX extraction)
    if (!doc.raw_content && !doc.file_url) {
      toast.error('No content to parse. Please provide text content or upload a document.');
      return;
    }

    setIsParsing(true);
    setParseProgress({ stage: 'Starting analysis...', percent: 10 });
    
    // Simulate progress stages for better UX
    const progressInterval = setInterval(() => {
      setParseProgress(prev => {
        if (!prev) return { stage: 'Processing...', percent: 20 };
        if (prev.percent < 30) return { stage: 'Uploading document...', percent: 30 };
        if (prev.percent < 50) return { stage: 'Extracting text from document...', percent: 50 };
        if (prev.percent < 70) return { stage: 'Analyzing characters & worlds...', percent: 70 };
        if (prev.percent < 85) return { stage: 'Extracting creative rules...', percent: 85 };
        return { stage: 'Finalizing...', percent: 90 };
      });
    }, 3000);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-creative-context', {
        body: {
          documentId: doc.id,
          rawContent: doc.raw_content || '',
          documentType: doc.document_type,
          scope: doc.scope,
          projectId,
          fileUrl: doc.file_url,
          fileType: doc.file_type
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setParseProgress({ stage: 'Complete!', percent: 100 });

      queryClient.invalidateQueries({ queryKey: ['creative-context-documents'] });
      queryClient.invalidateQueries({ queryKey: ['creative-context-rules'] });
      
      const message = [
        `Parsed ${data.rulesCount} creative rules`,
        data.charactersFound > 0 ? `${data.charactersFound} characters` : null,
        data.worldsFound > 0 ? `${data.worldsFound} worlds` : null
      ].filter(Boolean).join(', ');
      
      toast.success(message);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Parse error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to parse document: ${errorMessage}`);
    } finally {
      setIsParsing(false);
      setTimeout(() => setParseProgress(null), 2000);
    }
  };

  // Approve document
  const approveDocument = async (docId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('creative_context_documents')
        .update({
          status: 'approved',
          is_approved: true,
          approved_by: profile?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['creative-context-documents'] });
      toast.success('Document approved - now active canon');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve document');
    }
  };

  // Lock document
  const lockDocument = async (docId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('creative_context_documents')
        .update({
          status: 'locked',
          is_locked: true,
          locked_by: profile?.id,
          locked_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['creative-context-documents'] });
      toast.success('Document locked - cannot be modified');
    } catch (error) {
      console.error('Lock error:', error);
      toast.error('Failed to lock document');
    }
  };

  // Reject document
  const rejectDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('creative_context_documents')
        .update({ status: 'rejected' })
        .eq('id', docId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['creative-context-documents'] });
      toast.success('Document rejected');
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject document');
    }
  };

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadDocType('general');
    setUploadScope('global');
    setUploadScopeTarget('');
    setUploadContent('');
    setUploadFile(null);
  };

  const toggleDocExpanded = (docId: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Group documents by status
  const groupedDocs = {
    locked: documents?.filter(d => d.status === 'locked') || [],
    approved: documents?.filter(d => d.status === 'approved') || [],
    pending: documents?.filter(d => d.status === 'pending_review') || [],
    draft: documents?.filter(d => d.status === 'draft') || [],
    rejected: documents?.filter(d => d.status === 'rejected') || []
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5 text-primary" />
                Creative Context Library
              </CardTitle>
              <CardDescription>
                {isDirector 
                  ? 'Upload, review, and approve creative documents that define your project\'s visual canon'
                  : 'View approved creative context for consistent generation'
                }
              </CardDescription>
            </div>
            
            {isDirector && !hideUpload && (
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Creative Context Document</DialogTitle>
                    <DialogDescription>
                      Add story, world, or asset documents to guide AI generation
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Document Title *</Label>
                        <Input
                          placeholder="e.g., Ramayana World Bible"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Document Type</Label>
                        <Select value={uploadDocType} onValueChange={(v: CreativeDocType) => setUploadDocType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scope</Label>
                        <Select value={uploadScope} onValueChange={(v: CreativeContextScope) => setUploadScope(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {uploadScope !== 'global' && (
                        <div className="space-y-2">
                          <Label>
                            {uploadScope === 'world' && 'World Name'}
                            {uploadScope === 'character' && 'Character Name'}
                            {uploadScope === 'location' && 'Location Name'}
                            {uploadScope === 'asset' && 'Asset Name'}
                          </Label>
                          <Input
                            placeholder={`Enter ${uploadScope} name...`}
                            value={uploadScopeTarget}
                            onChange={(e) => setUploadScopeTarget(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Upload File (PDF, DOC, TXT, MD)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Or paste content directly below
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Document Content</Label>
                      <Textarea
                        placeholder="Paste or type your creative context document here..."
                        value={uploadContent}
                        onChange={(e) => setUploadContent(e.target.value)}
                        rows={8}
                      />
                    </div>

                    {/* Progress Bar for Parsing */}
                    {(isParsing || parseProgress) && (
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            {parseProgress?.stage || 'Processing...'}
                          </span>
                          <span className="text-muted-foreground">{parseProgress?.percent || 0}%</span>
                        </div>
                        <Progress value={parseProgress?.percent || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          AI is analyzing your document to extract characters, worlds, and creative rules...
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={isParsing}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => uploadMutation.mutate()}
                      disabled={!uploadTitle || uploadMutation.isPending || isParsing}
                    >
                      {uploadMutation.isPending || isParsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isParsing ? 'Analyzing...' : 'Uploading...'}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Parse
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-2xl font-bold text-blue-400">{groupedDocs.locked.length}</p>
              <p className="text-xs text-muted-foreground">Locked</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <p className="text-2xl font-bold text-emerald-400">{groupedDocs.approved.length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <p className="text-2xl font-bold text-amber-400">{groupedDocs.pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-2xl font-bold">{groupedDocs.draft.length}</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-2xl font-bold text-destructive">{groupedDocs.rejected.length}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Tabs defaultValue="approved" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Active Canon ({groupedDocs.locked.length + groupedDocs.approved.length})
          </TabsTrigger>
          {isDirector && (
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Review ({groupedDocs.pending.length})
            </TabsTrigger>
          )}
          {isDirector && (
            <TabsTrigger value="draft" className="gap-2">
              <FileText className="h-4 w-4" />
              Drafts ({groupedDocs.draft.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="approved" className="space-y-4">
          {[...groupedDocs.locked, ...groupedDocs.approved].length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approved creative context yet</p>
                {isDirector && (
                  <p className="text-sm mt-2">Upload and approve documents to define your project's creative canon</p>
                )}
              </CardContent>
            </Card>
          ) : (
            [...groupedDocs.locked, ...groupedDocs.approved].map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isExpanded={expandedDocs.has(doc.id)}
                onToggleExpand={() => toggleDocExpanded(doc.id)}
                onViewDetails={() => setSelectedDocument(doc)}
                onApprove={isDirector ? () => approveDocument(doc.id) : undefined}
                onLock={isDirector ? () => lockDocument(doc.id) : undefined}
                onReject={isDirector ? () => rejectDocument(doc.id) : undefined}
                onReparse={isDirector && doc.raw_content ? () => parseDocument(doc) : undefined}
                isParsing={isParsing}
                isDirector={isDirector}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {groupedDocs.pending.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents pending review</p>
              </CardContent>
            </Card>
          ) : (
            groupedDocs.pending.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isExpanded={expandedDocs.has(doc.id)}
                onToggleExpand={() => toggleDocExpanded(doc.id)}
                onViewDetails={() => setSelectedDocument(doc)}
                onApprove={() => approveDocument(doc.id)}
                onLock={() => lockDocument(doc.id)}
                onReject={() => rejectDocument(doc.id)}
                onReparse={doc.raw_content ? () => parseDocument(doc) : undefined}
                isParsing={isParsing}
                isDirector={isDirector}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {groupedDocs.draft.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No draft documents</p>
              </CardContent>
            </Card>
          ) : (
            groupedDocs.draft.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isExpanded={expandedDocs.has(doc.id)}
                onToggleExpand={() => toggleDocExpanded(doc.id)}
                onViewDetails={() => setSelectedDocument(doc)}
                onApprove={() => approveDocument(doc.id)}
                onReparse={doc.raw_content ? () => parseDocument(doc) : undefined}
                isParsing={isParsing}
                isDirector={isDirector}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              {selectedDocument?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
              <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0">
                <TabsList className="flex-shrink-0 mb-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="rules">
                    Extracted Rules ({selectedRules?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="content">Raw Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="h-full overflow-y-auto pr-4">
                    <div className="space-y-4 pb-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">AI Summary</Label>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedDocument.ai_summary || 'Not yet parsed'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">AI Interpretation</Label>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedDocument.ai_interpretation || 'Not yet parsed'}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="rules" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="h-full overflow-y-auto pr-4">
                    <div className="space-y-3 pb-4">
                      {selectedRules?.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No rules extracted yet. Parse the document to extract rules.
                        </p>
                      )}
                      {selectedRules?.map(rule => (
                        <Card key={rule.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {RULE_TYPE_LABELS[rule.rule_type]}
                                  </Badge>
                                  <Badge 
                                    variant={rule.is_mandatory ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {rule.is_mandatory ? 'Mandatory' : 'Suggested'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Priority: {rule.priority}/10
                                  </span>
                                </div>
                                <p className="font-medium">{rule.rule_title}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {rule.rule_description}
                                </p>
                                {rule.source_excerpt && (
                                  <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/50 pl-2">
                                    "{rule.source_excerpt}"
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                                <p>Confidence: {Math.round(rule.confidence_score * 100)}%</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="content" className="flex-1 m-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="h-full overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                      {selectedDocument.raw_content || 'No content available'}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Document Card Component
interface DocumentCardProps {
  document: CreativeContextDocument;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewDetails: () => void;
  onApprove?: () => void;
  onLock?: () => void;
  onReject?: () => void;
  onReparse?: () => void;
  isParsing: boolean;
  isDirector: boolean;
}

function DocumentCard({
  document,
  isExpanded,
  onToggleExpand,
  onViewDetails,
  onApprove,
  onLock,
  onReject,
  onReparse,
  isParsing,
  isDirector
}: DocumentCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <CollapsibleTrigger className="mt-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {SCOPE_ICONS[document.scope]}
                <h4 className="font-medium">{document.title}</h4>
                <Badge className={STATUS_COLORS[document.status]}>
                  {document.is_locked && <Lock className="h-3 w-3 mr-1" />}
                  {STATUS_LABELS[document.status]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {DOC_TYPE_LABELS[document.document_type]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {SCOPE_LABELS[document.scope]}
                </Badge>
                <span className="text-xs text-muted-foreground">v{document.version}</span>
              </div>
              
              {document.ai_summary && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {document.ai_summary}
                </p>
              )}
              
              <CollapsibleContent className="mt-4 space-y-4">
                {document.ai_interpretation && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <Label className="text-xs text-primary">AI Interpretation</Label>
                    <p className="text-sm mt-1">{document.ai_interpretation}</p>
                  </div>
                )}
                
                {(document.world_name || document.character_name || document.location_name || document.asset_name) && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Applies to:</span>
                    <Badge variant="secondary">
                      {document.world_name || document.character_name || document.location_name || document.asset_name}
                    </Badge>
                  </div>
                )}
              </CollapsibleContent>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onViewDetails}>
                <Eye className="h-4 w-4" />
              </Button>
              
              {isDirector && onReparse && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onReparse}
                  disabled={isParsing}
                >
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {isDirector && document.status === 'pending_review' && (
                <>
                  <Button variant="ghost" size="sm" onClick={onApprove} className="text-emerald-500">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onReject} className="text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {isDirector && document.status === 'approved' && !document.is_locked && onLock && (
                <Button variant="ghost" size="sm" onClick={onLock} className="text-blue-500">
                  <Lock className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
