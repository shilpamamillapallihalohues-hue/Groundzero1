import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GitCompare, Plus, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScriptVersionManagerProps {
  projectId: string;
}

export function ScriptVersionManager({ projectId }: ScriptVersionManagerProps) {
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({ title: "", content: "", changes_summary: "" });
  const [compareVersions, setCompareVersions] = useState<{ v1: string | null; v2: string | null }>({ v1: null, v2: null });
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: ["script-versions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("script_versions")
        .select("*, created_by_profile:profiles!script_versions_created_by_fkey(full_name)")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addVersionMutation = useMutation({
    mutationFn: async (versionData: typeof newVersion) => {
      const nextVersion = (versions?.[0]?.version_number || 0) + 1;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from("script_versions").insert({
        project_id: projectId,
        version_number: nextVersion,
        title: versionData.title,
        content: versionData.content,
        changes_summary: versionData.changes_summary,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["script-versions", projectId] });
      setIsAddingVersion(false);
      setNewVersion({ title: "", content: "", changes_summary: "" });
      toast.success("Script version added");
    },
  });

  const getVersionDiff = (v1Content: string, v2Content: string) => {
    const lines1 = v1Content?.split("\n") || [];
    const lines2 = v2Content?.split("\n") || [];
    const diff: { type: "added" | "removed" | "same"; line: string }[] = [];

    const maxLength = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLength; i++) {
      if (lines1[i] === lines2[i]) {
        diff.push({ type: "same", line: lines1[i] || "" });
      } else if (!lines1[i]) {
        diff.push({ type: "added", line: lines2[i] });
      } else if (!lines2[i]) {
        diff.push({ type: "removed", line: lines1[i] });
      } else {
        diff.push({ type: "removed", line: lines1[i] });
        diff.push({ type: "added", line: lines2[i] });
      }
    }
    return diff;
  };

  const v1Data = versions?.find((v) => v.id === compareVersions.v1);
  const v2Data = versions?.find((v) => v.id === compareVersions.v2);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Script Versions
        </CardTitle>
        <Dialog open={isAddingVersion} onOpenChange={setIsAddingVersion}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Script Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Version Title (e.g., Draft 2, Final Cut)"
                value={newVersion.title}
                onChange={(e) => setNewVersion({ ...newVersion, title: e.target.value })}
              />
              <Textarea
                placeholder="Paste script content here..."
                value={newVersion.content}
                onChange={(e) => setNewVersion({ ...newVersion, content: e.target.value })}
                className="min-h-[200px] font-mono text-sm"
              />
              <Textarea
                placeholder="Summary of changes from previous version..."
                value={newVersion.changes_summary}
                onChange={(e) => setNewVersion({ ...newVersion, changes_summary: e.target.value })}
              />
              <Button onClick={() => addVersionMutation.mutate(newVersion)} disabled={!newVersion.title}>
                Save Version
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading versions...</p>
        ) : versions?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No script versions yet. Add your first version above.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {versions?.map((version) => (
                <Card key={version.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="mb-2">v{version.version_number}</Badge>
                        <h4 className="font-medium">{version.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{version.changes_summary}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant={compareVersions.v1 === version.id ? "default" : "outline"}
                        onClick={() => setCompareVersions({ ...compareVersions, v1: version.id })}
                      >
                        Compare A
                      </Button>
                      <Button
                        size="sm"
                        variant={compareVersions.v2 === version.id ? "default" : "outline"}
                        onClick={() => setCompareVersions({ ...compareVersions, v2: version.id })}
                      >
                        Compare B
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {compareVersions.v1 && compareVersions.v2 && v1Data && v2Data && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitCompare className="h-5 w-5" />
                    Comparing v{v1Data.version_number} vs v{v2Data.version_number}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] rounded border p-4">
                    <pre className="font-mono text-sm">
                      {getVersionDiff(v1Data.content || "", v2Data.content || "").map((line, i) => (
                        <div
                          key={i}
                          className={
                            line.type === "added"
                              ? "bg-green-500/20 text-green-400"
                              : line.type === "removed"
                              ? "bg-red-500/20 text-red-400"
                              : ""
                          }
                        >
                          {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
                          {line.line}
                        </div>
                      ))}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
