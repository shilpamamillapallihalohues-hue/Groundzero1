import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShotListExporterProps {
  projectId: string;
  sceneId?: string;
}

export function ShotListExporter({ projectId, sceneId }: ShotListExporterProps) {
  const [title, setTitle] = useState("");
  const [exportFormat, setExportFormat] = useState("pdf");
  const queryClient = useQueryClient();

  const { data: storyboards } = useQuery({
    queryKey: ["storyboards-for-shotlist", sceneId],
    queryFn: async () => {
      if (!sceneId) return [];
      const { data, error } = await supabase
        .from("storyboards")
        .select("*, camera_movements(*)")
        .eq("scene_id", sceneId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId,
  });

  const { data: shotLists, isLoading } = useQuery({
    queryKey: ["shot-lists", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shot_lists")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createShotListMutation = useMutation({
    mutationFn: async () => {
      if (!storyboards || storyboards.length === 0) {
        throw new Error("No storyboards available");
      }

      const shotsData = storyboards.map((sb) => ({
        shot_number: sb.shot_number,
        shot_type: sb.shot_type,
        camera_angle: sb.camera_angle,
        action: sb.action,
        lighting: sb.lighting,
        mood: sb.mood,
        camera_movements: (sb.camera_movements as any[])?.map((m) => m.movement_type) || [],
      }));

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from("shot_lists").insert({
        project_id: projectId,
        scene_id: sceneId,
        title,
        shots_data: shotsData,
        export_format: exportFormat,
        exported_at: new Date().toISOString(),
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shot-lists", projectId] });
      setTitle("");
      toast.success("Shot list created");
    },
  });

  const exportToPrint = (shotList: any) => {
    const shots = (shotList.shots_data as any[]) || [];
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${shotList.title} - Shot List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${shotList.title}</h1>
          <table>
            <thead>
              <tr>
                <th>Shot #</th>
                <th>Type</th>
                <th>Angle</th>
                <th>Action</th>
                <th>Lighting</th>
                <th>Camera Movement</th>
              </tr>
            </thead>
            <tbody>
              ${shots
                .map(
                  (shot) => `
                <tr>
                  <td>${shot.shot_number}</td>
                  <td>${shot.shot_type || "-"}</td>
                  <td>${shot.camera_angle || "-"}</td>
                  <td>${shot.action || "-"}</td>
                  <td>${shot.lighting || "-"}</td>
                  <td>${shot.camera_movements?.join(", ") || "-"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shot List Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sceneId ? (
            <p className="text-muted-foreground text-center py-4">Select a scene to generate shot list</p>
          ) : (
            <>
              <div className="flex gap-3">
                <Input
                  placeholder="Shot list title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1"
                />
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => createShotListMutation.mutate()} disabled={!title || !storyboards?.length}>
                  <Plus className="h-4 w-4 mr-1" /> Generate
                </Button>
              </div>

              {storyboards && storyboards.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shot</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Angle</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Lighting</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storyboards.map((sb) => (
                        <TableRow key={sb.id}>
                          <TableCell className="font-mono">{sb.shot_number}</TableCell>
                          <TableCell>{sb.shot_type || "-"}</TableCell>
                          <TableCell>{sb.camera_angle || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sb.action || "-"}</TableCell>
                          <TableCell>{sb.lighting || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading shot lists...</p>
      ) : shotLists && shotLists.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Shot Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shotLists.map((list) => (
                <div key={list.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <h4 className="font-medium">{list.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {((list.shots_data as any[]) || []).length} shots •{" "}
                      {format(new Date(list.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportToPrint(list)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
