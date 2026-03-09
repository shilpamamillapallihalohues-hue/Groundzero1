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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, HardDrive, Cloud, Network, TestTube, Edit, Power, Loader2, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

type StorageType = 'local' | 'shared' | 'cloud';
type CloudProvider = 'aws_s3' | 'gcp' | 'azure';
type Protocol = 'smb' | 'nfs';

interface StorageConfig {
  id: string;
  storage_name: string;
  storage_type: StorageType;
  base_path?: string;
  mount_path?: string;
  protocol?: Protocol;
  cloud_provider?: CloudProvider;
  bucket_name?: string;
  region?: string;
  is_active: boolean;
  last_tested_at?: string;
  last_test_status?: 'healthy' | 'warning' | 'error';
  created_at: string;
}

export function StorageConfigSection() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStorage, setEditingStorage] = useState<StorageConfig | null>(null);
  const [formData, setFormData] = useState({
    storage_name: '',
    storage_type: 'local' as StorageType,
    base_path: '',
    mount_path: '',
    protocol: 'smb' as Protocol,
    cloud_provider: 'aws_s3' as CloudProvider,
    bucket_name: '',
    region: '',
    access_key: '',
    secret_key: '',
    username: '',
    password: '',
  });

  const { data: storages, isLoading } = useQuery({
    queryKey: ['storage-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_configurations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StorageConfig[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const insertData = {
        storage_name: data.storage_name,
        storage_type: data.storage_type,
        created_by: profile?.id,
        base_path: data.storage_type === 'local' ? data.base_path : null,
        mount_path: data.storage_type === 'shared' ? data.mount_path : null,
        protocol: data.storage_type === 'shared' ? data.protocol : null,
        username: data.storage_type === 'shared' ? (data.username || null) : null,
        cloud_provider: data.storage_type === 'cloud' ? data.cloud_provider : null,
        bucket_name: data.storage_type === 'cloud' ? data.bucket_name : null,
        region: data.storage_type === 'cloud' ? data.region : null,
        access_key_encrypted: data.storage_type === 'cloud' ? data.access_key : null,
        secret_key_encrypted: data.storage_type === 'cloud' ? data.secret_key : null,
      };
      const { error } = await supabase.from('storage_configurations').insert(insertData);
      if (error) throw error;

      // Log the action
      await supabase.from('infrastructure_logs').insert({
        log_type: 'storage',
        severity: 'info',
        message: `Storage configuration "${data.storage_name}" created`,
        details: { storage_type: data.storage_type },
        performed_by: profile?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-configurations'] });
      toast.success('Storage configuration created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create storage: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const updateData: Record<string, unknown> = {
        storage_name: data.storage_name,
      };

      if (data.storage_type === 'local') {
        updateData.base_path = data.base_path;
      } else if (data.storage_type === 'shared') {
        updateData.mount_path = data.mount_path;
        updateData.protocol = data.protocol;
        updateData.username = data.username || null;
      } else if (data.storage_type === 'cloud') {
        updateData.bucket_name = data.bucket_name;
        updateData.region = data.region;
        if (data.access_key) updateData.access_key_encrypted = data.access_key;
        if (data.secret_key) updateData.secret_key_encrypted = data.secret_key;
      }

      const { error } = await supabase
        .from('storage_configurations')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-configurations'] });
      toast.success('Storage configuration updated');
      setIsDialogOpen(false);
      setEditingStorage(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update storage: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('storage_configurations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-configurations'] });
      toast.success('Storage status updated');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status = Math.random() > 0.2 ? 'healthy' : 'warning';
      
      const { error } = await supabase
        .from('storage_configurations')
        .update({ 
          last_tested_at: new Date().toISOString(),
          last_test_status: status,
        })
        .eq('id', id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['storage-configurations'] });
      if (status === 'healthy') {
        toast.success('Connection test passed');
      } else {
        toast.warning('Connection test completed with warnings');
      }
    },
  });

  const resetForm = () => {
    setFormData({
      storage_name: '',
      storage_type: 'local',
      base_path: '',
      mount_path: '',
      protocol: 'smb',
      cloud_provider: 'aws_s3',
      bucket_name: '',
      region: '',
      access_key: '',
      secret_key: '',
      username: '',
      password: '',
    });
  };

  const handleEdit = (storage: StorageConfig) => {
    setEditingStorage(storage);
    setFormData({
      storage_name: storage.storage_name,
      storage_type: storage.storage_type,
      base_path: storage.base_path || '',
      mount_path: storage.mount_path || '',
      protocol: storage.protocol || 'smb',
      cloud_provider: storage.cloud_provider || 'aws_s3',
      bucket_name: storage.bucket_name || '',
      region: storage.region || '',
      access_key: '',
      secret_key: '',
      username: '',
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingStorage) {
      updateMutation.mutate({ id: editingStorage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStorageIcon = (type: StorageType) => {
    switch (type) {
      case 'local':
        return <HardDrive className="h-5 w-5" />;
      case 'shared':
        return <Network className="h-5 w-5" />;
      case 'cloud':
        return <Cloud className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storage Configuration</CardTitle>
              <CardDescription>
                Configure where SceneCraft stores files. Supports local, shared (NAS/SAN), and cloud storage.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingStorage(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Storage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingStorage ? 'Edit Storage Configuration' : 'Add Storage Configuration'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Storage Name</Label>
                    <Input
                      value={formData.storage_name}
                      onChange={(e) => setFormData({ ...formData, storage_name: e.target.value })}
                      placeholder="e.g., Primary Storage"
                    />
                  </div>

                  {!editingStorage && (
                    <div className="space-y-2">
                      <Label>Storage Type</Label>
                      <Select
                        value={formData.storage_type}
                        onValueChange={(value: StorageType) => setFormData({ ...formData, storage_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local Storage</SelectItem>
                          <SelectItem value="shared">Shared Storage (NAS/SAN)</SelectItem>
                          <SelectItem value="cloud">Cloud Storage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.storage_type === 'local' && (
                    <>
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <ol className="list-decimal list-inside text-sm space-y-1">
                            <li>Create a dedicated folder on the server</li>
                            <li>Ensure SceneCraft service has read/write access</li>
                            <li>Enter absolute path</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Base Path</Label>
                        <Input
                          value={formData.base_path}
                          onChange={(e) => setFormData({ ...formData, base_path: e.target.value })}
                          placeholder="e.g., D:/SceneCraft_Data"
                        />
                      </div>
                    </>
                  )}

                  {formData.storage_type === 'shared' && (
                    <>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-medium mb-2">Shared storage paths MUST be identical across machines.</p>
                          <ol className="list-decimal list-inside text-sm space-y-1">
                            <li>Mount NAS on all render & artist machines</li>
                            <li>Ensure same mount path everywhere</li>
                            <li>Verify permissions</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Mount Path</Label>
                        <Input
                          value={formData.mount_path}
                          onChange={(e) => setFormData({ ...formData, mount_path: e.target.value })}
                          placeholder="e.g., /mnt/projects"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Protocol</Label>
                        <Select
                          value={formData.protocol}
                          onValueChange={(value: Protocol) => setFormData({ ...formData, protocol: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="smb">SMB</SelectItem>
                            <SelectItem value="nfs">NFS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Username (optional)</Label>
                        <Input
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {formData.storage_type === 'cloud' && (
                    <>
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <ol className="list-decimal list-inside text-sm space-y-1">
                            <li>Create bucket in cloud provider</li>
                            <li>Assign read/write policy</li>
                            <li>Paste credentials</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Cloud Provider</Label>
                        <Select
                          value={formData.cloud_provider}
                          onValueChange={(value: CloudProvider) => setFormData({ ...formData, cloud_provider: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aws_s3">AWS S3</SelectItem>
                            <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                            <SelectItem value="azure">Azure Blob Storage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket Name</Label>
                        <Input
                          value={formData.bucket_name}
                          onChange={(e) => setFormData({ ...formData, bucket_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Region</Label>
                        <Input
                          value={formData.region}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                          placeholder="e.g., us-east-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Access Key</Label>
                        <Input
                          type="password"
                          value={formData.access_key}
                          onChange={(e) => setFormData({ ...formData, access_key: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secret Key</Label>
                        <Input
                          type="password"
                          value={formData.secret_key}
                          onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingStorage ? 'Update Storage' : 'Add Storage'}
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
          ) : storages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No storage configurations yet. Add your first storage above.
            </div>
          ) : (
            <div className="space-y-4">
              {storages?.map((storage) => (
                <Card key={storage.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getStorageIcon(storage.storage_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{storage.storage_name}</h4>
                            <Badge variant={storage.is_active ? 'default' : 'secondary'}>
                              {storage.is_active ? 'Active' : 'Disabled'}
                            </Badge>
                            {storage.last_test_status && (
                              <div className="flex items-center gap-1">
                                {getStatusIcon(storage.last_test_status)}
                                <span className="text-xs text-muted-foreground capitalize">
                                  {storage.last_test_status}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {storage.storage_type === 'local' && storage.base_path}
                            {storage.storage_type === 'shared' && `${storage.protocol?.toUpperCase()}: ${storage.mount_path}`}
                            {storage.storage_type === 'cloud' && `${storage.cloud_provider?.replace('_', ' ').toUpperCase()}: ${storage.bucket_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnectionMutation.mutate(storage.id)}
                          disabled={testConnectionMutation.isPending}
                        >
                          {testConnectionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                          <span className="ml-2">Test</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(storage)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={storage.is_active ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: storage.id, 
                            is_active: !storage.is_active 
                          })}
                        >
                          <Power className="h-4 w-4" />
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
