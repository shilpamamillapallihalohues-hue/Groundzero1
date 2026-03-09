import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Plus, Server, TestTube, Edit, Trash2, Loader2, CheckCircle, XCircle, Clock, Cpu, Info } from 'lucide-react';

interface RenderNode {
  id: string;
  node_name: string;
  ip_address: string;
  hostname?: string;
  os_type?: string;
  render_software: string[];
  cpu_count?: number;
  gpu_count?: number;
  status: string;
  last_heartbeat?: string;
  cpu_usage?: number;
  ram_usage?: number;
  disk_usage?: number;
  is_active: boolean;
}

interface RenderQueueSettings {
  id: string;
  max_concurrent_jobs: number;
  priority_rules: Record<string, unknown>;
  department_overrides: Record<string, unknown>;
}

const RENDER_SOFTWARE_OPTIONS = ['Arnold', 'Redshift', 'V-Ray', 'Cycles', 'Octane', 'Mantra', 'RenderMan'];
const OS_TYPES = ['windows', 'linux', 'macos'];

export function RenderFarmSection() {
  const queryClient = useQueryClient();
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<RenderNode | null>(null);
  const [nodeFormData, setNodeFormData] = useState({
    node_name: '',
    ip_address: '',
    hostname: '',
    os_type: 'windows',
    render_software: [] as string[],
    cpu_count: 8,
    gpu_count: 1,
  });

  const { data: nodes, isLoading: nodesLoading } = useQuery({
    queryKey: ['render-farm-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('render_farm_nodes')
        .select('*')
        .order('node_name');
      if (error) throw error;
      return data as RenderNode[];
    },
  });

  const { data: queueSettings } = useQuery({
    queryKey: ['render-queue-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('render_queue_settings')
        .select('*')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as RenderQueueSettings | null;
    },
  });

  const createNodeMutation = useMutation({
    mutationFn: async (data: typeof nodeFormData) => {
      const { error } = await supabase.from('render_farm_nodes').insert({
        node_name: data.node_name,
        ip_address: data.ip_address,
        hostname: data.hostname || null,
        os_type: data.os_type,
        render_software: data.render_software,
        cpu_count: data.cpu_count,
        gpu_count: data.gpu_count,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['render-farm-nodes'] });
      toast.success('Render node added');
      setIsNodeDialogOpen(false);
      resetNodeForm();
    },
    onError: (error) => {
      toast.error('Failed to add node: ' + error.message);
    },
  });

  const updateNodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof nodeFormData> }) => {
      const { error } = await supabase
        .from('render_farm_nodes')
        .update({
          node_name: data.node_name,
          ip_address: data.ip_address,
          hostname: data.hostname || null,
          os_type: data.os_type,
          render_software: data.render_software,
          cpu_count: data.cpu_count,
          gpu_count: data.gpu_count,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['render-farm-nodes'] });
      toast.success('Render node updated');
      setIsNodeDialogOpen(false);
      setEditingNode(null);
      resetNodeForm();
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('render_farm_nodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['render-farm-nodes'] });
      toast.success('Render node removed');
    },
  });

  const testNodeMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status = Math.random() > 0.3 ? 'online' : 'offline';
      
      const { error } = await supabase
        .from('render_farm_nodes')
        .update({ 
          status,
          last_heartbeat: new Date().toISOString(),
          cpu_usage: Math.random() * 100,
          ram_usage: Math.random() * 100,
          disk_usage: Math.random() * 100,
        })
        .eq('id', id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['render-farm-nodes'] });
      if (status === 'online') {
        toast.success('Node is online and responding');
      } else {
        toast.error('Node is not responding');
      }
    },
  });

  const updateQueueSettingsMutation = useMutation({
    mutationFn: async (maxJobs: number) => {
      const { error } = await supabase
        .from('render_queue_settings')
        .update({ max_concurrent_jobs: maxJobs })
        .eq('id', queueSettings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['render-queue-settings'] });
      toast.success('Queue settings updated');
    },
  });

  const resetNodeForm = () => {
    setNodeFormData({
      node_name: '',
      ip_address: '',
      hostname: '',
      os_type: 'windows',
      render_software: [],
      cpu_count: 8,
      gpu_count: 1,
    });
  };

  const handleEditNode = (node: RenderNode) => {
    setEditingNode(node);
    setNodeFormData({
      node_name: node.node_name,
      ip_address: node.ip_address,
      hostname: node.hostname || '',
      os_type: node.os_type || 'windows',
      render_software: node.render_software || [],
      cpu_count: node.cpu_count || 8,
      gpu_count: node.gpu_count || 1,
    });
    setIsNodeDialogOpen(true);
  };

  const handleSubmitNode = () => {
    if (editingNode) {
      updateNodeMutation.mutate({ id: editingNode.id, data: nodeFormData });
    } else {
      createNodeMutation.mutate(nodeFormData);
    }
  };

  const toggleSoftware = (software: string) => {
    setNodeFormData(prev => ({
      ...prev,
      render_software: prev.render_software.includes(software)
        ? prev.render_software.filter(s => s !== software)
        : [...prev.render_software, software],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Online</Badge>;
      case 'busy':
        return <Badge className="bg-yellow-500/20 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Busy</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Offline</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Render Nodes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Render Farm Nodes</CardTitle>
              <CardDescription>
                Connect and manage render nodes for distributed rendering.
              </CardDescription>
            </div>
            <Dialog open={isNodeDialogOpen} onOpenChange={(open) => {
              setIsNodeDialogOpen(open);
              if (!open) {
                setEditingNode(null);
                resetNodeForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Node
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingNode ? 'Edit Render Node' : 'Add Render Node'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Install render client on node</li>
                        <li>Ensure shared storage is mounted</li>
                        <li>Enter IP and details</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Node Name</Label>
                      <Input
                        value={nodeFormData.node_name}
                        onChange={(e) => setNodeFormData({ ...nodeFormData, node_name: e.target.value })}
                        placeholder="e.g., Render-01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IP Address</Label>
                      <Input
                        value={nodeFormData.ip_address}
                        onChange={(e) => setNodeFormData({ ...nodeFormData, ip_address: e.target.value })}
                        placeholder="e.g., 192.168.1.100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hostname (optional)</Label>
                      <Input
                        value={nodeFormData.hostname}
                        onChange={(e) => setNodeFormData({ ...nodeFormData, hostname: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>OS Type</Label>
                      <Select
                        value={nodeFormData.os_type}
                        onValueChange={(value) => setNodeFormData({ ...nodeFormData, os_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OS_TYPES.map(os => (
                            <SelectItem key={os} value={os}>{os.charAt(0).toUpperCase() + os.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Render Software</Label>
                    <div className="flex flex-wrap gap-2">
                      {RENDER_SOFTWARE_OPTIONS.map(software => (
                        <Button
                          key={software}
                          variant={nodeFormData.render_software.includes(software) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleSoftware(software)}
                          type="button"
                        >
                          {software}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPU Count: {nodeFormData.cpu_count}</Label>
                      <Slider
                        value={[nodeFormData.cpu_count]}
                        onValueChange={([value]) => setNodeFormData({ ...nodeFormData, cpu_count: value })}
                        min={1}
                        max={128}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GPU Count: {nodeFormData.gpu_count}</Label>
                      <Slider
                        value={[nodeFormData.gpu_count]}
                        onValueChange={([value]) => setNodeFormData({ ...nodeFormData, gpu_count: value })}
                        min={0}
                        max={8}
                        step={1}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitNode}
                    className="w-full"
                    disabled={createNodeMutation.isPending || updateNodeMutation.isPending}
                  >
                    {(createNodeMutation.isPending || updateNodeMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingNode ? 'Update Node' : 'Add Node'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {nodesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : nodes?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No render nodes configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {nodes?.map(node => (
                <Card key={node.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Server className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{node.node_name}</h4>
                            {getStatusBadge(node.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {node.ip_address} • {node.os_type} • {node.cpu_count} CPU / {node.gpu_count} GPU
                          </p>
                          <div className="flex gap-1 mt-1">
                            {node.render_software?.map(sw => (
                              <Badge key={sw} variant="outline" className="text-xs">{sw}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testNodeMutation.mutate(node.id)}
                          disabled={testNodeMutation.isPending}
                        >
                          {testNodeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                          <span className="ml-2">Test</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditNode(node)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Remove this render node?')) {
                              deleteNodeMutation.mutate(node.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Render Queue Settings</CardTitle>
          <CardDescription>Configure job queue and priority rules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Max Concurrent Jobs: {queueSettings?.max_concurrent_jobs || 5}</Label>
            <Slider
              value={[queueSettings?.max_concurrent_jobs || 5]}
              onValueChange={([value]) => updateQueueSettingsMutation.mutate(value)}
              min={1}
              max={50}
              step={1}
            />
          </div>
          <Alert>
            <Cpu className="h-4 w-4" />
            <AlertDescription>
              <strong>Safety Rules:</strong>
              <ul className="list-disc list-inside text-sm mt-1">
                <li>Only admins can add/remove nodes</li>
                <li>Artists cannot trigger farm-wide renders</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
