import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Server, Cpu, MemoryStick, HardDrive, Network, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface RenderNode {
  id: string;
  node_name: string;
  ip_address: string;
  status: string;
  last_heartbeat?: string;
  cpu_usage?: number;
  ram_usage?: number;
  disk_usage?: number;
  is_active: boolean;
}

interface StorageConfig {
  id: string;
  storage_name: string;
  storage_type: string;
  is_active: boolean;
  last_test_status?: string;
  last_tested_at?: string;
}

export function ServerHealthSection() {
  const { data: nodes, isLoading: nodesLoading, refetch: refetchNodes } = useQuery({
    queryKey: ['render-farm-nodes-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('render_farm_nodes')
        .select('*')
        .eq('is_active', true)
        .order('node_name');
      if (error) throw error;
      return data as RenderNode[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: storages, isLoading: storagesLoading, refetch: refetchStorages } = useQuery({
    queryKey: ['storage-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_configurations')
        .select('*')
        .eq('is_active', true)
        .order('storage_name');
      if (error) throw error;
      return data as StorageConfig[];
    },
    refetchInterval: 30000,
  });

  const getUsageColor = (usage?: number) => {
    if (!usage) return 'bg-muted';
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'busy':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const overallHealth = () => {
    const nodeIssues = nodes?.filter(n => n.status !== 'online').length || 0;
    const storageIssues = storages?.filter(s => s.last_test_status !== 'healthy').length || 0;
    
    if (nodeIssues === 0 && storageIssues === 0) return { status: 'healthy', label: 'All Systems Operational' };
    if (nodeIssues > 0 || storageIssues > 0) return { status: 'warning', label: 'Some Issues Detected' };
    return { status: 'error', label: 'Critical Issues' };
  };

  const health = overallHealth();

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <Card className={`border-2 ${
        health.status === 'healthy' ? 'border-green-500/50 bg-green-500/5' :
        health.status === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' :
        'border-red-500/50 bg-red-500/5'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(health.status)}
              <div>
                <h3 className="text-lg font-semibold">{health.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {nodes?.length || 0} render nodes • {storages?.length || 0} storage systems
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                refetchNodes();
                refetchStorages();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Render Nodes Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Render Node Status
          </CardTitle>
          <CardDescription>Live monitoring of render farm nodes.</CardDescription>
        </CardHeader>
        <CardContent>
          {nodesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : nodes?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active render nodes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nodes?.map(node => (
                <Card key={node.id} className="bg-muted/30">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(node.status)}
                        <div>
                          <h4 className="font-medium">{node.node_name}</h4>
                          <p className="text-xs text-muted-foreground">{node.ip_address}</p>
                        </div>
                      </div>
                      <Badge variant={node.status === 'online' ? 'default' : 'secondary'}>
                        {node.status}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> CPU
                          </span>
                          <span>{node.cpu_usage?.toFixed(1) || 0}%</span>
                        </div>
                        <Progress 
                          value={node.cpu_usage || 0} 
                          className={`h-2 ${getUsageColor(node.cpu_usage)}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <MemoryStick className="h-3 w-3" /> RAM
                          </span>
                          <span>{node.ram_usage?.toFixed(1) || 0}%</span>
                        </div>
                        <Progress 
                          value={node.ram_usage || 0} 
                          className={`h-2 ${getUsageColor(node.ram_usage)}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" /> Disk
                          </span>
                          <span>{node.disk_usage?.toFixed(1) || 0}%</span>
                        </div>
                        <Progress 
                          value={node.disk_usage || 0} 
                          className={`h-2 ${getUsageColor(node.disk_usage)}`}
                        />
                      </div>
                    </div>

                    {node.last_heartbeat && (
                      <p className="text-xs text-muted-foreground">
                        Last heartbeat: {format(new Date(node.last_heartbeat), 'MMM d, HH:mm:ss')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Storage System Status
          </CardTitle>
          <CardDescription>Connection status of configured storage systems.</CardDescription>
        </CardHeader>
        <CardContent>
          {storagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : storages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active storage systems.
            </div>
          ) : (
            <div className="space-y-3">
              {storages?.map(storage => (
                <div key={storage.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(storage.last_test_status || 'unknown')}
                    <div>
                      <h4 className="font-medium">{storage.storage_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {storage.storage_type.charAt(0).toUpperCase() + storage.storage_type.slice(1)} Storage
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={storage.last_test_status === 'healthy' ? 'default' : 'secondary'}>
                      {storage.last_test_status || 'Not tested'}
                    </Badge>
                    {storage.last_tested_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tested: {format(new Date(storage.last_tested_at), 'MMM d, HH:mm')}
                      </p>
                    )}
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
