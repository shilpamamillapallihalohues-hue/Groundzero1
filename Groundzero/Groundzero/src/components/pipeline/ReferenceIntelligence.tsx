import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, Loader2, ExternalLink, Shield, 
  ImageIcon, Layers, Palette, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReferenceSearch, SearchResults, SearchSuggestion } from '@/types/assetIntelligence';

interface ReferenceIntelligenceProps {
  projectId: string;
}

export function ReferenceIntelligence({ projectId }: ReferenceIntelligenceProps) {
  const [searches, setSearches] = useState<ReferenceSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'reference' | 'silhouette' | 'material'>('reference');
  const [currentResults, setCurrentResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    loadSearches();
  }, [projectId]);

  const loadSearches = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reference_searches')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSearches((data as unknown as ReferenceSearch[]) || []);
    } catch (error) {
      console.error('Error loading searches:', error);
      toast.error('Failed to load search history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter a search query');
      return;
    }

    setIsSearching(true);
    setCurrentResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('asset-intelligence', {
        body: {
          action: 'search_references',
          projectId,
          searchQuery,
          searchType,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCurrentResults(data.searchResults);
      loadSearches();
      toast.success('Search completed');
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'silhouette': return <Layers className="h-4 w-4" />;
      case 'material': return <Palette className="h-4 w-4" />;
      default: return <ImageIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Reference Intelligence
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered reference search with legal safety filtering
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Describe what you're looking for... (e.g., medieval armor, forest environment)"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reference">General</SelectItem>
                  <SelectItem value="silhouette">Silhouette</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Results */}
      {currentResults && (
        <Card className="border-primary/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Search Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Suggestions */}
            {currentResults.search_suggestions?.map((suggestion, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{suggestion.query}</p>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs shrink-0">
                    <ExternalLink className="h-3 w-3" />
                    Search
                  </Button>
                </div>
                {suggestion.platforms && (
                  <div className="flex flex-wrap gap-1">
                    {suggestion.platforms.map((platform, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{platform}</Badge>
                    ))}
                  </div>
                )}
                {suggestion.expected_results && (
                  <p className="text-sm text-muted-foreground">{suggestion.expected_results}</p>
                )}
                {suggestion.usage_notes && (
                  <p className="text-xs text-muted-foreground italic">💡 {suggestion.usage_notes}</p>
                )}
              </div>
            ))}

            <Separator />

            {/* Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {currentResults.silhouette_keywords && currentResults.silhouette_keywords.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Silhouette Keywords
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {currentResults.silhouette_keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {currentResults.material_keywords && currentResults.material_keywords.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Material Keywords
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {currentResults.material_keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {currentResults.scale_keywords && currentResults.scale_keywords.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    Scale Keywords
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {currentResults.scale_keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Safety Notes */}
            {currentResults.safety_notes && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                <Shield className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-200">{currentResults.safety_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Recent Searches</h4>
        {searches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {searches.slice(0, 6).map(search => (
              <Card 
                key={search.id} 
                className="border-border/50 bg-card/50 backdrop-blur cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSearchQuery(search.search_query || '');
                  setSearchType(search.search_type as typeof searchType || 'reference');
                  setCurrentResults(search.results || null);
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {getSearchTypeIcon(search.search_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{search.search_query}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(search.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {search.search_type}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No search history yet</p>
        )}
      </div>
    </div>
  );
}
