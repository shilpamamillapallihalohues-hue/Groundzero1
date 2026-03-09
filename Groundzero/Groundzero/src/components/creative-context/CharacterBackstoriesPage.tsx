import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, User, Search, ChevronDown, ChevronRight, 
  BookOpen, Sparkles, Eye, FileText, Star
} from 'lucide-react';
import { 
  CreativeContextDocument, 
  CreativeContextRule,
  CreativeRuleType,
  RULE_TYPE_LABELS 
} from '@/types/creativeContext';

interface CharacterBackstoriesPageProps {
  projectId: string;
}

interface CharacterData {
  name: string;
  documents: CreativeContextDocument[];
  rules: CreativeContextRule[];
}

export function CharacterBackstoriesPage({ projectId }: CharacterBackstoriesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());

  // Fetch all character backstory documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['character-backstory-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('document_type', 'character_backstory')
        .in('status', ['approved', 'locked'])
        .order('character_name', { ascending: true });
      
      if (error) throw error;
      return data as CreativeContextDocument[];
    },
    enabled: !!projectId
  });

  // Fetch all character rules
  const { data: allRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['character-backstory-rules', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('*')
        .eq('project_id', projectId)
        .eq('scope', 'character')
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextRule[];
    },
    enabled: !!projectId
  });

  // Group data by character name
  const characterData = useMemo(() => {
    const characterMap = new Map<string, CharacterData>();
    
    // Add documents
    documents?.forEach(doc => {
      const charName = doc.character_name || 'Unknown Character';
      if (!characterMap.has(charName)) {
        characterMap.set(charName, { name: charName, documents: [], rules: [] });
      }
      characterMap.get(charName)!.documents.push(doc);
    });

    // Add rules (match by applies_to or document association)
    allRules?.forEach(rule => {
      // Find which character this rule belongs to
      const doc = documents?.find(d => d.id === rule.document_id);
      const charName = doc?.character_name || rule.applies_to?.[0] || 'Unknown Character';
      
      if (!characterMap.has(charName)) {
        characterMap.set(charName, { name: charName, documents: [], rules: [] });
      }
      characterMap.get(charName)!.rules.push(rule);
    });

    return Array.from(characterMap.values());
  }, [documents, allRules]);

  // Filter by search
  const filteredCharacters = useMemo(() => {
    if (!searchQuery.trim()) return characterData;
    const query = searchQuery.toLowerCase();
    return characterData.filter(char => 
      char.name.toLowerCase().includes(query) ||
      char.rules.some(r => r.rule_title.toLowerCase().includes(query) || r.rule_description.toLowerCase().includes(query))
    );
  }, [characterData, searchQuery]);

  const toggleCharacter = (name: string) => {
    setExpandedCharacters(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const isLoading = docsLoading || rulesLoading;

  // Group rules by type for a character
  const groupRulesByType = (rules: CreativeContextRule[]) => {
    const grouped: Record<string, CreativeContextRule[]> = {};
    rules.forEach(rule => {
      const ruleType = rule.rule_type as string;
      if (!grouped[ruleType]) {
        grouped[ruleType] = [];
      }
      grouped[ruleType].push(rule);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Character Backstories
              </CardTitle>
              <CardDescription>
                All character lore and design rules organized by character - used as primary reference for AI generation
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {characterData.length} Characters
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search characters or rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {documents?.length || 0} Documents
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                {allRules?.length || 0} Rules
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character List */}
      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="animate-pulse">Loading character backstories...</div>
          </CardContent>
        </Card>
      ) : filteredCharacters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No character backstories found</p>
            <p className="text-sm mt-2">Upload character backstory documents in the Creative Context Library</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCharacters.map(character => (
            <CharacterCard
              key={character.name}
              character={character}
              isExpanded={expandedCharacters.has(character.name)}
              onToggle={() => toggleCharacter(character.name)}
              groupRulesByType={groupRulesByType}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CharacterCardProps {
  character: CharacterData;
  isExpanded: boolean;
  onToggle: () => void;
  groupRulesByType: (rules: CreativeContextRule[]) => Record<string, CreativeContextRule[]>;
}

function CharacterCard({ character, isExpanded, onToggle, groupRulesByType }: CharacterCardProps) {
  const groupedRules = groupRulesByType(character.rules);
  const ruleTypes = Object.keys(groupedRules);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="border-border/50 hover:border-primary/30 transition-colors">
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {character.name}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {character.documents.length} document{character.documents.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {character.rules.length} rule{character.rules.length !== 1 ? 's' : ''}
                  </span>
                </CardDescription>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {ruleTypes.slice(0, 3).map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {RULE_TYPE_LABELS[type as CreativeRuleType] || type}
                  </Badge>
                ))}
                {ruleTypes.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{ruleTypes.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Tabs defaultValue="rules" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="rules" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Design Rules ({character.rules.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Source Documents ({character.documents.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="rules" className="mt-0">
                <ScrollArea className="h-[400px] pr-4">
                  {ruleTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No rules extracted for this character yet.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {ruleTypes.map(type => (
                        <div key={type} className="space-y-3">
                          <h4 className="font-medium text-sm text-primary flex items-center gap-2 sticky top-0 bg-background py-2">
                            <Star className="h-4 w-4" />
                            {RULE_TYPE_LABELS[type as CreativeRuleType] || type}
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {groupedRules[type].length}
                            </Badge>
                          </h4>
                          
                          {groupedRules[type].map(rule => (
                            <Card key={rule.id} className="border-border/30 bg-muted/30">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-sm">{rule.rule_title}</p>
                                      {rule.is_mandatory && (
                                        <Badge variant="default" className="text-xs h-5">
                                          Mandatory
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {rule.rule_description}
                                    </p>
                                    {rule.source_excerpt && (
                                      <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/50 pl-2">
                                        "{rule.source_excerpt}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                                    <p>Priority: {rule.priority}/10</p>
                                    <p className="mt-1">{Math.round(rule.confidence_score * 100)}%</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0">
                <ScrollArea className="h-[400px] pr-4">
                  {character.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No documents for this character.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {character.documents.map(doc => (
                        <Card key={doc.id} className="border-border/30">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium">{doc.title}</p>
                                {doc.ai_summary && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                    {doc.ai_summary}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    v{doc.version}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
