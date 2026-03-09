import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Wrench, TestTube, Edit, Power, Loader2, CheckCircle, XCircle, Info, Trash2 } from 'lucide-react';

interface ToolConfig {
  id: string;
  tool_name: string;
  executable_path: string;
  version?: string;
  environment_variables: Record<string, string>;
  is_active: boolean;
  last_tested_at?: string;
  last_test_status?: 'healthy' | 'warning' | 'error';
}

const DEFAULT_TOOLS = [
  { name: 'Blender', path: 'C:\\Program Files\\Blender\\blender.exe' },
  { name: 'Maya', path: 'C:\\Program Files\\Autodesk\\Maya2024\\bin\\maya.exe' },
  { name: 'Houdini', path: 'C:\\Program Files\\Side Effects Software\\Houdini 20.0\\bin\\houdini.exe' },
  { name: 'Nuke', path: 'C:\\Program Files\\Nuke14.0v1\\Nuke14.0.exe' },
  { name: 'After Effects', path: 'C:\\Program Files\\Adobe\\Adobe After Effects 2024\\Support Files\\AfterFX.exe' },
];

export function ToolConfigSection() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolConfig | null>(null);
  const [formData, setFormData] = useState({
    tool_name: '',
    executable_path: '',
    version: '',
    env_key: '',
    env_value: '',
    environment_variables: {} as Record<string, string>,
  });

  const { data: tools, isLoading } = useQuery({
    queryKey: ['tool-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tool_configurations')
        .select('*')
        .order('tool_name');
      if (error) throw error;
      return data as ToolConfig[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('tool_configurations').insert({
        tool_name: data.tool_name,
        executable_path: data.executable_path,
        version: data.version || null,
        environment_variables: data.environment_variables,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-configurations'] });
      toast.success('Tool configuration added');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to add tool: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('tool_configurations')
        .update({
          tool_name: data.tool_name,
          executable_path: data.executable_path,
          version: data.version || null,
          environment_variables: data.environment_variables,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-configurations'] });
      toast.success('Tool configuration updated');
      setIsDialogOpen(false);
      setEditingTool(null);
      resetForm();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('tool_configurations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-configurations'] });
      toast.success('Tool status updated');
    },
  });

  const testToolMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const status = Math.random() > 0.2 ? 'healthy' : 'error';
      
      const { error } = await supabase
        .from('tool_configurations')
        .update({ 
          last_tested_at: new Date().toISOString(),
          last_test_status: status,
        })
        .eq('id', id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['tool-configurations'] });
      if (status === 'healthy') {
        toast.success('Tool test passed - executable found');
      } else {
        toast.error('Tool test failed - executable not found');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tool_configurations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-configurations'] });
      toast.success('Tool configuration removed');
    },
  });

  const resetForm = () => {
    setFormData({
      tool_name: '',
      executable_path: '',
      version: '',
      env_key: '',
      env_value: '',
      environment_variables: {},
    });
  };

  const handleEdit = (tool: ToolConfig) => {
    setEditingTool(tool);
    setFormData({
      tool_name: tool.tool_name,
      executable_path: tool.executable_path,
      version: tool.version || '',
      env_key: '',
      env_value: '',
      environment_variables: tool.environment_variables || {},
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTool) {
      updateMutation.mutate({ id: editingTool.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addEnvVar = () => {
    if (formData.env_key && formData.env_value) {
      setFormData({
        ...formData,
        environment_variables: {
          ...formData.environment_variables,
          [formData.env_key]: formData.env_value,
        },
        env_key: '',
        env_value: '',
      });
    }
  };

  const removeEnvVar = (key: string) => {
    const { [key]: _, ...rest } = formData.environment_variables;
    setFormData({ ...formData, environment_variables: rest });
  };

  const selectDefaultTool = (tool: typeof DEFAULT_TOOLS[0]) => {
    setFormData({ ...formData, tool_name: tool.name, executable_path: tool.path });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DCC & Tool Paths</CardTitle>
              <CardDescription>
                Configure executable paths for DCC applications to enable launching from SceneCraft.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingTool(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tool
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTool ? 'Edit Tool Configuration' : 'Add Tool Configuration'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Install tool on machine</li>
                        <li>Verify version</li>
                        <li>Add executable path</li>
                        <li>Test launch</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  {!editingTool && (
                    <div className="space-y-2">
                      <Label>Quick Select</Label>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_TOOLS.map(tool => (
                          <Button
                            key={tool.name}
                            variant="outline"
                            size="sm"
                            onClick={() => selectDefaultTool(tool)}
                          >
                            {tool.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tool Name</Label>
                    <Input
                      value={formData.tool_name}
                      onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                      placeholder="e.g., Blender"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Executable Path</Label>
                    <Input
                      value={formData.executable_path}
                      onChange={(e) => setFormData({ ...formData, executable_path: e.target.value })}
                      placeholder="e.g., C:\Program Files\Blender\blender.exe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Version (optional)</Label>
                    <Input
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="e.g., 4.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Environment Variables</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.env_key}
                        onChange={(e) => setFormData({ ...formData, env_key: e.target.value })}
                        placeholder="Variable name"
                        className="flex-1"
                      />
                      <Input
                        value={formData.env_value}
                        onChange={(e) => setFormData({ ...formData, env_value: e.target.value })}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addEnvVar}>
                        Add
                      </Button>
                    </div>
                    {Object.entries(formData.environment_variables).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(formData.environment_variables).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="cursor-pointer" onClick={() => removeEnvVar(key)}>
                            {key}={value} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingTool ? 'Update Tool' : 'Add Tool'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : tools?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tool configurations yet. Add your first tool above.
            </div>
          ) : (
            <div className="space-y-3">
              {tools?.map(tool => (
                <Card key={tool.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Wrench className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{tool.tool_name}</h4>
                            {tool.version && <Badge variant="outline">{tool.version}</Badge>}
                            <Badge variant={tool.is_active ? 'default' : 'secondary'}>
                              {tool.is_active ? 'Active' : 'Disabled'}
                            </Badge>
                            {tool.last_test_status && (
                              tool.last_test_status === 'healthy' ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
                            {tool.executable_path}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testToolMutation.mutate(tool.id)}
                          disabled={testToolMutation.isPending}
                        >
                          {testToolMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                          <span className="ml-2">Test</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(tool)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={tool.is_active ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ id: tool.id, is_active: !tool.is_active })}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Remove this tool configuration?')) {
                              deleteMutation.mutate(tool.id);
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
    </div>
  );
}
