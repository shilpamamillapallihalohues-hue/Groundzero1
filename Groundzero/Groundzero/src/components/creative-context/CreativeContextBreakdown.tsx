import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, User, Search, ChevronDown, ChevronRight, 
  BookOpen, Sparkles, FileText, Star, Globe, MapPin,
  Box, Palette, Scroll
} from 'lucide-react';
import { 
  CreativeContextDocument, 
  CreativeContextRule,
  CreativeRuleType,
  CreativeDocType,
  RULE_TYPE_LABELS,
  DOC_TYPE_LABELS
} from '@/types/creativeContext';

interface CreativeContextBreakdownProps {
  projectId: string;
}

type CategoryType = 'characters' | 'worlds' | 'locations' | 'assets' | 'symbolism';

interface EntityData {
  name: string;
  documents: CreativeContextDocument[];
  rules: CreativeContextRule[];
}

const CATEGORY_CONFIG: Record<CategoryType, {
  label: string;
  icon: React.ElementType;
  docType: CreativeDocType;
  scope: string;
  nameField: keyof CreativeContextDocument;
  color: string;
}> = {
  characters: {
    label: 'Characters',
    icon: Users,
    docType: 'character_backstory',
    scope: 'character',
    nameField: 'character_name',
    color: 'text-purple-400'
  },
  worlds: {
    label: 'Worlds & Mythology',
    icon: Globe,
    docType: 'world_mythology',
    scope: 'world',
    nameField: 'world_name',
    color: 'text-blue-400'
  },
  locations: {
    label: 'Locations',
    icon: MapPin,
    docType: 'location_environment',
    scope: 'location',
    nameField: 'location_name',
    color: 'text-green-400'
  },
  assets: {
    label: 'Assets & Props',
    icon: Box,
    docType: 'asset_prop_bible',
    scope: 'asset',
    nameField: 'asset_name',
    color: 'text-orange-400'
  },
  symbolism: {
    label: 'Cultural & Symbolism',
    icon: Palette,
    docType: 'cultural_symbolism',
    scope: 'global',
    nameField: 'title',
    color: 'text-pink-400'
  }
};

