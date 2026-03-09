import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Video, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, RotateCw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { toast } from "sonner";

interface CameraMovementEditorProps {
  storyboardId: string;
}

const MOVEMENT_TYPES = [
  { value: "pan_left", label: "Pan Left", icon: ArrowLeft },
  { value: "pan_right", label: "Pan Right", icon: ArrowRight },
  { value: "tilt_up", label: "Tilt Up", icon: ArrowUp },
  { value: "tilt_down", label: "Tilt Down", icon: ArrowDown },
  { value: "dolly_in", label: "Dolly In", icon: ZoomIn },
  { value: "dolly_out", label: "Dolly Out", icon: ZoomOut },
  { value: "truck_left", label: "Truck Left", icon: Move },
  { value: "truck_right", label: "Truck Right", icon: Move },
  { value: "crane_up", label: "Crane Up", icon: ArrowUp },
  { value: "crane_down", label: "Crane Down", icon: ArrowDown },
  { value: "orbit", label: "Orbit", icon: RotateCw },
  { value: "zoom_in", label: "Zoom In", icon: ZoomIn },
  { value: "zoom_out", label: "Zoom Out", icon: ZoomOut },
  { value: "static", label: "Static", icon: Video },
];

const SPEEDS = ["slow", "medium", "fast"];
const EASINGS = ["linear", "ease-in", "ease-out", "ease-in-out"];

export function CameraMovementEditor({ storyboardId }: CameraMovementEditorProps) {
  const [newMovement, setNewMovement] = useState({
    movement_type: "pan_right",
    speed: "medium",
    easing: "linear",
    duration_frames: 24,
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data: movements, isLoading } = useQuery({
    queryKey: ["camera-movements", storyboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camera_movements")
        .select("*")
        .eq("storyboard_id", storyboardId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMovementMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("camera_movements").insert({
        storyboard_id: storyboardId,
        ...newMovement,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camera-movements", storyboardId] });
      toast.success("Camera movement added");
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("camera_movements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camera-movements", storyboardId] });
      toast.success("Movement removed");
    },
  });

  const getMovementIcon = (type: string) => {
    const movement = MOVEMENT_TYPES.find((m) => m.value === type);
    const Icon = movement?.icon || Video;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5" />
          Camera Movement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={newMovement.movement_type}
            onValueChange={(v) => setNewMovement({ ...newMovement, movement_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Movement type" />
            </SelectTrigger>
            <SelectContent>
              {MOVEMENT_TYPES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex items-center gap-2">
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={newMovement.speed}
            onValueChange={(v) => setNewMovement({ ...newMovement, speed: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Speed" />
            </SelectTrigger>
            <SelectContent>
              {SPEEDS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={newMovement.easing}
            onValueChange={(v) => setNewMovement({ ...newMovement, easing: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Easing" />
            </SelectTrigger>
            <SelectContent>
              {EASINGS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Duration (frames)"
            value={newMovement.duration_frames}
            onChange={(e) => setNewMovement({ ...newMovement, duration_frames: parseInt(e.target.value) || 24 })}
          />
        </div>

        <Input
          placeholder="Notes (optional)"
          value={newMovement.notes}
          onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
        />

        <Button onClick={() => addMovementMutation.mutate()} className="w-full">
          Add Movement
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : movements?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No camera movements defined</p>
        ) : (
          <div className="space-y-2 mt-4">
            {movements?.map((movement, index) => (
              <div
                key={movement.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{index + 1}.</span>
                  {getMovementIcon(movement.movement_type)}
                  <span className="text-sm capitalize">
                    {movement.movement_type.replace("_", " ")}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {movement.speed}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {movement.duration_frames}f
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMovementMutation.mutate(movement.id)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
