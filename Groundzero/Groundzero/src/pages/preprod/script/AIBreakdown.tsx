import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Clapperboard, Users, MapPin, Package, RefreshCw, Check, FileText } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function AIBreakdown() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['ai-breakdown-scenes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, characters')
        .order('scene_number');
      return data || [];
    }
  });

  const { data: characters, isLoading: charactersLoading } = useQuery({
    queryKey: ['ai-breakdown-characters'],
    queryFn: async () => {
      // Get unique characters from all scenes
      const { data: scenesData } = await supabase
        .from('scenes')
        .select('characters');
      
      const characterMap = new Map<string, number>();
      scenesData?.forEach(scene => {
        if (Array.isArray(scene.characters)) {
          scene.characters.forEach((char: string) => {
            characterMap.set(char, (characterMap.get(char) || 0) + 1);
          });
        }
      });
      
      return Array.from(characterMap.entries()).map(([name, count]) => ({
        id: name,
        name,
        sceneCount: count
      }));
    }
  });

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['ai-breakdown-locations'],
    queryFn: async () => {
      const { data: scenesData } = await supabase
        .from('scenes')
        .select('location');
      
      const locationMap = new Map<string, number>();
      scenesData?.forEach(scene => {
        if (scene.location) {
          locationMap.set(scene.location, (locationMap.get(scene.location) || 0) + 1);
        }
      });
      
      return Array.from(locationMap.entries()).map(([name, count]) => ({
        id: name,
        name,
        sceneCount: count
      }));
    }
  });

  const { data: props, isLoading: propsLoading } = useQuery({
    queryKey: ['ai-breakdown-props'],
    queryFn: async () => {
      const { data: scenesData } = await supabase
        .from('scenes')
        .select('props');
      
      const propMap = new Map<string, number>();
      scenesData?.forEach(scene => {
        if (Array.isArray(scene.props)) {
          scene.props.forEach((prop: string) => {
            propMap.set(prop, (propMap.get(prop) || 0) + 1);
          });
        }
      });
      
      return Array.from(propMap.entries()).map(([name, count]) => ({
        id: name,
        name,
        sceneCount: count
      }));
    }
  });

  const isLoading = scenesLoading || charactersLoading || locationsLoading || propsLoading;
  const hasData = (scenes?.length || 0) > 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Script Breakdown</h1>
            <p className="text-muted-foreground mt-1">
              AI-extracted scenes, characters, props, and locations
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/script-breakdown'} 
            disabled={isAnalyzing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {hasData ? 'Re-analyze Script' : 'Analyze Script'}
          </Button>
        </div>

        

        {/* Analysis Status */}
        {hasData ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Brain className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Analysis Complete</h3>
                    <p className="text-sm text-muted-foreground">Data extracted from your scripts</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">{scenes?.length || 0} Scenes</div>
                  <p className="text-sm text-muted-foreground">Successfully extracted</p>
                </div>
              </div>
              <Progress value={100} className="h-2" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Script Analysis Data</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a script and run AI breakdown to extract scenes, characters, locations, and props
                </p>
                <Button onClick={() => window.location.href = '/script-breakdown'}>
                  <Brain className="h-4 w-4 mr-2" />
                  Start Script Breakdown
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extracted Data Tabs */}
        {hasData && (
          <Tabs defaultValue="scenes" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scenes" className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4" />
                Scenes ({scenes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Characters ({characters?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locations ({locations?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="props" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Props ({props?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scenes" className="space-y-4">
              {scenes?.map((scene, index) => (
                <Card key={scene.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted font-bold">
                          {scene.scene_number || index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{scene.slugline || 'Untitled'}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{scene.description || 'No description'}</p>
                          {scene.characters && Array.isArray(scene.characters) && scene.characters.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">Characters:</span>
                              {scene.characters.map((char: string) => (
                                <Badge key={char} variant="outline" className="text-xs">{char}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = '/preprod/script/scenes'}>
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="characters" className="space-y-4">
              {characters?.length ? characters.map((character) => (
                <Card key={character.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{character.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Appears in {character.sceneCount} scene(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground py-8">No characters extracted yet</p>
              )}
            </TabsContent>

            <TabsContent value="locations" className="space-y-4">
              {locations?.length ? locations.map((location) => (
                <Card key={location.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{location.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Used in {location.sceneCount} scene(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground py-8">No locations extracted yet</p>
              )}
            </TabsContent>

            <TabsContent value="props" className="space-y-4">
              {props?.length ? props.map((prop) => (
                <Card key={prop.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{prop.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Used in {prop.sceneCount} scene(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-center text-muted-foreground py-8">No props extracted yet</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}