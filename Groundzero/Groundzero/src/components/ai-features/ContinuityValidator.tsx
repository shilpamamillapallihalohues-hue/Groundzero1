import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, AlertTriangle, Check, X, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface ContinuityValidatorProps {
  projectId: string;
}

export function ContinuityValidator({ projectId }: ContinuityValidatorProps) {
  const [isChecking, setIsChecking] = useState(false);
  const queryClient = useQueryClient();

  // First fetch scene IDs for this project
  const { data: scenes } = useQuery({
    queryKey: ["scenes-for-continuity", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  const sceneIds = scenes?.map(s => s.id) || [];

  const { data: storyboards } = useQuery({
    queryKey: ["storyboards-continuity", projectId, sceneIds],
    queryFn: async () => {
      if (sceneIds.length === 0) return [];
      const { data, error } = await supabase
        .from("storyboards")
        .select("*, scene:scenes(scene_number, slugline)")
        .in("scene_id", sceneIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data?.filter((s) => s.scene) || [];
    },
    enabled: sceneIds.length > 0,
  });

  const { data: continuityChecks, isLoading } = useQuery({
    queryKey: ["continuity-checks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("continuity_checks")
        .select("*, source:storyboards!continuity_checks_source_storyboard_id_fkey(shot_number, image_url), target:storyboards!continuity_checks_target_storyboard_id_fkey(shot_number, image_url)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      setIsChecking(true);

      if (!storyboards || storyboards.length < 2) {
        throw new Error("Need at least 2 storyboards to check continuity");
      }

      // Simple continuity check: compare consecutive shots
      const issues = [];

      for (let i = 0; i < storyboards.length - 1; i++) {
        const current = storyboards[i];
        const next = storyboards[i + 1];

        // Check if both have images
        if (!current.image_url || !next.image_url) {
          issues.push({
            project_id: projectId,
            check_type: "missing_image",
            source_storyboard_id: current.id,
            target_storyboard_id: next.id,
            issues_found: [{ type: "missing_image", description: "One or both shots missing generated image" }],
            severity: "warning",
            ai_analysis: "Cannot validate visual continuity without generated images.",
          });
          continue;
        }

        // Check lighting consistency
        if (current.lighting !== next.lighting && current.scene?.scene_number === next.scene?.scene_number) {
          issues.push({
            project_id: projectId,
            check_type: "lighting_mismatch",
            source_storyboard_id: current.id,
            target_storyboard_id: next.id,
            issues_found: [
              {
                type: "lighting",
                description: `Lighting changes from "${current.lighting}" to "${next.lighting}" within same scene`,
              },
            ],
            severity: "warning",
            ai_analysis: "Consider matching lighting for visual consistency within the scene.",
          });
        }

        // Check mood consistency
        if (current.mood !== next.mood && current.scene?.scene_number === next.scene?.scene_number) {
          issues.push({
            project_id: projectId,
            check_type: "mood_shift",
            source_storyboard_id: current.id,
            target_storyboard_id: next.id,
            issues_found: [
              {
                type: "mood",
                description: `Mood shifts from "${current.mood}" to "${next.mood}" within same scene`,
              },
            ],
            severity: "info",
            ai_analysis: "Mood changes may be intentional for dramatic effect.",
          });
        }
      }

      // Insert issues
      if (issues.length > 0) {
        const { error } = await supabase.from("continuity_checks").insert(issues);
        if (error) throw error;
      }

      return issues.length;
    },
    onSuccess: (issueCount) => {
      queryClient.invalidateQueries({ queryKey: ["continuity-checks", projectId] });
      setIsChecking(false);
      toast.success(`Continuity check complete. Found ${issueCount} potential issues.`);
    },
    onError: (error) => {
      setIsChecking(false);
      toast.error(error.message);
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async (checkId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from("continuity_checks")
        .update({ resolved: true, resolved_by: profile?.id })
        .eq("id", checkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["continuity-checks", projectId] });
      toast.success("Issue marked as resolved");
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "warning":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const unresolvedCount = continuityChecks?.filter((c) => !c.resolved).length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Continuity Validator
          {unresolvedCount > 0 && (
            <Badge variant="destructive">{unresolvedCount} issues</Badge>
          )}
        </CardTitle>
        <Button
          onClick={() => runCheckMutation.mutate()}
          disabled={isChecking || !storyboards?.length}
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Run Check
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading checks...</p>
        ) : !continuityChecks?.length ? (
          <div className="text-center py-8">
            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No continuity checks run yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Run Check" to validate visual consistency across storyboards
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {continuityChecks.map((check) => (
                <Card
                  key={check.id}
                  className={check.resolved ? "opacity-50" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getSeverityColor(check.severity || "info")}>
                            {check.severity === "error" ? (
                              <X className="h-3 w-3 mr-1" />
                            ) : check.severity === "warning" ? (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            ) : null}
                            {check.severity}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {check.check_type?.replace("_", " ")}
                          </Badge>
                          {check.resolved && (
                            <Badge variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          {check.source && (
                            <div className="flex items-center gap-2">
                              {(check.source as any).image_url && (
                                <img
                                  src={(check.source as any).image_url}
                                  alt="Source"
                                  className="w-16 h-12 object-cover rounded"
                                />
                              )}
                              <span className="text-sm">Shot {(check.source as any).shot_number}</span>
                            </div>
                          )}
                          <span className="text-muted-foreground">→</span>
                          {check.target && (
                            <div className="flex items-center gap-2">
                              {(check.target as any).image_url && (
                                <img
                                  src={(check.target as any).image_url}
                                  alt="Target"
                                  className="w-16 h-12 object-cover rounded"
                                />
                              )}
                              <span className="text-sm">Shot {(check.target as any).shot_number}</span>
                            </div>
                          )}
                        </div>

                        {check.issues_found && (
                          <div className="space-y-1 mb-2">
                            {(check.issues_found as any[]).map((issue, i) => (
                              <p key={i} className="text-sm">
                                {issue.description}
                              </p>
                            ))}
                          </div>
                        )}

                        {check.ai_analysis && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            💡 {check.ai_analysis}
                          </p>
                        )}
                      </div>

                      {!check.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveIssueMutation.mutate(check.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
