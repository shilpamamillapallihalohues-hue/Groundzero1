import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  Book, Film, FileText, Check, X, Lock, Unlock, ChevronDown, ChevronRight, 
  User, Globe, MapPin, Box, Sparkles, AlertCircle, Eye, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { 
  CreativeContextDocument, 
  CreativeContextRule,
  DOC_TYPE_LABELS,
  SCOPE_LABELS,
  RULE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  CreativeContextScope,
  CreativeRuleType
} from '@/types/creativeContext';

const SCOPE_ICONS: Record<CreativeContextScope, React.ReactNode> = {
  global: <Globe className="h-4 w-4" />,
  world: <Globe className="h-4 w-4" />,
  character: <User className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  asset: <Box className="h-4 w-4" />
};

// Group rules by type for segregated modules
const RULE_CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; types: CreativeRuleType[] }> = {
  character: {
    label: 'Character & Backstory',
    icon: <User className="h-5 w-5" />,
    types: ['visual_cue', 'proportion', 'design_constraint']
  },
  environment: {
    label: 'Environment & World',
    icon: <Globe className="h-5 w-5" />,
    types: ['atmosphere', 'lighting', 'material']
  },
  cultural: {
    label: 'Cultural & Symbolism',
    icon: <Sparkles className="h-5 w-5" />,
    types: ['cultural_logic', 'symbolism']
  },
  guidelines: {
    label: "Do's & Don'ts",
    icon: <AlertCircle className="h-5 w-5" />,
    types: ['do', 'dont']
  },
  visual: {
    label: 'Visual Style',
    icon: <Eye className="h-5 w-5" />,
    types: ['color_palette']
  }
};

