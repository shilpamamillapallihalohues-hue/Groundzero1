import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor,
  Cpu,
  HardDrive,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';

interface RenderJob {
  id: string;
  name: string;
  type: 'shot' | 'asset';
  status: 'queued' | 'rendering' | 'completed' | 'failed' | 'paused';
  progress: number;
  eta: string;
  frames: string;
  submittedBy: string;
  submittedAt: string;
}

const mockJobs: RenderJob[] = [
  { id: '1', name: 'SC01_SH010_v2', type: 'shot', status: 'rendering', progress: 45, eta: '2h 15m', frames: '1-120', submittedBy: 'John Artist', submittedAt: '2 hours ago' },
  { id: '2', name: 'SC01_SH020_v1', type: 'shot', status: 'queued', progress: 0, eta: '3h 30m', frames: '1-180', submittedBy: 'Sarah Animator', submittedAt: '1 hour ago' },
  { id: '3', name: 'Hero Character Turntable', type: 'asset', status: 'completed', progress: 100, eta: '-', frames: '1-60', submittedBy: 'Mike Modeler', submittedAt: '5 hours ago' },
  { id: '4', name: 'SC02_SH010_v1', type: 'shot', status: 'failed', progress: 23, eta: '-', frames: '1-240', submittedBy: 'Lisa Lighter', submittedAt: '3 hours ago' },
  { id: '5', name: 'Environment Preview', type: 'asset', status: 'paused', progress: 67, eta: '45m', frames: '1-30', submittedBy: 'Tom Environment', submittedAt: '4 hours ago' },
];

const RenderManagement = () => {
  const [activeTab, setActiveTab] = useState('queue');

  const stats = {
    rendering: mockJobs.filter(j => j.status === 'rendering').length,
    queued: mockJobs.filter(j => j.status === 'queued').length,
    completed: mockJobs.filter(j => j.status === 'completed').length,
    failed: mockJobs.filter(j => j.status === 'failed').length,
  };

  const getStatusBadge = (status: RenderJob['status']) => {
    switch (status) {
      case 'rendering':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Cpu className="w-3 h-3 mr-1 animate-spin" /> Rendering</Badge>;
      case 'queued':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Render Management</h1>
            <p className="text-muted-foreground">Monitor and manage render queue</p>
          </div>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            <Monitor className="w-3 h-3 mr-1" />
            Render Wrangler
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rendering</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.rendering}</p>
                </div>
                <Cpu className="h-8 w-8 text-blue-500/50 animate-spin" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Queued</p>
                  <p className="text-2xl font-bold">{stats.queued}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Farm Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Render Farm Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-medium">78%</span>
                </div>
                <Progress value={78} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm font-medium">65%</span>
                </div>
                <Progress value={65} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">GPU Usage</span>
                  <span className="text-sm font-medium">92%</span>
                </div>
                <Progress value={92} className="bg-amber-100 [&>div]:bg-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="queue">Render Queue</TabsTrigger>
            <TabsTrigger value="failed">Failed Renders</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Queue</CardTitle>
                <CardDescription>Jobs currently rendering or waiting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockJobs.filter(j => ['rendering', 'queued', 'paused'].includes(j.status)).map((job) => (
                    <div key={job.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{job.name}</span>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Frames: {job.frames} • By: {job.submittedBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.status === 'rendering' && (
                            <Button variant="outline" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === 'paused' && (
                            <Button variant="outline" size="sm">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {job.status === 'rendering' && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{job.progress}%</span>
                            <span className="text-muted-foreground">ETA: {job.eta}</span>
                          </div>
                          <Progress value={job.progress} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Failed Renders
                </CardTitle>
                <CardDescription>Jobs that encountered errors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockJobs.filter(j => j.status === 'failed').map((job) => (
                    <div key={job.id} className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{job.name}</span>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Failed at frame 28 • Error: Memory allocation failed
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                          <Button variant="ghost" size="sm">View Log</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Completed Renders
                </CardTitle>
                <CardDescription>Successfully rendered jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockJobs.filter(j => j.status === 'completed').map((job) => (
                    <div key={job.id} className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{job.name}</span>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Frames: {job.frames} • Completed {job.submittedAt}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">View Output</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default RenderManagement;
