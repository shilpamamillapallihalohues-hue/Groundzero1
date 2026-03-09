import { useProject } from "@/contexts/ProjectContext";
import { LocationIntelligencePanel } from "@/components/location-intelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Compass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LocationIntelligence() {
  const { selectedProjectId, setSelectedProjectId } = useProject();

  const { data: projects } = useQuery({
    queryKey: ["projects-for-location"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      {/* Compact Header - Controls Only */}
      <div className="flex items-center justify-end">
        <Select value={selectedProjectId || ""} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProjectId ? (
        <LocationIntelligencePanel projectId={selectedProjectId} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Compass className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">Select a Project</h2>
            <p className="text-muted-foreground max-w-md">
              Choose a project from the dropdown above to start discovering 
              and matching locations to your scenes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
