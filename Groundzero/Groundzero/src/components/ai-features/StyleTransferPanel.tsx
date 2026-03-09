import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, Plus, Star, Film, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StyleTransferPanelProps {
  projectId: string;
}

const PRESET_MOVIES = [
  "Blade Runner 2049",
  "Mad Max: Fury Road",
  "The Grand Budapest Hotel",
  "Inception",
  "Amélie",
  "The Matrix",
  "Moonlight",
  "Her",
  "Drive",
  "In the Mood for Love",
];

const LIGHTING_STYLES = [
  "High-key naturalistic",
  "Low-key dramatic",
  "Chiaroscuro",
  "Neon-lit",
  "Golden hour warm",
  "Cool blue tones",
  "High contrast",
  "Soft diffused",
];

const CAMERA_STYLES = [
  "Handheld documentary",
  "Steady cinematic",
  "Dutch angles",
  "Long takes",
  "Quick cuts",
  "Symmetrical framing",
  "Wide establishing",
  "Intimate close-ups",
];

export function StyleTransferPanel({ projectId }: StyleTransferPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPreset, setNewPreset] = useState({
    name: "",
    reference_movie: "",
    lighting_style: "",
    camera_style: "",
    color_notes: "",
    is_global: false,
  });
  const queryClient = useQueryClient();

  const { data: presets, isLoading } = useQuery({
    queryKey: ["style-presets", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("style_presets")
        .select("*, created_by_profile:profiles!style_presets_created_by_fkey(full_name)")
        .or(`project_id.eq.${projectId},is_global.eq.true`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from("style_presets").insert({
        project_id: projectId,
        name: newPreset.name,
        reference_movie: newPreset.reference_movie,
        lighting_style: newPreset.lighting_style,
        camera_style: newPreset.camera_style,
        color_grading: { notes: newPreset.color_notes },
        style_parameters: {
          lighting: newPreset.lighting_style,
          camera: newPreset.camera_style,
        },
        is_global: newPreset.is_global,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-presets", projectId] });
      setIsCreating(false);
      setNewPreset({
        name: "",
        reference_movie: "",
        lighting_style: "",
        camera_style: "",
        color_notes: "",
        is_global: false,
      });
      toast.success("Style preset created");
    },
  });

  const applyToProjectMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const preset = presets?.find((p) => p.id === presetId);
      if (!preset) return;

      // Update project's AI visual preferences with this style
      const { error } = await supabase.from("ai_visual_preferences").upsert(
        {
          project_id: projectId,
          reference_movies: preset.reference_movie ? [preset.reference_movie] : [],
          lighting_preferences: preset.style_parameters,
          preferred_styles: { preset_id: preset.id, preset_name: preset.name },
        },
        {
          onConflict: "project_id",
        }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Style applied to project");
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Style Transfer Presets
          </CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create Preset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Style Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Preset name"
                  value={newPreset.name}
                  onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                />

                <Select
                  value={newPreset.reference_movie}
                  onValueChange={(v) => setNewPreset({ ...newPreset, reference_movie: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Reference movie" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_MOVIES.map((movie) => (
                      <SelectItem key={movie} value={movie}>
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4" />
                          {movie}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newPreset.lighting_style}
                  onValueChange={(v) => setNewPreset({ ...newPreset, lighting_style: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lighting style" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIGHTING_STYLES.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newPreset.camera_style}
                  onValueChange={(v) => setNewPreset({ ...newPreset, camera_style: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Camera style" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMERA_STYLES.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Color grading notes (e.g., teal and orange, desaturated, high saturation)"
                  value={newPreset.color_notes}
                  onChange={(e) => setNewPreset({ ...newPreset, color_notes: e.target.value })}
                />

                <Button onClick={() => createPresetMutation.mutate()} disabled={!newPreset.name}>
                  Create Preset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading presets...</p>
          ) : !presets?.length ? (
            <p className="text-muted-foreground text-center py-8">No style presets yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presets.map((preset) => (
                <Card key={preset.id} className="relative overflow-hidden">
                  {preset.is_global && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Global
                    </Badge>
                  )}
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{preset.name}</h4>

                    {preset.reference_movie && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Film className="h-4 w-4" />
                        {preset.reference_movie}
                      </div>
                    )}

                    <div className="space-y-1 mb-3">
                      {preset.lighting_style && (
                        <Badge variant="outline" className="mr-1">
                          {preset.lighting_style}
                        </Badge>
                      )}
                      {preset.camera_style && (
                        <Badge variant="outline">{preset.camera_style}</Badge>
                      )}
                    </div>

                    {preset.color_grading && (preset.color_grading as any).notes && (
                      <p className="text-xs text-muted-foreground mb-3">
                        🎨 {(preset.color_grading as any).notes}
                      </p>
                    )}

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => applyToProjectMutation.mutate(preset.id)}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Apply to Project
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
