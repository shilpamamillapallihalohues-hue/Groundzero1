import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface TimelineItem {
  id: string;
  name: string;
  type: 'scene' | 'shot' | 'milestone';
  startDate: string;
  endDate: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
  dependencies: string[];
}

const mockTimeline: TimelineItem[] = [
  { id: '1', name: 'Scene 1 - Animation', type: 'scene', startDate: 'Jan 1', endDate: 'Jan 15', progress: 100, status: 'completed', dependencies: [] },
  { id: '2', name: 'Scene 1 - Lighting', type: 'scene', startDate: 'Jan 10', endDate: 'Jan 20', progress: 80, status: 'on_track', dependencies: ['1'] },
  { id: '3', name: 'Scene 2 - Animation', type: 'scene', startDate: 'Jan 5', endDate: 'Jan 25', progress: 45, status: 'at_risk', dependencies: [] },
  { id: '4', name: 'Milestone: Act 1 Complete', type: 'milestone', startDate: 'Jan 30', endDate: 'Jan 30', progress: 0, status: 'on_track', dependencies: ['1', '2', '3'] },
  { id: '5', name: 'Scene 3 - Animation', type: 'scene', startDate: 'Jan 20', endDate: 'Feb 10', progress: 20, status: 'on_track', dependencies: [] },
  { id: '6', name: 'Scene 2 - Compositing', type: 'scene', startDate: 'Jan 25', endDate: 'Feb 5', progress: 0, status: 'delayed', dependencies: ['3'] },
];

const Timeline = () => {
  const getStatusBadge = (status: TimelineItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</Badge>;
      case 'on_track':
        return <Badge className="bg-blue-500/10 text-blue-600">On Track</Badge>;
      case 'at_risk':
        return <Badge className="bg-amber-500/10 text-amber-600"><AlertTriangle className="w-3 h-3 mr-1" /> At Risk</Badge>;
      case 'delayed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Delayed</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Timeline / Gantt</h1>
            <p className="text-muted-foreground">Shot timelines and dependencies</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="px-4">
              <Calendar className="w-3 h-3 mr-2" />
              January 2024
            </Badge>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Track</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {mockTimeline.filter(i => i.status === 'on_track').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">At Risk</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {mockTimeline.filter(i => i.status === 'at_risk').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delayed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {mockTimeline.filter(i => i.status === 'delayed').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {mockTimeline.filter(i => i.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gantt Chart Representation */}
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Visual representation of shots and dependencies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground border-b pb-2">
                <div className="col-span-3">Task</div>
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="text-center">W{i + 1}</div>
                ))}
              </div>

              {/* Timeline Items */}
              {mockTimeline.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.type === 'milestone' ? 'text-primary' : ''}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <div className="col-span-9 relative h-8">
                    {/* Simplified Gantt bar */}
                    <div 
                      className={`absolute h-6 rounded ${
                        item.type === 'milestone' 
                          ? 'w-4 bg-primary' 
                          : item.status === 'completed'
                            ? 'bg-green-500/50'
                            : item.status === 'delayed'
                              ? 'bg-red-500/50'
                              : item.status === 'at_risk'
                                ? 'bg-amber-500/50'
                                : 'bg-blue-500/50'
                      }`}
                      style={{
                        left: `${Math.random() * 30}%`,
                        width: item.type === 'milestone' ? '16px' : `${20 + Math.random() * 30}%`
                      }}
                    >
                      {item.type !== 'milestone' && (
                        <div 
                          className="h-full bg-current opacity-50 rounded"
                          style={{ width: `${item.progress}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dependencies */}
        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
            <CardDescription>Task relationships and blockers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTimeline.filter(i => i.dependencies.length > 0).map((item) => (
                <div key={item.id} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Depends on: {item.dependencies.map(d => 
                          mockTimeline.find(t => t.id === d)?.name
                        ).join(', ')}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
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

export default Timeline;
