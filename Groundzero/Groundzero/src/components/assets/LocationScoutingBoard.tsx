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
import { MapPin, Plus, DollarSign, ThumbsUp, ThumbsDown, Image, Check } from "lucide-react";
import { toast } from "sonner";

interface LocationScoutingBoardProps {
  projectId: string;
}

const STATUS_OPTIONS = [
  { value: "scouting", label: "Scouting" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function LocationScoutingBoard({ projectId }: LocationScoutingBoardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [newLocation, setNewLocation] = useState({
    location_name: "",
    address: "",
    scene_id: "",
    cost_estimate: "",
    pros: "",
    cons: "",
    availability_notes: "",
  });
  const queryClient = useQueryClient();

  const { data: scenes } = useQuery({
    queryKey: ["scenes-locations", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, location")
        .eq("project_id", projectId)
        .order("scene_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: locations, isLoading } = useQuery({
    queryKey: ["location-scouting", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_scouting")
        .select("*, scene:scenes(scene_number, slugline, location)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const photos = photoUrl ? [photoUrl] : [];

      const { error } = await supabase.from("location_scouting").insert({
        project_id: projectId,
        location_name: newLocation.location_name,
        address: newLocation.address,
        scene_id: newLocation.scene_id || null,
        cost_estimate: newLocation.cost_estimate ? parseFloat(newLocation.cost_estimate) : null,
        pros: newLocation.pros.split(",").map((p) => p.trim()).filter(Boolean),
        cons: newLocation.cons.split(",").map((c) => c.trim()).filter(Boolean),
        availability_notes: newLocation.availability_notes,
        real_photos: photos,
        status: "scouting",
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-scouting", projectId] });
      setIsAdding(false);
      setPhotoUrl("");
      setNewLocation({
        location_name: "",
        address: "",
        scene_id: "",
        cost_estimate: "",
        pros: "",
        cons: "",
        availability_notes: "",
      });
      toast.success("Location added");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("location_scouting").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-scouting", projectId] });
      toast.success("Status updated");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500";
      case "rejected":
        return "bg-red-500/10 text-red-500";
      case "shortlisted":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Scouting Board
          </CardTitle>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Scouting Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <Input
                  placeholder="Location name"
                  value={newLocation.location_name}
                  onChange={(e) => setNewLocation({ ...newLocation, location_name: e.target.value })}
                />

                <Input
                  placeholder="Address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                />

                <Select
                  value={newLocation.scene_id}
                  onValueChange={(v) => setNewLocation({ ...newLocation, scene_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to scene (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes?.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.scene_number} - {scene.location || scene.slugline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Photo URL"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />

                <Input
                  type="number"
                  placeholder="Cost estimate ($)"
                  value={newLocation.cost_estimate}
                  onChange={(e) => setNewLocation({ ...newLocation, cost_estimate: e.target.value })}
                />

                <Input
                  placeholder="Pros (comma-separated)"
                  value={newLocation.pros}
                  onChange={(e) => setNewLocation({ ...newLocation, pros: e.target.value })}
                />

                <Input
                  placeholder="Cons (comma-separated)"
                  value={newLocation.cons}
                  onChange={(e) => setNewLocation({ ...newLocation, cons: e.target.value })}
                />

                <Textarea
                  placeholder="Availability notes"
                  value={newLocation.availability_notes}
                  onChange={(e) => setNewLocation({ ...newLocation, availability_notes: e.target.value })}
                />

                <Button onClick={() => addLocationMutation.mutate()} disabled={!newLocation.location_name}>
                  Add Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading locations...</p>
          ) : !locations?.length ? (
            <p className="text-muted-foreground text-center py-8">No locations scouted yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <Card key={location.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {location.real_photos && (location.real_photos as string[]).length > 0 ? (
                      <img
                        src={(location.real_photos as string[])[0]}
                        alt={location.location_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 ${getStatusColor(location.status || "scouting")}`}>
                      {location.status}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-1">{location.location_name}</h4>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                    )}

                    {location.scene && (
                      <Badge variant="outline" className="mb-2">
                        Scene {(location.scene as any).scene_number}
                      </Badge>
                    )}

                    {location.cost_estimate && (
                      <div className="flex items-center gap-1 text-sm mb-2">
                        <DollarSign className="h-4 w-4" />
                        {location.cost_estimate.toLocaleString()}
                      </div>
                    )}

                    <div className="flex gap-4 text-sm mb-3">
                      {location.pros && (location.pros as string[]).length > 0 && (
                        <div className="flex items-start gap-1 text-green-600">
                          <ThumbsUp className="h-4 w-4 mt-0.5" />
                          <span>{(location.pros as string[]).length}</span>
                        </div>
                      )}
                      {location.cons && (location.cons as string[]).length > 0 && (
                        <div className="flex items-start gap-1 text-red-600">
                          <ThumbsDown className="h-4 w-4 mt-0.5" />
                          <span>{(location.cons as string[]).length}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: location.id, status: "shortlisted" })}
                      >
                        Shortlist
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateStatusMutation.mutate({ id: location.id, status: "approved" })}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
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
