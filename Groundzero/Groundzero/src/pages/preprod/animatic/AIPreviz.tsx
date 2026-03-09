import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { Wand2, Film, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';


export default function AIPreviz() {
  const [selectedScene, setSelectedScene] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: scenes, isLoading } = useQuery({
    queryKey: ['scenes-for-previz'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, location')
        .order('scene_number');
      
      if (error) throw error;
      return data?.map(s => ({ ...s, title: s.location || `Scene ${s.scene_number}` })) || [];
    }
  });

  const handleGenerate = async () => {
    if (!selectedScene) return;
    setIsGenerating(true);
    // AI generation would happen here
    setTimeout(() => setIsGenerating(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">AI Previz Generation</h1>
        <p className="text-muted-foreground">Generate animatic drafts using AI</p>
      </div>

      

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Scene</label>
              <Select value={selectedScene} onValueChange={setSelectedScene}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scene" />
                </SelectTrigger>
                <SelectContent>
                  {scenes?.map((scene) => (
                    <SelectItem key={scene.id} value={scene.id}>
                      Scene {scene.scene_number}: {scene.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Timing & Motion Notes</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe timing, camera movements, pacing..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={!selectedScene || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate AI Previz
            </Button>

            {/* Generation Progress */}
            <GenerationProgress
              isGenerating={isGenerating}
              status={isGenerating ? 'generating' : 'idle'}
              statusText={isGenerating ? 'Creating AI previz...' : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Film className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Select a scene and generate to preview
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
