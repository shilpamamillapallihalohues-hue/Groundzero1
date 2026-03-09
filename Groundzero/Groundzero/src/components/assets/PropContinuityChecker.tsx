import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Package, Plus, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PropContinuityCheckerProps {
  projectId: string;
}

export function PropContinuityChecker({ projectId }: PropContinuityCheckerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newProp, setNewProp] = useState({
    prop_name: "",
    description: "",
    continuity_notes: "",
  });
  const queryClient = useQueryClient();

  const { data: scenes } = useQuery({
    queryKey: ["scenes-props", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, props")
        .eq("project_id", projectId)
        .order("scene_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: props, isLoading } = useQuery({
    queryKey: ["prop-continuity", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prop_continuity")
        .select("*")
        .eq("project_id", projectId)
        .order("prop_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addPropMutation = useMutation({
    mutationFn: async () => {
      // Find all scenes where this prop appears
      const sceneAppearances = scenes
        ?.filter((s) => s.props?.some((p: string) => 
          p.toLowerCase().includes(newProp.prop_name.toLowerCase())
        ))
        .map((s) => s.id) || [];

      const { error } = await supabase.from("prop_continuity").insert({
        project_id: projectId,
        prop_name: newProp.prop_name,
        description: newProp.description,
        continuity_notes: newProp.continuity_notes,
        scene_appearances: sceneAppearances,
        status: "tracking",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prop-continuity", projectId] });
      setIsAdding(false);
      setNewProp({ prop_name: "", description: "", continuity_notes: "" });
      toast.success("Prop added for tracking");
    },
  });

  const addIssueMutation = useMutation({
    mutationFn: async ({ propId, issue }: { propId: string; issue: string }) => {
      const prop = props?.find((p) => p.id === propId);
      const currentIssues = (prop?.issues as any[]) || [];

      const { error } = await supabase
        .from("prop_continuity")
        .update({
          issues: [...currentIssues, { text: issue, resolved: false, date: new Date().toISOString() }],
          status: "issue",
        })
        .eq("id", propId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prop-continuity", projectId] });
      toast.success("Issue flagged");
    },
  });

  // Get all unique props from scenes
  const allSceneProps = Array.from(
    new Set(scenes?.flatMap((s) => s.props || []) || [])
  );

  const getSceneNumbers = (sceneIds: string[]) => {
    return sceneIds
      .map((id) => scenes?.find((s) => s.id === id)?.scene_number)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Prop Continuity Tracker
          </CardTitle>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Track Prop
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Prop to Track</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Props from script:
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {allSceneProps.slice(0, 10).map((prop, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setNewProp({ ...newProp, prop_name: prop })}
                      >
                        {prop}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Input
                  placeholder="Prop name"
                  value={newProp.prop_name}
                  onChange={(e) => setNewProp({ ...newProp, prop_name: e.target.value })}
                />

                <Textarea
                  placeholder="Description (color, size, distinguishing features)"
                  value={newProp.description}
                  onChange={(e) => setNewProp({ ...newProp, description: e.target.value })}
                />

                <Textarea
                  placeholder="Continuity notes (what to watch for)"
                  value={newProp.continuity_notes}
                  onChange={(e) => setNewProp({ ...newProp, continuity_notes: e.target.value })}
                />

                <Button onClick={() => addPropMutation.mutate()} disabled={!newProp.prop_name}>
                  Start Tracking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading props...</p>
          ) : !props?.length ? (
            <p className="text-muted-foreground text-center py-8">No props being tracked yet</p>
          ) : (
            <div className="space-y-4">
              {props.map((prop) => {
                const issues = (prop.issues as any[]) || [];
                const unresolvedIssues = issues.filter((i) => !i.resolved);

                return (
                  <Card key={prop.id} className={unresolvedIssues.length > 0 ? "border-yellow-500/50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{prop.prop_name}</h4>
                            <Badge
                              variant={
                                prop.status === "issue"
                                  ? "destructive"
                                  : prop.status === "resolved"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {prop.status === "issue" && <AlertCircle className="h-3 w-3 mr-1" />}
                              {prop.status === "resolved" && <Check className="h-3 w-3 mr-1" />}
                              {prop.status}
                            </Badge>
                          </div>

                          {prop.description && (
                            <p className="text-sm text-muted-foreground mb-2">{prop.description}</p>
                          )}

                          <div className="text-xs text-muted-foreground mb-2">
                            Appears in scenes:{" "}
                            {getSceneNumbers((prop.scene_appearances as string[]) || []) || "Not linked"}
                          </div>

                          {prop.continuity_notes && (
                            <p className="text-sm bg-muted/50 p-2 rounded text-muted-foreground">
                              ⚠️ {prop.continuity_notes}
                            </p>
                          )}

                          {unresolvedIssues.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-sm font-medium text-yellow-600">Issues:</p>
                              {unresolvedIssues.map((issue, i) => (
                                <div key={i} className="text-sm flex items-start gap-2 text-yellow-600">
                                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                  {issue.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const issue = prompt("Describe the continuity issue:");
                            if (issue) addIssueMutation.mutate({ propId: prop.id, issue });
                          }}
                        >
                          <AlertTriangle className="h-4 w-4" />
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
