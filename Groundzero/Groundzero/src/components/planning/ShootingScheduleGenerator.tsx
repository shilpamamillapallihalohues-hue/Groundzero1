import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Wand2, MapPin, Users, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShootingScheduleGeneratorProps {
  projectId: string;
}

export function ShootingScheduleGenerator({ projectId }: ShootingScheduleGeneratorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const queryClient = useQueryClient();

  const { data: scenes } = useQuery({
    queryKey: ["scenes-schedule", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, location, characters, time_of_day, estimated_duration")
        .eq("project_id", projectId)
        .order("scene_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["shooting-schedules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shooting_schedules")
        .select("*, shooting_days(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from("shooting_schedules")
        .insert({
          project_id: projectId,
          title,
          start_date: startDate || null,
          status: "draft",
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-schedules", projectId] });
      setIsCreating(false);
      setTitle("");
      setStartDate("");
      toast.success("Schedule created");
    },
  });

  const optimizeScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      setIsOptimizing(true);

      // Group scenes by location
      const scenesByLocation = scenes?.reduce((acc, scene) => {
        const loc = scene.location || "Unknown";
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(scene);
        return acc;
      }, {} as Record<string, typeof scenes>) || {};

      // Create shooting days - one per location
      let dayNumber = 1;
      const shootingDays = [];

      for (const [location, locationScenes] of Object.entries(scenesByLocation)) {
        if (!locationScenes) continue;

        // Get all unique characters from scenes at this location
        const allCharacters = Array.from(
          new Set(locationScenes.flatMap((s) => s.characters || []))
        );

        shootingDays.push({
          schedule_id: scheduleId,
          day_number: dayNumber++,
          location,
          scene_ids: locationScenes.map((s) => s.id),
          cast_required: allCharacters,
          status: "scheduled",
        });
      }

      // Insert shooting days
      if (shootingDays.length > 0) {
        const { error } = await supabase.from("shooting_days").insert(shootingDays);
        if (error) throw error;
      }

      // Update schedule with AI suggestions
      const { error: updateError } = await supabase
        .from("shooting_schedules")
        .update({
          optimization_notes: `Optimized for ${Object.keys(scenesByLocation).length} locations. Grouped ${scenes?.length || 0} scenes into ${shootingDays.length} shooting days to minimize location changes.`,
          ai_suggestions: {
            total_days: shootingDays.length,
            locations: Object.keys(scenesByLocation).length,
            optimization_type: "location_grouping",
          },
        })
        .eq("id", scheduleId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-schedules", projectId] });
      setIsOptimizing(false);
      toast.success("Schedule optimized by location");
    },
    onError: () => {
      setIsOptimizing(false);
      toast.error("Optimization failed");
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shooting Schedule Generator
          </CardTitle>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Shooting Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Schedule title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <Input
                  type="date"
                  placeholder="Start date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />

                <p className="text-sm text-muted-foreground">
                  {scenes?.length || 0} scenes available to schedule
                </p>

                <Button onClick={() => createScheduleMutation.mutate()} disabled={!title}>
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading schedules...</p>
          ) : !schedules?.length ? (
            <p className="text-muted-foreground text-center py-8">No schedules created yet</p>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => {
                const days = (schedule.shooting_days as any[]) || [];

                return (
                  <Card key={schedule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium">{schedule.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{schedule.status}</Badge>
                            {schedule.start_date && (
                              <span className="text-sm text-muted-foreground">
                                Starts: {format(new Date(schedule.start_date), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => optimizeScheduleMutation.mutate(schedule.id)}
                          disabled={isOptimizing}
                        >
                          {isOptimizing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-1" /> AI Optimize
                            </>
                          )}
                        </Button>
                      </div>

                      {schedule.optimization_notes && (
                        <p className="text-sm bg-muted/50 p-2 rounded mb-4">
                          💡 {schedule.optimization_notes}
                        </p>
                      )}

                      {days.length > 0 ? (
                        <div className="space-y-3">
                          {days.map((day) => (
                            <div
                              key={day.id}
                              className="flex items-center gap-4 p-3 rounded bg-muted/30"
                            >
                              <div className="text-center min-w-[60px]">
                                <Badge variant="secondary">Day {day.day_number}</Badge>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{day.location}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>
                                    {(day.scene_ids as string[])?.length || 0} scenes
                                  </span>
                                  {day.cast_required && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {(day.cast_required as string[]).slice(0, 3).join(", ")}
                                      {(day.cast_required as string[]).length > 3 && "..."}
                                    </span>
                                  )}
                                  {day.call_time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Call: {day.call_time}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Badge
                                variant={day.status === "completed" ? "default" : "secondary"}
                              >
                                {day.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No shooting days scheduled. Click "AI Optimize" to generate.
                        </p>
                      )}
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
