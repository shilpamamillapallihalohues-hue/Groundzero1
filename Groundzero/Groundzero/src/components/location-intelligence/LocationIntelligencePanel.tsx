import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocationIntelligence } from "@/hooks/useLocationIntelligence";
import { LocationCard } from "./LocationCard";
import { SuggestionCard } from "./SuggestionCard";
import { SceneForMatching } from "@/types/locationIntelligence";
import { 
  MapPin, Compass, Sparkles, Database, Upload, RefreshCw,
  Film, Clock, Users, Box, Search, Globe, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface LocationIntelligencePanelProps {
  projectId: string;
}

export function LocationIntelligencePanel({ projectId }: LocationIntelligencePanelProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("suggestions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("India");

  const { 
    isLoading, 
    isSearching,
    locations, 
    suggestions,
    dataSource,
    discoverLocations, 
    searchNewLocations,
    matchSceneToLocations 
  } = useLocationIntelligence(projectId);

  // Fetch scenes for the project
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ["scenes-for-location", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, location, time_of_day, description, characters, props")
        .eq("project_id", projectId)
        .order("scene_number", { ascending: true });
      if (error) throw error;
      return data?.map(scene => ({
        ...scene,
        int_ext: scene.slugline?.toUpperCase().startsWith('INT') ? 'INT' : 
                 scene.slugline?.toUpperCase().startsWith('EXT') ? 'EXT' : 
                 scene.slugline?.toUpperCase().includes('INT/EXT') ? 'INT/EXT' : 'N/A'
      })) || [];
    },
    enabled: !!projectId,
  });

  // Load locations on mount
  useEffect(() => {
    discoverLocations(selectedCountry);
  }, [selectedCountry]);

  const selectedScene = scenes?.find(s => s.id === selectedSceneId);

  const handleAnalyzeScene = async () => {
    if (!selectedScene) {
      toast.error("Please select a scene first");
      return;
    }

    if (locations.length === 0) {
      toast.error("No locations discovered yet. Please search for locations first.");
      return;
    }

    const sceneData: SceneForMatching = {
      id: selectedScene.id,
      scene_number: selectedScene.scene_number || "",
      slugline: selectedScene.slugline || "",
      location: selectedScene.location || "",
      time_of_day: selectedScene.time_of_day || "",
      description: selectedScene.description || "",
      characters: (selectedScene.characters as string[]) || [],
      props: (selectedScene.props as string[]) || [],
      int_ext: selectedScene.int_ext || "",
    };

    await matchSceneToLocations(sceneData);
    setActiveTab("suggestions");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    await searchNewLocations(searchQuery, selectedCountry);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Compass className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Location Intelligence</CardTitle>
                <CardDescription>
                  AI-powered location discovery using Firecrawl web search
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <Database className="h-3 w-3" />
                {locations.length} Locations
              </Badge>
              {dataSource && (
                <Badge variant={dataSource === 'database' ? 'default' : 'secondary'} className="gap-1">
                  {dataSource === 'database' ? (
                    <>
                      <Database className="h-3 w-3" />
                      From Database
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3" />
                      Live Search
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Section */}
          <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search for Locations (Firecrawl)
            </h4>
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="e.g., film studios with LED volume, heritage locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch}
                disabled={isSearching}
                variant="secondary"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Web
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Uses Firecrawl to search the web and AI to extract location data. All estimates are clearly marked.
            </p>
          </div>

          {/* Scene Selection */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Scene</label>
              <Select value={selectedSceneId} onValueChange={setSelectedSceneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scene to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {scenes?.map((scene) => (
                    <SelectItem key={scene.id} value={scene.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {scene.scene_number}
                        </Badge>
                        <span className="truncate max-w-[200px]">
                          {scene.slugline || scene.location}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedScene && (
              <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant={selectedScene.int_ext?.includes('INT') ? 'default' : 'secondary'}>
                    {selectedScene.int_ext || 'N/A'}
                  </Badge>
                  {selectedScene.time_of_day && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedScene.time_of_day}
                    </Badge>
                  )}
                  {selectedScene.characters && (selectedScene.characters as string[]).length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {(selectedScene.characters as string[]).length} chars
                    </Badge>
                  )}
                  {selectedScene.props && (selectedScene.props as string[]).length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Box className="h-3 w-3" />
                      {(selectedScene.props as string[]).length} props
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {selectedScene.description || "No description available"}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleAnalyzeScene} 
                disabled={!selectedSceneId || isLoading || locations.length === 0}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Find Locations
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Locations Warning */}
      {locations.length === 0 && !isLoading && !isSearching && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <h4 className="font-medium">No Locations Discovered</h4>
              <p className="text-sm text-muted-foreground">
                Use the search box above to discover film studios and shooting locations via web search.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suggestions" className="gap-2">
            <Film className="h-4 w-4" />
            Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {suggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Location Database
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Manual Upload
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="grid gap-4">
              {suggestions.map((suggestion, idx) => (
                <SuggestionCard 
                  key={idx} 
                  suggestion={suggestion} 
                  rank={idx + 1}
                  onShortlist={() => toast.success("Added to shortlist")}
                  onApprove={() => toast.success("Location approved")}
                  onReject={() => toast.info("Location rejected")}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Suggestions Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {locations.length === 0 
                    ? "Search for locations first, then select a scene to get AI-powered suggestions."
                    : "Select a scene above and click \"Find Locations\" to get AI-powered location suggestions."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">Discovered Locations</h3>
              <p className="text-xs text-muted-foreground">
                {locations.length > 0 
                  ? `${locations.length} locations from ${dataSource === 'database' ? 'saved database' : 'web search'}`
                  : 'No locations discovered yet'
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => discoverLocations(selectedCountry)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {isLoading || isSearching ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : locations.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="grid md:grid-cols-2 gap-4 pr-4">
                {locations.map((location, idx) => (
                  <LocationCard key={location.id || idx} location={location} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Locations Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Use the search box above to discover film studios and locations via Firecrawl.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Manual Location Upload</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Upload verified location data to override AI estimates. 
                Manual entries will take priority in matching.
              </p>
              <Badge variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
