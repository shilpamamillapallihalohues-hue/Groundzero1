import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, TrendingUp, AlertTriangle, PieChart } from "lucide-react";
import { toast } from "sonner";

interface BudgetAnalysisPanelProps {
  projectId: string;
}

const CATEGORIES = [
  "VFX",
  "Location",
  "Crew",
  "Equipment",
  "Talent",
  "Post-Production",
  "Music",
  "Catering",
  "Transportation",
  "Insurance",
  "Contingency",
];

export function BudgetAnalysisPanel({ projectId }: BudgetAnalysisPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    category: "",
    item_name: "",
    estimated_cost: "",
    scene_id: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data: scenes } = useQuery({
    queryKey: ["scenes-budget", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("id, scene_number, slugline, vfx_complexity")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const { data: budgetItems, isLoading } = useQuery({
    queryKey: ["budget-analysis", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_analysis")
        .select("*, scene:scenes(scene_number)")
        .eq("project_id", projectId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const vfxScene = scenes?.find((s) => s.id === newItem.scene_id);
      let vfxMultiplier = 1;
      if (vfxScene?.vfx_complexity === "high") vfxMultiplier = 1.5;
      else if (vfxScene?.vfx_complexity === "medium") vfxMultiplier = 1.25;

      const { error } = await supabase.from("budget_analysis").insert({
        project_id: projectId,
        category: newItem.category,
        item_name: newItem.item_name,
        estimated_cost: parseFloat(newItem.estimated_cost) || 0,
        scene_id: newItem.scene_id || null,
        vfx_complexity_multiplier: vfxMultiplier,
        notes: newItem.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-analysis", projectId] });
      setIsAdding(false);
      setNewItem({ category: "", item_name: "", estimated_cost: "", scene_id: "", notes: "" });
      toast.success("Budget item added");
    },
  });

  // Calculate totals
  const totalEstimated = budgetItems?.reduce((sum, item) => sum + (item.estimated_cost || 0), 0) || 0;
  const totalActual = budgetItems?.reduce((sum, item) => sum + (item.actual_cost || 0), 0) || 0;

  // Group by category
  const byCategory = budgetItems?.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = { items: [], total: 0 };
    acc[cat].items.push(item);
    acc[cat].total += item.estimated_cost || 0;
    return acc;
  }, {} as Record<string, { items: typeof budgetItems; total: number }>) || {};

  // VFX heavy scenes
  const vfxHeavyScenes = scenes?.filter((s) => s.vfx_complexity === "high") || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Estimated</span>
            </div>
            <p className="text-2xl font-bold">${totalEstimated.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Actual Spent</span>
            </div>
            <p className="text-2xl font-bold">${totalActual.toLocaleString()}</p>
            {totalActual > totalEstimated && (
              <Badge variant="destructive" className="mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Over budget
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">VFX-Heavy Scenes</span>
            </div>
            <p className="text-2xl font-bold">{vfxHeavyScenes.length}</p>
            <p className="text-xs text-muted-foreground">Higher cost impact</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Budget Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Budget Breakdown
          </CardTitle>
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select
                  value={newItem.category}
                  onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Item name"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                />

                <Input
                  type="number"
                  placeholder="Estimated cost ($)"
                  value={newItem.estimated_cost}
                  onChange={(e) => setNewItem({ ...newItem, estimated_cost: e.target.value })}
                />

                <Select
                  value={newItem.scene_id}
                  onValueChange={(v) => setNewItem({ ...newItem, scene_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to scene (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes?.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.scene_number} - {scene.slugline}
                        {scene.vfx_complexity === "high" && " ⚡"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Notes"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                />

                <Button
                  onClick={() => addItemMutation.mutate()}
                  disabled={!newItem.category || !newItem.item_name}
                >
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading budget...</p>
          ) : !budgetItems?.length ? (
            <p className="text-muted-foreground text-center py-8">No budget items yet</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(byCategory).map(([category, data]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{category}</h4>
                    <Badge variant="outline">${data.total.toLocaleString()}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Scene</TableHead>
                        <TableHead className="text-right">Estimated</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">VFX Mult.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>
                            {item.scene ? `Scene ${(item.scene as any).scene_number}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(item.estimated_cost || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.actual_cost ? `$${item.actual_cost.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.vfx_complexity_multiplier !== 1 && (
                              <Badge variant="secondary">×{item.vfx_complexity_multiplier}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