export function CreativeContextBreakdown({ projectId }: CreativeContextBreakdownProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  // Fetch all documents - filter to approved/locked
  const { data: allDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ['creative-context-all-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_documents')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['approved', 'locked', 'draft', 'pending_review'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextDocument[];
    },
    enabled: !!projectId
  });

  // Fetch all rules (rules from approved documents)
  const { data: allRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['creative-context-all-rules', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as CreativeContextRule[];
    },
    enabled: !!projectId
  });

  // Get stats for each category - based on document_type, not scope
  const categoryStats = useMemo(() => {
    const stats: Record<CategoryType, { docs: number; rules: number }> = {
      characters: { docs: 0, rules: 0 },
      worlds: { docs: 0, rules: 0 },
      locations: { docs: 0, rules: 0 },
      assets: { docs: 0, rules: 0 },
      symbolism: { docs: 0, rules: 0 }
    };

    // Group documents by document_type
    allDocuments?.forEach(doc => {
      const category = Object.entries(CATEGORY_CONFIG).find(
        ([_, config]) => config.docType === doc.document_type
      )?.[0] as CategoryType | undefined;
      
      if (category) {
        stats[category].docs++;
      }
    });

    // Group rules by their associated document's type (via document_id)
    allRules?.forEach(rule => {
      const parentDoc = allDocuments?.find(d => d.id === rule.document_id);
      if (parentDoc) {
        const category = Object.entries(CATEGORY_CONFIG).find(
          ([_, config]) => config.docType === parentDoc.document_type
        )?.[0] as CategoryType | undefined;
        
        if (category) {
          stats[category].rules++;
        }
      }
    });

    return stats;
  }, [allDocuments, allRules]);

  // Group data by entity name for current category
  const entityData = useMemo(() => {
    const config = CATEGORY_CONFIG[activeCategory];
    const entityMap = new Map<string, EntityData>();
    
    // Filter documents for this category by document_type
    const categoryDocs = allDocuments?.filter(doc => doc.document_type === config.docType) || [];
    
    // Get rules that belong to these documents
    const docIds = new Set(categoryDocs.map(d => d.id));
    const categoryRules = allRules?.filter(rule => docIds.has(rule.document_id)) || [];

    // For character_backstory docs, extract character names from rules
    if (activeCategory === 'characters') {
      // Group by character name extracted from rule titles
      categoryRules.forEach(rule => {
        // Extract character name from rule title (e.g., "Character: Shiva" -> "Shiva")
        const charMatch = rule.rule_title.match(/^Character:\s*(.+)$/i);
        const entityName = charMatch ? charMatch[1].trim() : 
                          (rule.applies_to?.[0] || 'General Characters');
        
        if (!entityMap.has(entityName)) {
          entityMap.set(entityName, { name: entityName, documents: [], rules: [] });
        }
        entityMap.get(entityName)!.rules.push(rule);
      });

      // Associate documents
      categoryDocs.forEach(doc => {
        // Add doc to first entity or create "Source Documents" entity
        const entityName = doc.character_name || doc.title || 'Source Documents';
        if (!entityMap.has(entityName)) {
          entityMap.set(entityName, { name: entityName, documents: [], rules: [] });
        }
        entityMap.get(entityName)!.documents.push(doc);
      });
    } else {
      // For other categories, group by the name field
      categoryDocs.forEach(doc => {
        const entityName = (doc[config.nameField] as string) || doc.title || 'Unnamed';
        if (!entityMap.has(entityName)) {
          entityMap.set(entityName, { name: entityName, documents: [], rules: [] });
        }
        entityMap.get(entityName)!.documents.push(doc);
      });

      // Associate rules with their parent document's entity
      categoryRules.forEach(rule => {
        const doc = categoryDocs.find(d => d.id === rule.document_id);
        const entityName = doc ? ((doc[config.nameField] as string) || doc.title) : 
                          (rule.applies_to?.[0] || 'General');
        
        if (!entityMap.has(entityName)) {
          entityMap.set(entityName, { name: entityName, documents: [], rules: [] });
        }
        entityMap.get(entityName)!.rules.push(rule);
      });
    }

    return Array.from(entityMap.values())
      .filter(e => e.rules.length > 0 || e.documents.length > 0)
      .sort((a, b) => b.rules.length - a.rules.length); // Sort by most rules first
  }, [allDocuments, allRules, activeCategory]);

  // Filter by search
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entityData;
    const query = searchQuery.toLowerCase();
    return entityData.filter(entity => 
      entity.name.toLowerCase().includes(query) ||
      entity.rules.some(r => 
        r.rule_title.toLowerCase().includes(query) || 
        r.rule_description.toLowerCase().includes(query)
      )
    );
  }, [entityData, searchQuery]);

  const toggleEntity = (name: string) => {
    setExpandedEntities(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEntities(new Set(filteredEntities.map(e => e.name)));
  };

  const collapseAll = () => {
    setExpandedEntities(new Set());
  };

  const isLoading = docsLoading || rulesLoading;
  const config = CATEGORY_CONFIG[activeCategory];
  const IconComponent = config.icon;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(CATEGORY_CONFIG) as [CategoryType, typeof CATEGORY_CONFIG[CategoryType]][]).map(([key, cfg]) => {
          const stats = categoryStats[key];
          const Icon = cfg.icon;
          const isActive = activeCategory === key;
          
          return (
            <Card 
              key={key}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isActive ? 'border-primary bg-primary/5' : 'border-border/50'
              }`}
              onClick={() => setActiveCategory(key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.docs} docs · {stats.rules} rules
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Header */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconComponent className={`h-5 w-5 ${config.color}`} />
                {config.label}
              </CardTitle>
              <CardDescription>
                {activeCategory === 'characters' && 'Character lore, personalities, and design rules - PRIMARY reference for AI generation'}
                {activeCategory === 'worlds' && 'World-building, mythology, and universe rules'}
                {activeCategory === 'locations' && 'Environment descriptions and location-specific guidelines'}
                {activeCategory === 'assets' && 'Prop bibles, asset specifications, and material guidelines'}
                {activeCategory === 'symbolism' && 'Cultural elements, symbolism, and thematic guidelines'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{filteredEntities.length} Items</Badge>
              <button 
                onClick={expandAll}
                className="text-xs text-primary hover:underline"
              >
                Expand All
              </button>
              <span className="text-muted-foreground">|</span>
              <button 
                onClick={collapseAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Collapse
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${config.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entity List */}
      {isLoading ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="animate-pulse">Loading creative context...</div>
          </CardContent>
        </Card>
      ) : filteredEntities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <IconComponent className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {config.label.toLowerCase()} found</p>
            <p className="text-sm mt-2">Upload documents in the Creative Context Library</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntities.map(entity => (
            <EntityCard
              key={entity.name}
              entity={entity}
              isExpanded={expandedEntities.has(entity.name)}
              onToggle={() => toggleEntity(entity.name)}
              categoryConfig={config}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EntityCardProps {
  entity: EntityData;
  isExpanded: boolean;
  onToggle: () => void;
  categoryConfig: typeof CATEGORY_CONFIG[CategoryType];
}

function EntityCard({ entity, isExpanded, onToggle, categoryConfig }: EntityCardProps) {
  const IconComponent = categoryConfig.icon;

  // Group rules by type
  const groupedRules = useMemo(() => {
    const grouped: Record<string, CreativeContextRule[]> = {};
    entity.rules.forEach(rule => {
      const ruleType = rule.rule_type as string;
      if (!grouped[ruleType]) {
        grouped[ruleType] = [];
      }
      grouped[ruleType].push(rule);
    });
    return grouped;
  }, [entity.rules]);

  const ruleTypes = Object.keys(groupedRules);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="border-border/50 hover:border-primary/30 transition-colors">
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="py-4">
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
                <IconComponent className={`h-5 w-5 ${categoryConfig.color}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  {entity.name}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {entity.documents.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {entity.rules.length} rules
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1 flex-wrap justify-end max-w-[200px]">
                {ruleTypes.slice(0, 2).map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {RULE_TYPE_LABELS[type as CreativeRuleType] || type}
                  </Badge>
                ))}
                {ruleTypes.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{ruleTypes.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <Tabs defaultValue="rules" className="w-full">
              <TabsList className="mb-4 h-9">
                <TabsTrigger value="rules" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Rules ({entity.rules.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  Sources ({entity.documents.length})
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-1.5 text-xs">
                  <Scroll className="h-3.5 w-3.5" />
                  Summary
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="rules" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                  {ruleTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No rules extracted yet.
                    </p>
                  ) : (
                    ruleTypes.map(type => (
                      <div key={type} className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 sticky top-0 bg-card py-1 z-10">
                          <Star className="h-3.5 w-3.5 text-primary" />
                          {RULE_TYPE_LABELS[type as CreativeRuleType] || type}
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {groupedRules[type].length}
                          </Badge>
                        </h4>
                        
                        <div className="space-y-2 pl-5">
                          {groupedRules[type].map(rule => (
                            <div key={rule.id} className="p-3 rounded-lg bg-muted/40 border border-border/30">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{rule.rule_title}</p>
                                    {rule.is_mandatory && (
                                      <Badge className="text-xs h-5 bg-destructive/20 text-destructive border-0">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {rule.rule_description}
                                  </p>
                                  {rule.source_excerpt && (
                                    <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-2">
                                      "{rule.source_excerpt}"
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    P{rule.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                  {entity.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No source documents.
                    </p>
                  ) : (
                    entity.documents.map(doc => (
                      <div key={doc.id} className="p-3 rounded-lg bg-muted/40 border border-border/30">
                        <div className="flex items-start gap-3">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{doc.title}</p>
                            {doc.file_name && (
                              <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                v{doc.version}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {doc.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="summary" className="mt-0">
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                  {entity.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No summary available.
                    </p>
                  ) : (
                    entity.documents.map(doc => (
                      <div key={doc.id} className="space-y-2">
                        <h4 className="font-medium text-sm">{doc.title}</h4>
                        {doc.ai_summary && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {doc.ai_summary}
                          </p>
                        )}
                        {doc.ai_interpretation && (
                          <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-xs font-medium text-primary mb-1">AI Interpretation</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {doc.ai_interpretation}
                            </p>
                          </div>
                        )}
                        {!doc.ai_summary && !doc.ai_interpretation && (
                          <p className="text-sm text-muted-foreground italic">
                            No AI analysis available for this document.
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
