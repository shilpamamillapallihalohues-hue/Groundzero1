import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Shield, Loader2, Edit, Trash2, Info } from 'lucide-react';

interface AccessRule {
  id: string;
  rule_type: 'storage' | 'render_farm' | 'tools';
  department_id?: string;
  role?: string;
  can_read: boolean;
  can_write: boolean;
  can_execute: boolean;
  upload_limit_mb?: number;
  download_limit_mb?: number;
  departments?: { name: string };
}

interface Department {
  id: string;
  name: string;
}

const RULE_TYPES = [
  { value: 'storage', label: 'Storage Access' },
  { value: 'render_farm', label: 'Render Farm Access' },
  { value: 'tools', label: 'Tools Access' },
];

const ROLES = [
  { value: 'artist', label: 'Artist' },
  { value: 'hod', label: 'Head of Department' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'director', label: 'Director' },
  { value: 'producer', label: 'Producer' },
];

export function AccessPermissionsSection() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AccessRule | null>(null);
  const [formData, setFormData] = useState({
    rule_type: 'storage' as 'storage' | 'render_farm' | 'tools',
    department_id: '',
    role: '',
    can_read: true,
    can_write: false,
    can_execute: false,
    upload_limit_mb: 1024,
    download_limit_mb: 5120,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['infrastructure-access-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('infrastructure_access_rules')
        .select(`
          *,
          departments (name)
        `)
        .order('rule_type');
      if (error) throw error;
      return data as AccessRule[];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments-for-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Department[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('infrastructure_access_rules').insert({
        rule_type: data.rule_type,
        department_id: data.department_id || null,
        role: data.role || null,
        can_read: data.can_read,
        can_write: data.can_write,
        can_execute: data.can_execute,
        upload_limit_mb: data.upload_limit_mb,
        download_limit_mb: data.download_limit_mb,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure-access-rules'] });
      toast.success('Access rule created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create rule: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('infrastructure_access_rules')
        .update({
          can_read: data.can_read,
          can_write: data.can_write,
          can_execute: data.can_execute,
          upload_limit_mb: data.upload_limit_mb,
          download_limit_mb: data.download_limit_mb,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure-access-rules'] });
      toast.success('Access rule updated');
      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('infrastructure_access_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure-access-rules'] });
      toast.success('Access rule removed');
    },
  });

  const resetForm = () => {
    setFormData({
      rule_type: 'storage',
      department_id: '',
      role: '',
      can_read: true,
      can_write: false,
      can_execute: false,
      upload_limit_mb: 1024,
      download_limit_mb: 5120,
    });
  };

  const handleEdit = (rule: AccessRule) => {
    setEditingRule(rule);
    setFormData({
      rule_type: rule.rule_type,
      department_id: rule.department_id || '',
      role: rule.role || '',
      can_read: rule.can_read,
      can_write: rule.can_write,
      can_execute: rule.can_execute,
      upload_limit_mb: rule.upload_limit_mb || 1024,
      download_limit_mb: rule.download_limit_mb || 5120,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRuleTypeLabel = (type: string) => {
    return RULE_TYPES.find(t => t.value === type)?.label || type;
  };

  const groupedRules = rules?.reduce((acc, rule) => {
    if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
    acc[rule.rule_type].push(rule);
    return acc;
  }, {} as Record<string, AccessRule[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Infrastructure Access Rules</CardTitle>
              <CardDescription>
                Control which departments and roles can access infrastructure resources.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingRule(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingRule ? 'Edit Access Rule' : 'Add Access Rule'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!editingRule && (
                    <>
                      <div className="space-y-2">
                        <Label>Rule Type</Label>
                        <Select
                          value={formData.rule_type}
                          onValueChange={(value: 'storage' | 'render_farm' | 'tools') => 
                            setFormData({ ...formData, rule_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Department (optional)</Label>
                        <Select
                          value={formData.department_id}
                          onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All departments</SelectItem>
                            {departments?.map(dept => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Role (optional)</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => setFormData({ ...formData, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All roles</SelectItem>
                            {ROLES.map(role => (
                              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Permissions</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label>Can Read</Label>
                      <Switch
                        checked={formData.can_read}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_read: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Can Write</Label>
                      <Switch
                        checked={formData.can_write}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_write: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Can Execute (Launch/Trigger)</Label>
                      <Switch
                        checked={formData.can_execute}
                        onCheckedChange={(checked) => setFormData({ ...formData, can_execute: checked })}
                      />
                    </div>
                  </div>

                  {formData.rule_type === 'storage' && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium">Limits</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Upload Limit (MB)</Label>
                          <Input
                            type="number"
                            value={formData.upload_limit_mb}
                            onChange={(e) => setFormData({ ...formData, upload_limit_mb: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Download Limit (MB)</Label>
                          <Input
                            type="number"
                            value={formData.download_limit_mb}
                            onChange={(e) => setFormData({ ...formData, download_limit_mb: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingRule ? 'Update Rule' : 'Add Rule'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Default Access Rules:</strong>
              <ul className="list-disc list-inside text-sm mt-1">
                <li>Artists: No infrastructure access</li>
                <li>HOD: Read-only infrastructure status</li>
                <li>Admin: Full control</li>
              </ul>
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom access rules defined. Default rules apply.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRules || {}).map(([type, typeRules]) => (
                <div key={type}>
                  <h4 className="font-medium mb-3">{getRuleTypeLabel(type)}</h4>
                  <div className="space-y-2">
                    {typeRules.map(rule => (
                      <Card key={rule.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Shield className="h-5 w-5 text-primary" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {rule.departments?.name || 'All Departments'}
                                  </span>
                                  {rule.role && (
                                    <Badge variant="outline">
                                      {ROLES.find(r => r.value === rule.role)?.label || rule.role}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-1">
                                  {rule.can_read && <Badge className="text-xs">Read</Badge>}
                                  {rule.can_write && <Badge className="text-xs">Write</Badge>}
                                  {rule.can_execute && <Badge className="text-xs">Execute</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Remove this access rule?')) {
                                    deleteMutation.mutate(rule.id);
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
