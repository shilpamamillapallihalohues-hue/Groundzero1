import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Book, ChevronDown, ChevronRight, Globe, User, MapPin, Box, 
  AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { 
  CreativeContextDocument, 
  CreativeContextRule,
  CreativeContextScope,
  DOC_TYPE_LABELS,
  SCOPE_LABELS
} from '@/types/creativeContext';
import { cn } from '@/lib/utils';

interface ContextSelectorProps {
  projectId: string;
  selectedContextIds: string[];
  onSelectionChange: (ids: string[]) => void;
  scope?: CreativeContextScope; // Filter to specific scope
  entityName?: string; // For character/location/asset specific filtering
}

const SCOPE_ICONS: Record<CreativeContextScope, React.ReactNode> = {
  global: <Globe className="h-3 w-3" />,
  world: <Globe className="h-3 w-3" />,
  character: <User className="h-3 w-3" />,
  location: <MapPin className="h-3 w-3" />,
  asset: <Box className="h-3 w-3" />
};

export function ContextSelector({ 
  projectId, 
  selectedContextIds, 
  onSelectionChange,
  scope,
  entityName
}: ContextSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch approved/locked documents
  const { data: documents } = useQuery({
    queryKey: ['approved-context-documents', projectId],
    queryFn: async () => {
      let query = supabase
        .from('creative_context_documents')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['approved', 'locked'])
        .order('scope');
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreativeContextDocument[];
    },
    enabled: !!projectId
  });

  // Filter documents based on scope and entity
  const filteredDocs = documents?.filter(doc => {
    // Always include global scope
    if (doc.scope === 'global') return true;
    
    // If specific scope requested, filter (but scope param won't be 'global' here)
    if (scope && scope !== 'global' && doc.scope !== scope) return false;
    
    // If entity name provided, check for match
    if (entityName) {
      const docTarget = doc.world_name || doc.character_name || doc.location_name || doc.asset_name;
      if (docTarget && !docTarget.toLowerCase().includes(entityName.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  }) || [];

  const toggleDocument = (docId: string) => {
    if (selectedContextIds.includes(docId)) {
      onSelectionChange(selectedContextIds.filter(id => id !== docId));
    } else {
      onSelectionChange([...selectedContextIds, docId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredDocs.map(d => d.id));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  if (!filteredDocs.length) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>No approved creative context available for this project</span>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Creative Context</span>
            {selectedContextIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedContextIds.length} active
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Select context documents to guide AI generation
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAll}>
                  All
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectNone}>
                  None
                </Button>
              </div>
            </div>
            
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {filteredDocs.map(doc => (
                  <label
                    key={doc.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      selectedContextIds.includes(doc.id) 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-muted/30 border border-transparent hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={selectedContextIds.includes(doc.id)}
                      onCheckedChange={() => toggleDocument(doc.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {SCOPE_ICONS[doc.scope]}
                        <span className="text-sm font-medium truncate">{doc.title}</span>
                        {doc.is_locked && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            Locked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {doc.ai_summary?.substring(0, 100)}...
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
            
            {selectedContextIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 pt-2 border-t border-border/50">
                <CheckCircle className="h-3 w-3" />
                <span>AI will respect {selectedContextIds.length} context document(s)</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Hook to get active context rules for generation
export function useActiveContextRules(projectId: string, contextIds: string[]) {
  return useQuery({
    queryKey: ['active-context-rules', projectId, contextIds],
    queryFn: async () => {
      if (!contextIds.length) return [];
      
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('*')
        .eq('project_id', projectId)
        .in('document_id', contextIds)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextRule[];
    },
    enabled: !!projectId && contextIds.length > 0
  });
}

// Function to build context-aware prompt additions
export function buildContextPromptAdditions(rules: CreativeContextRule[]): string {
  if (!rules.length) return '';

  const parts: string[] = ['[CREATIVE CONTEXT RULES]'];
  
  // Group by type
  const doRules = rules.filter(r => r.rule_type === 'do');
  const dontRules = rules.filter(r => r.rule_type === 'dont');
  const visualRules = rules.filter(r => ['visual_cue', 'color_palette', 'lighting', 'atmosphere'].includes(r.rule_type));
  const constraintRules = rules.filter(r => ['design_constraint', 'proportion', 'material'].includes(r.rule_type));
  const culturalRules = rules.filter(r => ['cultural_logic', 'symbolism'].includes(r.rule_type));

  if (doRules.length) {
    parts.push('MUST INCLUDE:');
    doRules.forEach(r => parts.push(`- ${r.rule_description}`));
  }

  if (dontRules.length) {
    parts.push('MUST AVOID:');
    dontRules.forEach(r => parts.push(`- ${r.rule_description}`));
  }

  if (visualRules.length) {
    parts.push('VISUAL DIRECTION:');
    visualRules.forEach(r => parts.push(`- ${r.rule_title}: ${r.rule_description}`));
  }

  if (constraintRules.length) {
    parts.push('DESIGN CONSTRAINTS:');
    constraintRules.forEach(r => parts.push(`- ${r.rule_description}`));
  }

  if (culturalRules.length) {
    parts.push('CULTURAL/SYMBOLIC ACCURACY:');
    culturalRules.forEach(r => parts.push(`- ${r.rule_description}`));
  }

  return parts.join('\n');
}
