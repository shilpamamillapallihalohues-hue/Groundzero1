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
import { Sun, Moon, Cloud, CloudRain, Sunrise, Sunset, Plus, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface LightingWeatherPlannerProps {
  projectId: string;
}

const TIME_OF_DAY_OPTIONS = [
  { value: "dawn", label: "Dawn", icon: Sunrise },
  { value: "morning", label: "Morning", icon: Sun },
  { value: "midday", label: "Midday", icon: Sun },
  { value: "afternoon", label: "Afternoon", icon: Sun },
  { value: "golden_hour", label: "Golden Hour", icon: Sunset },
  { value: "dusk", label: "Dusk", icon: Sunset },
  { value: "night", label: "Night", icon: Moon },
];

const WEATHER_OPTIONS = [
  { value: "clear", label: "Clear/Sunny", icon: Sun },
  { value: "cloudy", label: "Cloudy", icon: Cloud },
  { value: "overcast", label: "Overcast", icon: Cloud },
  { value: "rain", label: "Rain", icon: CloudRain },
  { value: "fog", label: "Fog", icon: Cloud },
];

export function LightingWeatherPlanner({ projectId }: LightingWeatherPlannerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPlan, setNewPlan] = useState({
    scene_id: "",
    target_time_of_day: "",
    weather_preference: "",
    golden_hour_start: "",
    golden_hour_end: "",
    backup_lighting_setup: "",
    equipment_needed: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data: scenes } = useQuery({
    queryKey: ["scenes-lighting", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, time_of_day, location")
        .eq("project_id", projectId)
        .order("scene_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: lightingPlans, isLoading } = useQuery({
    queryKey: ["lighting-plans", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lighting_plans")
        .select("*, scene:scenes(scene_number, slugline, time_of_day, location)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addPlanMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lighting_plans").insert({
        project_id: projectId,
        scene_id: newPlan.scene_id || null,
        target_time_of_day: newPlan.target_time_of_day,
        weather_preference: newPlan.weather_preference,
        golden_hour_start: newPlan.golden_hour_start || null,
        golden_hour_end: newPlan.golden_hour_end || null,
        backup_lighting_setup: newPlan.backup_lighting_setup,
        equipment_needed: newPlan.equipment_needed.split(",").map((e) => e.trim()).filter(Boolean),
        notes: newPlan.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lighting-plans", projectId] });
      setIsAdding(false);
      setNewPlan({
        scene_id: "",
        target_time_of_day: "",
        weather_preference: "",
        golden_hour_start: "",
        golden_hour_end: "",
        backup_lighting_setup: "",
        equipment_needed: "",
        notes: "",
      });
      toast.success("Lighting plan added");
    },
  });

  const getTimeIcon = (time: string) => {
    const option = TIME_OF_DAY_OPTIONS.find((t) => t.value === time);
    const Icon = option?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  };

  const getWeatherIcon = (weather: string) => {
    const option = WEATHER_OPTIONS.find((w) => w.value === weather);
    const Icon = option?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Lighting & Weather Planner
          </CardTitle>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Lighting Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <Select
                  value={newPlan.scene_id}
                  onValueChange={(v) => setNewPlan({ ...newPlan, scene_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scene" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes?.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.scene_number} - {scene.slugline}
                        {scene.time_of_day && ` (${scene.time_of_day})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newPlan.target_time_of_day}
                  onValueChange={(v) => setNewPlan({ ...newPlan, target_time_of_day: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Target time of day" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OF_DAY_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        <div className="flex items-center gap-2">
                          <time.icon className="h-4 w-4" />
                          {time.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newPlan.weather_preference}
                  onValueChange={(v) => setNewPlan({ ...newPlan, weather_preference: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Weather preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEATHER_OPTIONS.map((weather) => (
                      <SelectItem key={weather.value} value={weather.value}>
                        <div className="flex items-center gap-2">
                          <weather.icon className="h-4 w-4" />
                          {weather.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Golden Hour Start</label>
                    <Input
                      type="time"
                      value={newPlan.golden_hour_start}
                      onChange={(e) => setNewPlan({ ...newPlan, golden_hour_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Golden Hour End</label>
                    <Input
                      type="time"
                      value={newPlan.golden_hour_end}
                      onChange={(e) => setNewPlan({ ...newPlan, golden_hour_end: e.target.value })}
                    />
                  </div>
                </div>

                <Textarea
                  placeholder="Backup lighting setup (for weather changes)"
                  value={newPlan.backup_lighting_setup}
                  onChange={(e) => setNewPlan({ ...newPlan, backup_lighting_setup: e.target.value })}
                />

                <Input
                  placeholder="Equipment needed (comma-separated)"
                  value={newPlan.equipment_needed}
                  onChange={(e) => setNewPlan({ ...newPlan, equipment_needed: e.target.value })}
                />

                <Textarea
                  placeholder="Additional notes"
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                />

                <Button onClick={() => addPlanMutation.mutate()} disabled={!newPlan.target_time_of_day}>
                  Create Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading lighting plans...</p>
          ) : !lightingPlans?.length ? (
            <p className="text-muted-foreground text-center py-8">No lighting plans yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lightingPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardContent className="p-4">
                    {plan.scene && (
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">
                          Scene {(plan.scene as any).scene_number}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {(plan.scene as any).location}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        {getTimeIcon(plan.target_time_of_day || "")}
                        <span className="capitalize">{plan.target_time_of_day?.replace("_", " ")}</span>
                      </div>
                      {plan.weather_preference && (
                        <div className="flex items-center gap-2">
                          {getWeatherIcon(plan.weather_preference)}
                          <span className="capitalize">{plan.weather_preference}</span>
                        </div>
                      )}
                    </div>

                    {(plan.golden_hour_start || plan.golden_hour_end) && (
                      <div className="flex items-center gap-2 text-sm text-orange-500 mb-2">
                        <Sunset className="h-4 w-4" />
                        Golden Hour: {plan.golden_hour_start} - {plan.golden_hour_end}
                      </div>
                    )}

                    {plan.backup_lighting_setup && (
                      <div className="bg-muted/50 p-2 rounded text-sm mb-2">
                        <span className="font-medium">Backup: </span>
                        {plan.backup_lighting_setup}
                      </div>
                    )}

                    {plan.equipment_needed && (plan.equipment_needed as string[]).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(plan.equipment_needed as string[]).map((eq, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    )}
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
