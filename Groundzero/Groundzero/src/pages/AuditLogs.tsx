import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield,
  Search,
  Filter,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  performed_by: string;
  timestamp: string;
  details: string;
  type: 'approval' | 'override' | 'routing' | 'create' | 'update' | 'delete';
}

const mockLogs: AuditLog[] = [
  { id: '1', action: 'Asset Approved', entity_type: 'asset', entity_id: 'AST-001', performed_by: 'Director', timestamp: '2024-01-07 14:30', details: 'Character model approved for animation', type: 'approval' },
  { id: '2', action: 'Stage Override', entity_type: 'project', entity_id: 'PRJ-001', performed_by: 'Super User', timestamp: '2024-01-07 12:15', details: 'Force moved to Production stage', type: 'override' },
  { id: '3', action: 'Asset Routed', entity_type: 'asset', entity_id: 'AST-002', performed_by: 'System', timestamp: '2024-01-07 11:00', details: 'Auto-routed to Texturing department', type: 'routing' },
  { id: '4', action: 'Asset Rejected', entity_type: 'asset', entity_id: 'AST-003', performed_by: 'Director', timestamp: '2024-01-07 10:30', details: 'Needs rework on lighting', type: 'approval' },
  { id: '5', action: 'User Created', entity_type: 'user', entity_id: 'USR-005', performed_by: 'Admin', timestamp: '2024-01-06 16:00', details: 'New artist added to team', type: 'create' },
];

const AuditLogs = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useUserRole();
  const { role } = useProductionRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Producer can view (read-only), Super User has full access
  const hasAccess = isAdmin || role === 'producer';

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      navigate('/');
    }
  }, [hasAccess, isLoading, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const getActionIcon = (type: AuditLog['type']) => {
    switch (type) {
      case 'approval': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'override': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'routing': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      case 'delete': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">Track all system actions and changes</p>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                Read Only
              </Badge>
            )}
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              <Shield className="w-3 h-3 mr-1" />
              Restricted Access
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="approval">Approvals</SelectItem>
                  <SelectItem value="override">Overrides</SelectItem>
                  <SelectItem value="routing">Routing</SelectItem>
                  <SelectItem value="create">Creates</SelectItem>
                  <SelectItem value="update">Updates</SelectItem>
                  <SelectItem value="delete">Deletes</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="mt-1">{getActionIcon(log.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.action}</span>
                      <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>By: {log.performed_by}</span>
                      <span>•</span>
                      <span>{log.timestamp}</span>
                      <span>•</span>
                      <span>ID: {log.entity_id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AuditLogs;
