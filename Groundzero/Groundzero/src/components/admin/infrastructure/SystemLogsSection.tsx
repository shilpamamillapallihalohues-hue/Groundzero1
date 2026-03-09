import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, Search, AlertTriangle, Info, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface InfraLog {
  id: string;
  log_type: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

const LOG_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'storage', label: 'Storage' },
  { value: 'render', label: 'Render' },
  { value: 'permission', label: 'Permission' },
  { value: 'connection', label: 'Connection' },
  { value: 'system', label: 'System' },
];

const SEVERITY_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

export function SystemLogsSection() {
  const [logType, setLogType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['infrastructure-logs', logType, severity, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('infrastructure_logs')
        .select(`
          *,
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (logType !== 'all') {
        query = query.eq('log_type', logType);
      }
      if (severity !== 'all') {
        query = query.eq('severity', severity);
      }

      // Date filtering
      const now = new Date();
      if (dateRange === 'today') {
        const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte('created_at', today);
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('created_at', weekAgo);
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        query = query.gte('created_at', monthAgo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InfraLog[];
    },
  });

  const filteredLogs = logs?.filter(log => 
    searchQuery === '' || 
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.log_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-700" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    const variants: Record<string, string> = {
      info: 'bg-blue-500/20 text-blue-500',
      warning: 'bg-yellow-500/20 text-yellow-500',
      error: 'bg-red-500/20 text-red-500',
      critical: 'bg-red-700/20 text-red-700',
    };
    return (
      <Badge className={variants[sev] || ''}>
        {sev.charAt(0).toUpperCase() + sev.slice(1)}
      </Badge>
    );
  };

  const handleDownload = () => {
    if (!filteredLogs) return;
    
    const csvContent = [
      ['Timestamp', 'Type', 'Severity', 'Message', 'User', 'Details'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.log_type,
        log.severity,
        `"${log.message.replace(/"/g, '""')}"`,
        log.profiles?.full_name || 'System',
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infrastructure-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const logStats = {
    total: logs?.length || 0,
    errors: logs?.filter(l => l.severity === 'error' || l.severity === 'critical').length || 0,
    warnings: logs?.filter(l => l.severity === 'warning').length || 0,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Logs & Diagnostics</CardTitle>
              <CardDescription>
                View storage failures, render errors, permission issues, and connection history.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleDownload} disabled={!filteredLogs?.length}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{logStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Logs</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-500">{logStats.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-500">{logStats.warnings}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={logType} onValueChange={setLogType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(value: typeof dateRange) => setDateRange(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLogs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your filters.
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredLogs?.map(log => (
                  <Card key={log.id} className="bg-background">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(log.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getSeverityBadge(log.severity)}
                            <Badge variant="outline">{log.log_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                            </span>
                            {log.profiles && (
                              <span className="text-xs text-muted-foreground">
                                by {log.profiles.full_name}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{log.message}</p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
