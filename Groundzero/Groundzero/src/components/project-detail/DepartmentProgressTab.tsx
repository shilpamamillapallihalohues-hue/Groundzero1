import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Kanban, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DepartmentStats {
  department: string;
  total: number;
  pending: number;
  in_progress: number;
  review: number;
  approved: number;
  rejected: number;
}

interface Deliverable {
  id: string;
  title: string;
  department: string;
  status: string;
  asset_type: string;
  created_at: string;
}

interface DepartmentProgressTabProps {
  projectId: string;
}

const DEPARTMENTS = [
  'Direction', 'Cinematography', 'Art Department', 'VFX', 
  'Costume', 'Sound', 'Props', 'Lighting', 'Animation', 'Modeling'
];

const STATUS_COLUMNS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-blue-500' },
  { key: 'review', label: 'Review', icon: AlertCircle, color: 'text-warning' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-success' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-destructive' },
];

const DEPARTMENT_COLORS: Record<string, string> = {
  Direction: 'bg-primary',
  Cinematography: 'bg-info',
  'Art Department': 'bg-success',
  VFX: 'bg-purple-500',
  Costume: 'bg-pink-500',
  Sound: 'bg-warning',
  Props: 'bg-orange-500',
  Lighting: 'bg-yellow-500',
  Animation: 'bg-cyan-500',
  Modeling: 'bg-indigo-500',
};

export function DepartmentProgressTab({ projectId }: DepartmentProgressTabProps) {
  const [stats, setStats] = useState<DepartmentStats[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'progress' | 'kanban'>('progress');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('project_deliverables')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeliverables(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Deliverable[]) => {
    const statsMap: Record<string, DepartmentStats> = {};

    DEPARTMENTS.forEach(dept => {
      statsMap[dept] = {
        department: dept,
        total: 0,
        pending: 0,
        in_progress: 0,
        review: 0,
        approved: 0,
        rejected: 0,
      };
    });

    data.forEach(item => {
      if (statsMap[item.department]) {
        statsMap[item.department].total++;
        const status = item.status as keyof Omit<DepartmentStats, 'department' | 'total'>;
        if (statsMap[item.department][status] !== undefined) {
          (statsMap[item.department][status] as number)++;
        }
      }
    });

    setStats(Object.values(statsMap).filter(s => s.total > 0));
  };

  const getProgressPercentage = (dept: DepartmentStats) => {
    if (dept.total === 0) return 0;
    return Math.round((dept.approved / dept.total) * 100);
  };

  const filteredDeliverables = selectedDepartment
    ? deliverables.filter(d => d.department === selectedDepartment)
    : deliverables;

  const getDeliverablesByStatus = (status: string) => 
    filteredDeliverables.filter(d => d.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('progress')}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Progress View
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2"
          >
            <Kanban className="h-4 w-4" />
            Kanban View
          </Button>
        </div>
        {viewMode === 'kanban' && (
          <div className="flex items-center gap-2">
            <Button
              variant={selectedDepartment === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDepartment(null)}
            >
              All
            </Button>
            {DEPARTMENTS.filter(d => stats.some(s => s.department === d)).map(dept => (
              <Button
                key={dept}
                variant={selectedDepartment === dept ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDepartment(dept)}
              >
                {dept}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Progress View */}
      {viewMode === 'progress' && (
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STATUS_COLUMNS.map(col => {
              const Icon = col.icon;
              const count = deliverables.filter(d => d.status === col.key).length;
              return (
                <Card key={col.key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-5 w-5', col.color)} />
                      <div>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-sm text-muted-foreground">{col.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Department Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Department Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No deliverables yet. Upload assets to see department progress.
                </p>
              ) : (
                stats.map((dept, index) => (
                  <div 
                    key={dept.department}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-medium">{dept.department}</span>
                      <span className="text-muted-foreground">
                        {dept.approved}/{dept.total} approved ({getProgressPercentage(dept)}%)
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
                      <div 
                        className="h-full bg-success transition-all duration-1000"
                        style={{ width: `${(dept.approved / dept.total) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-warning transition-all duration-1000"
                        style={{ width: `${(dept.review / dept.total) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(dept.in_progress / dept.total) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-muted-foreground/30 transition-all duration-1000"
                        style={{ width: `${(dept.pending / dept.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success" /> Approved: {dept.approved}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning" /> Review: {dept.review}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress: {dept.in_progress}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Pending: {dept.pending}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map(col => {
            const Icon = col.icon;
            const items = getDeliverablesByStatus(col.key);
            return (
              <div key={col.key} className="min-w-[250px]">
                <div className={cn('flex items-center gap-2 mb-4 pb-2 border-b-2', 
                  col.key === 'approved' ? 'border-success' : 
                  col.key === 'review' ? 'border-warning' :
                  col.key === 'in_progress' ? 'border-blue-500' :
                  col.key === 'rejected' ? 'border-destructive' :
                  'border-muted'
                )}>
                  <Icon className={cn('h-5 w-5', col.color)} />
                  <span className="font-medium">{col.label}</span>
                  <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                </div>
                <div className="space-y-3">
                  {items.map(item => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.department}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.asset_type}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
