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
import { Shirt, Plus, User, Image } from "lucide-react";
import { toast } from "sonner";

interface CostumeTrackerProps {
  projectId: string;
}

export function CostumeTracker({ projectId }: CostumeTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [newCostume, setNewCostume] = useState({
    character_name: "",
    costume_name: "",
    description: "",
    scene_id: "",
    accessories: "",
  });
  const queryClient = useQueryClient();

  const { data: scenes } = useQuery({
    queryKey: ["scenes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, characters")
        .eq("project_id", projectId)
        .order("scene_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: costumes, isLoading } = useQuery({
    queryKey: ["character-costumes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_costumes")
        .select("*, scene:scenes(scene_number, slugline)")
        .eq("project_id", projectId)
        .order("character_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addCostumeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("character_costumes").insert({
        project_id: projectId,
        character_name: newCostume.character_name,
        costume_name: newCostume.costume_name,
        description: newCostume.description,
        scene_id: newCostume.scene_id || null,
        accessories: newCostume.accessories.split(",").map((a) => a.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-costumes", projectId] });
      setIsAdding(false);
      setNewCostume({ character_name: "", costume_name: "", description: "", scene_id: "", accessories: "" });
      toast.success("Costume added");
    },
  });

  // Get unique characters from scenes
  const allCharacters = Array.from(
    new Set(scenes?.flatMap((s) => s.characters || []) || [])
  );

  // Group costumes by character
  const costumesByCharacter = costumes?.reduce((acc, costume) => {
    const char = costume.character_name;
    if (!acc[char]) acc[char] = [];
    acc[char].push(costume);
    return acc;
  }, {} as Record<string, typeof costumes>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            Costume Tracker
          </CardTitle>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Costume
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Character Costume</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select
                  value={newCostume.character_name}
                  onValueChange={(v) => setNewCostume({ ...newCostume, character_name: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select character" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCharacters.map((char) => (
                      <SelectItem key={char} value={char}>
                        {char}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Costume name (e.g., Office Look, Evening Gown)"
                  value={newCostume.costume_name}
                  onChange={(e) => setNewCostume({ ...newCostume, costume_name: e.target.value })}
                />

                <Textarea
                  placeholder="Description (colors, fabrics, style notes)"
                  value={newCostume.description}
                  onChange={(e) => setNewCostume({ ...newCostume, description: e.target.value })}
                />

                <Select
                  value={newCostume.scene_id}
                  onValueChange={(v) => setNewCostume({ ...newCostume, scene_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Scene (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes?.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.scene_number} - {scene.slugline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Accessories (comma-separated)"
                  value={newCostume.accessories}
                  onChange={(e) => setNewCostume({ ...newCostume, accessories: e.target.value })}
                />

                <Button
                  onClick={() => addCostumeMutation.mutate()}
                  disabled={!newCostume.character_name || !newCostume.costume_name}
                >
                  Add Costume
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading costumes...</p>
          ) : !costumes?.length ? (
            <p className="text-muted-foreground text-center py-8">No costumes tracked yet</p>
          ) : (
            <div className="space-y-6">
              {/* Character Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedCharacter === null ? "default" : "outline"}
                  onClick={() => setSelectedCharacter(null)}
                >
                  All
                </Button>
                {Object.keys(costumesByCharacter || {}).map((char) => (
                  <Button
                    key={char}
                    size="sm"
                    variant={selectedCharacter === char ? "default" : "outline"}
                    onClick={() => setSelectedCharacter(char)}
                  >
                    <User className="h-3 w-3 mr-1" />
                    {char}
                  </Button>
                ))}
              </div>

              {/* Costume Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {costumes
                  ?.filter((c) => !selectedCharacter || c.character_name === selectedCharacter)
                  .map((costume) => (
                    <Card key={costume.id}>
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                          {costume.reference_image_url ? (
                            <img
                              src={costume.reference_image_url}
                              alt={costume.costume_name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Image className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{costume.character_name}</Badge>
                            {costume.scene && (
                              <span className="text-xs text-muted-foreground">
                                Scene {(costume.scene as any).scene_number}
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium">{costume.costume_name}</h4>
                          {costume.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {costume.description}
                            </p>
                          )}
                          {costume.accessories && (costume.accessories as string[]).length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {(costume.accessories as string[]).map((acc, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {acc}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
