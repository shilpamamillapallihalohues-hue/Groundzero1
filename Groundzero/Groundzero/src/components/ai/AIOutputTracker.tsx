import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Clock, 
  Search, 
  Download, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AITaskOutput } from '@/types/aiOrchestration';
import { format } from 'date-fns';

interface AIOutputTrackerProps {
  projectId?: string;
}

export function AIOutputTracker({ projectId }: AIOutputTrackerProps) {
  const [outputs, setOutputs] = useState<AITaskOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchOutputs = async () => {
      setIsLoading(true);
      let query = supabase
        .from('ai_task_outputs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching AI outputs:', error);
        setIsLoading(false);
        return;
      }

      const typedOutputs: AITaskOutput[] = (data || []).map(o => ({
        id: o.id,
        project_id: o.project_id,
        task_key: o.task_key,
        model_id: o.model_id,
        model_version: o.model_version,
        input_data: (o.input_data as Record<string, unknown>) || {},
        output_data: (o.output_data as Record<string, unknown>) || {},
        parameters: (o.parameters as Record<string, unknown>) || {},
        seed: o.seed,
        execution_time_ms: o.execution_time_ms,
        token_usage: (o.token_usage as Record<string, number>) || {},
        status: o.status as 'pending' | 'processing' | 'completed' | 'failed',
        error_message: o.error_message,
        created_by: o.created_by,
        created_at: o.created_at
      }));

      setOutputs(typedOutputs);
      setIsLoading(false);
    };

    fetchOutputs();
  }, [projectId]);

  const filteredOutputs = outputs.filter(output => {
    const matchesSearch = 
      output.task_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      output.model_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTask = taskFilter === 'all' || output.task_key === taskFilter;
    const matchesStatus = statusFilter === 'all' || output.status === statusFilter;

    return matchesSearch && matchesTask && matchesStatus;
  });

  const uniqueTasks = [...new Set(outputs.map(o => o.task_key))];

  const exportData = () => {
    const exportJson = JSON.stringify(filteredOutputs, null, 2);
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-outputs-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatModelId = (modelId: string) => {
    const parts = modelId.split('/');
    return parts[parts.length - 1];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">AI Output Traceability</CardTitle>
            <CardDescription>
              View and export all AI-generated outputs with full metadata
            </CardDescription>
          </div>
          <Button variant="outline" onClick={exportData} disabled={filteredOutputs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by task or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={taskFilter} onValueChange={setTaskFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by task" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              {uniqueTasks.map(task => (
                <SelectItem key={task} value={task}>
                  {task.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Table */}
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOutputs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p>No AI outputs recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Seed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOutputs.map(output => (
                  <TableRow key={output.id}>
                    <TableCell>
                      {getStatusIcon(output.status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {output.task_key.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {formatModelId(output.model_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {output.seed ? (
                        <span className="font-mono text-xs">{output.seed}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {output.execution_time_ms ? (
                        <span className="text-xs">
                          {(output.execution_time_ms / 1000).toFixed(2)}s
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {output.token_usage.total_tokens ? (
                        <span className="text-xs">
                          {output.token_usage.total_tokens}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(output.created_at), 'MMM d, HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{filteredOutputs.length} outputs shown</span>
          <span>
            Total tokens: {filteredOutputs.reduce((sum, o) => sum + (o.token_usage.total_tokens || 0), 0).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
