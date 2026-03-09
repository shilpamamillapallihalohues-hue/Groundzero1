import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Settings,
  Plus,
  X,
  Save,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ASSET_CATEGORY_LABELS } from '@/types/pipeline';

interface RoutingConfig {
  id: string;
  asset_type: string;
  department_order: string[];
  is_active: boolean;
}

export function RoutingConfigPanel() {
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState<RoutingConfig | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDepartment, setNewDepartment] = useState('');

  const { data: routingConfigs, isLoading } = useQuery({
    queryKey: ['pipeline-routing-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_routing_config')
        .select('*')
        .order('asset_type');
      
      if (error) throw error;
      return data as RoutingConfig[];
    },
  });

  const { data: allDepartments } = useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('name').order('name');
      return data?.map(d => d.name) || [];
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: RoutingConfig) => {
      const { error } = await supabase
        .from('pipeline_routing_config')
        .update({
          department_order: config.department_order,
          is_active: config.is_active,
        })
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-routing-config'] });
      toast.success('Routing configuration updated');
      setEditingConfig(null);
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const handleEdit = (config: RoutingConfig) => {
    setEditingConfig(config);
    setDepartments([...config.department_order]);
  };

  const handleAddDepartment = () => {
    if (newDepartment && !departments.includes(newDepartment)) {
      setDepartments([...departments, newDepartment]);
      setNewDepartment('');
    }
  };

  const handleRemoveDepartment = (dept: string) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const handleMoveDepartment = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= departments.length) return;
    
    const newDepts = [...departments];
    [newDepts[index], newDepts[newIndex]] = [newDepts[newIndex], newDepts[index]];
    setDepartments(newDepts);
  };

  const handleSave = () => {
    if (!editingConfig) return;
    updateConfigMutation.mutate({
      ...editingConfig,
      department_order: departments,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Pipeline Routing Configuration
        </CardTitle>
        <CardDescription>
          Define department order for each asset type. Only Super Users can modify.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {routingConfigs?.map((config) => (
            <div
              key={config.id}
              className={`p-4 border rounded-lg ${!config.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-primary" />
                  <span className="font-semibold">
                    {ASSET_CATEGORY_LABELS[config.asset_type as keyof typeof ASSET_CATEGORY_LABELS] || config.asset_type}
                  </span>
                  {!config.is_active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(config)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              
              <div className="flex items-center gap-1 flex-wrap">
                {config.department_order.map((dept, idx) => (
                  <div key={dept} className="flex items-center">
                    <Badge variant="secondary">{dept}</Badge>
                    {idx < config.department_order.length - 1 && (
                      <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Routing: {editingConfig && (ASSET_CATEGORY_LABELS[editingConfig.asset_type as keyof typeof ASSET_CATEGORY_LABELS] || editingConfig.asset_type)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Department Order</label>
              <p className="text-xs text-muted-foreground mb-3">
                Drag to reorder. Assets will move through these departments in order.
              </p>
              
              <div className="space-y-2">
                {departments.map((dept, idx) => (
                  <div
                    key={dept}
                    className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                  >
                    <span className="w-6 h-6 flex items-center justify-center bg-primary/20 rounded text-sm font-medium">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{dept}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDepartment(idx, 'up')}
                        disabled={idx === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDepartment(idx, 'down')}
                        disabled={idx === departments.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDepartment(dept)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Add Department</label>
              <div className="flex gap-2 mt-2">
                <select
                  className="flex-1 px-3 py-2 border rounded-md bg-background"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                >
                  <option value="">Select department...</option>
                  {allDepartments
                    ?.filter(d => !departments.includes(d))
                    .map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
                <Button onClick={handleAddDepartment} disabled={!newDepartment}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateConfigMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
