import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Film, Play, Pause, Download, Plus, Clock } from "lucide-react";
import { toast } from "sonner";

interface AnimaticGeneratorProps {
  projectId: string;
  sceneId?: string;
}

export function AnimaticGenerator({ projectId, sceneId }: AnimaticGeneratorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [frameDuration, setFrameDuration] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const queryClient = useQueryClient();

  const { data: storyboards } = useQuery({
    queryKey: ["storyboards", sceneId],
    queryFn: async () => {
      if (!sceneId) return [];
      const { data, error } = await supabase
        .from("storyboards")
        .select("*")
        .eq("scene_id", sceneId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId,
  });

  const { data: animatics, isLoading } = useQuery({
    queryKey: ["animatics", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animatics")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createAnimaticMutation = useMutation({
    mutationFn: async () => {
      if (!storyboards || storyboards.length === 0) {
        throw new Error("No storyboards available for this scene");
      }

      const frameTimings = storyboards.map((sb, index) => ({
        storyboard_id: sb.id,
        image_url: sb.image_url,
        duration: frameDuration,
        order: index,
      }));

      const totalDuration = storyboards.length * frameDuration;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from("animatics").insert({
        project_id: projectId,
        scene_id: sceneId,
        title,
        frame_timings: frameTimings,
        duration_seconds: totalDuration,
        status: "draft",
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animatics", projectId] });
      setIsCreating(false);
      setTitle("");
      toast.success("Animatic created");
    },
  });

  const playAnimatic = (animatic: any) => {
    const frames = animatic.frame_timings || [];
    if (frames.length === 0) return;

    setIsPlaying(true);
    setCurrentFrame(0);

    let frameIndex = 0;
    const interval = setInterval(() => {
      frameIndex++;
      if (frameIndex >= frames.length) {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentFrame(0);
      } else {
        setCurrentFrame(frameIndex);
      }
    }, (frames[0]?.duration || 2) * 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Animatic Generator
          </CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!sceneId}>
                <Plus className="h-4 w-4 mr-1" /> Create Animatic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Animatic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Animatic title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Frame Duration: {frameDuration}s
                  </label>
                  <Slider
                    value={[frameDuration]}
                    onValueChange={([v]) => setFrameDuration(v)}
                    min={0.5}
                    max={5}
                    step={0.5}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {storyboards?.length || 0} storyboard frames will be included.
                  Total duration: {((storyboards?.length || 0) * frameDuration).toFixed(1)}s
                </p>
                <Button
                  onClick={() => createAnimaticMutation.mutate()}
                  disabled={!title || !storyboards?.length}
                >
                  Generate Animatic
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!sceneId ? (
            <p className="text-muted-foreground text-center py-8">Select a scene to create animatics</p>
          ) : isLoading ? (
            <p className="text-muted-foreground">Loading animatics...</p>
          ) : animatics?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No animatics yet. Create one from your storyboards.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {animatics?.map((animatic) => {
                const frames = (animatic.frame_timings as any[]) || [];
                const currentImage = frames[currentFrame]?.image_url;

                return (
                  <Card key={animatic.id}>
                    <CardContent className="p-4">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                        {currentImage ? (
                          <img
                            src={currentImage}
                            alt={`Frame ${currentFrame + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No frames
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{animatic.title}</h4>
                        <Badge variant="outline">{animatic.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {frames.length} frames • {animatic.duration_seconds}s
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playAnimatic(animatic)}
                          disabled={isPlaying}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