export default function DirectorContextReview() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const queryClient = useQueryClient();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['character', 'environment', 'cultural', 'guidelines', 'visual']));

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch pending documents for review
  const { data: pendingDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ['pending-context-documents', selectedProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_documents')
        .select('*')
        .eq('project_id', selectedProjectId!)
        .in('status', ['pending_review', 'draft'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextDocument[];
    },
    enabled: !!selectedProjectId
  });

  // Fetch rules for selected document
  const { data: documentRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['document-rules', selectedDocId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('*')
        .eq('document_id', selectedDocId!)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextRule[];
    },
    enabled: !!selectedDocId
  });

  // Get selected document
  const selectedDoc = pendingDocuments?.find(d => d.id === selectedDocId);

  // Group rules by category
  const groupedRules = documentRules?.reduce((acc, rule) => {
    for (const [category, config] of Object.entries(RULE_CATEGORY_MAP)) {
      if (config.types.includes(rule.rule_type as CreativeRuleType)) {
        if (!acc[category]) acc[category] = [];
        acc[category].push(rule);
        break;
      }
    }
    return acc;
  }, {} as Record<string, CreativeContextRule[]>) || {};

  // Approve document mutation
  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-context-documents'] });
      toast.success('Document approved - now active canon');
      setSelectedDocId(null);
    },
    onError: () => toast.error('Failed to approve document')
  });

  // Reject document mutation
  const rejectMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('creative_context_documents')
        .update({ status: 'rejected' })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-context-documents'] });
      toast.success('Document rejected');
      setSelectedDocId(null);
    },
    onError: () => toast.error('Failed to reject document')
  });

  // Lock document mutation
  const lockMutation = useMutation({
    mutationFn: async (docId: string) => {
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
          is_approved: true,
          locked_by: profile?.id,
          locked_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-context-documents'] });
      toast.success('Document locked - cannot be modified');
      setSelectedDocId(null);
    },
    onError: () => toast.error('Failed to lock document')
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Book className="h-8 w-8 text-primary" />
              Context Review
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and approve AI-analyzed creative context documents
            </p>
          </div>

          <Select 
            value={selectedProjectId || ''} 
            onValueChange={(v) => {
              setSelectedProjectId(v || null);
              setSelectedDocId(null);
            }}
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
        </div>

        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a project to review context documents</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Documents List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Pending Documents
                </CardTitle>
                <CardDescription>
                  {pendingDocuments?.length || 0} documents awaiting review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingDocuments?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-3 text-emerald-500/50" />
                    <p>All documents reviewed</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 pr-4">
                      {pendingDocuments?.map(doc => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedDocId === doc.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {SCOPE_ICONS[doc.scope]}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {DOC_TYPE_LABELS[doc.document_type]}
                              </p>
                            </div>
                            <Badge className={STATUS_COLORS[doc.status]} variant="secondary">
                              {STATUS_LABELS[doc.status]}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Document Detail & Analysis */}
            <Card className="lg:col-span-2">
              {!selectedDoc ? (
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a document to view analysis</p>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {SCOPE_ICONS[selectedDoc.scope]}
                          {selectedDoc.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {DOC_TYPE_LABELS[selectedDoc.document_type]} • {SCOPE_LABELS[selectedDoc.scope]}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate(selectedDoc.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(selectedDoc.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => lockMutation.mutate(selectedDoc.id)}
                          disabled={lockMutation.isPending}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Lock Canon
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Tabs defaultValue="summary">
                      <TabsList className="mb-4">
                        <TabsTrigger value="summary">AI Summary</TabsTrigger>
                        <TabsTrigger value="modules">Extracted Modules</TabsTrigger>
                        <TabsTrigger value="source">Source Content</TabsTrigger>
                      </TabsList>

                      <TabsContent value="summary" className="space-y-4">
                        {selectedDoc.ai_summary ? (
                          <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              AI Summary
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {selectedDoc.ai_summary}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Document not yet analyzed by AI</p>
                          </div>
                        )}

                        {selectedDoc.ai_interpretation && (
                          <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                            <h4 className="font-medium mb-2 text-blue-400">Production Interpretation</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {selectedDoc.ai_interpretation}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="modules">
                        {rulesLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : Object.keys(groupedRules).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No rules extracted yet</p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-3 pr-4">
                              {Object.entries(RULE_CATEGORY_MAP).map(([category, config]) => {
                                const rules = groupedRules[category] || [];
                                if (rules.length === 0) return null;

                                return (
                                  <Collapsible
                                    key={category}
                                    open={expandedCategories.has(category)}
                                    onOpenChange={() => toggleCategory(category)}
                                  >
                                    <CollapsibleTrigger className="w-full">
                                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                          {config.icon}
                                          <span className="font-medium">{config.label}</span>
                                          <Badge variant="secondary">{rules.length}</Badge>
                                        </div>
                                        {expandedCategories.has(category) 
                                          ? <ChevronDown className="h-4 w-4" />
                                          : <ChevronRight className="h-4 w-4" />
                                        }
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="pl-4 mt-2 space-y-2">
                                        {rules.map(rule => (
                                          <div key={rule.id} className="p-3 bg-background rounded-lg border border-border/30">
                                            <div className="flex items-start justify-between gap-2">
                                              <h5 className="font-medium text-sm">{rule.rule_title}</h5>
                                              <div className="flex gap-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {RULE_TYPE_LABELS[rule.rule_type as CreativeRuleType]}
                                                </Badge>
                                                {rule.is_mandatory && (
                                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                                )}
                                              </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                              {rule.rule_description}
                                            </p>
                                            {rule.source_excerpt && (
                                              <p className="text-xs text-muted-foreground/70 mt-2 italic border-l-2 border-muted pl-2">
                                                "{rule.source_excerpt}"
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}
                      </TabsContent>

                      <TabsContent value="source">
                        {selectedDoc.raw_content ? (
                          <ScrollArea className="h-[400px]">
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted/20 rounded-lg">
                              {selectedDoc.raw_content}
                            </pre>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No source content available</p>
                            {selectedDoc.file_url && (
                              <Button variant="link" asChild className="mt-2">
                                <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer">
                                  View Original File
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
