import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LayoutDashboard,
  Package,
  Video,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  Wrench,
  FolderOpen
} from 'lucide-react';

const DEPARTMENT_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  'modelling': { name: '3D Modelling', color: 'bg-blue-500', icon: '🎨' },
  'texturing': { name: 'Texturing', color: 'bg-purple-500', icon: '🖌️' },
  'rigging': { name: 'Rigging', color: 'bg-green-500', icon: '🦴' },
  'animation': { name: 'Animation', color: 'bg-orange-500', icon: '🎬' },
  'fx': { name: 'FX / Simulation', color: 'bg-red-500', icon: '✨' },
  'lighting': { name: 'Lighting', color: 'bg-yellow-500', icon: '💡' },
  'compositing': { name: 'Compositing', color: 'bg-cyan-500', icon: '🎞️' },
};

const DepartmentWorkspace = () => {
  const { departmentId } = useParams();
  const { role, isHOD, isArtist } = useProductionRole();
  const [activeTab, setActiveTab] = useState('dashboard');

  const deptConfig = DEPARTMENT_CONFIG[departmentId || 'modelling'] || DEPARTMENT_CONFIG['modelling'];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{deptConfig.icon}</span>
              <h1 className="text-3xl font-bold">{deptConfig.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">Department workspace and asset management</p>
          </div>
          <Badge variant="outline" className={`${deptConfig.color} text-white border-0`}>
            {isHOD ? 'Department Lead' : 'Artist'}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="shots">Shots</TabsTrigger>
            {isHOD && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">In department</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">8</div>
                  <p className="text-xs text-muted-foreground">Awaiting approval</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rework</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">3</div>
                  <p className="text-xs text-muted-foreground">Needs revision</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">45</div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Department Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Overall Completion</span>
                      <span className="text-sm font-medium">68%</span>
                    </div>
                    <Progress value={68} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">On Schedule</span>
                      <span className="text-sm font-medium text-green-600">85%</span>
                    </div>
                    <Progress value={85} className="bg-green-100 [&>div]:bg-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Active Tasks
                </CardTitle>
                <CardDescription>Auto-created tasks from asset routing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Hero Character - Base Mesh', priority: 'high', due: 'Tomorrow', status: 'in_progress' },
                    { name: 'Spaceship Interior', priority: 'medium', due: 'Jan 10', status: 'pending' },
                    { name: 'Alien Creature Design', priority: 'high', due: 'Jan 8', status: 'in_progress' },
                  ].map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-sm text-muted-foreground">Due: {task.due}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Department Assets
                </CardTitle>
                <CardDescription>Assets routed to this department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'Hero Character', type: 'Character', version: 'v3', status: 'in_progress' },
                    { name: 'Command Center', type: 'Environment', version: 'v2', status: 'review' },
                    { name: 'Laser Rifle', type: 'Prop', version: 'v1', status: 'pending' },
                  ].map((asset, index) => (
                    <Card key={index} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{asset.name}</span>
                          <Badge variant="outline">{asset.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{asset.type}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant={asset.status === 'review' ? 'default' : 'secondary'}>
                            {asset.status}
                          </Badge>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shots Tab */}
          <TabsContent value="shots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Department Shots
                </CardTitle>
                <CardDescription>Shots assigned to this department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { shot: 'SC01_SH010', scene: 'Scene 1', frames: '1-120', status: 'in_progress' },
                    { shot: 'SC01_SH020', scene: 'Scene 1', frames: '121-200', status: 'pending' },
                    { shot: 'SC02_SH010', scene: 'Scene 2', frames: '1-180', status: 'review' },
                  ].map((shot, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{shot.shot}</p>
                        <p className="text-sm text-muted-foreground">{shot.scene} • Frames: {shot.frames}</p>
                      </div>
                      <Badge variant={shot.status === 'review' ? 'default' : 'secondary'}>
                        {shot.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab (HOD Only) */}
          {isHOD && (
            <TabsContent value="reviews" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Internal Review Queue
                  </CardTitle>
                  <CardDescription>Assets awaiting your approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { asset: 'Hero Character v3', artist: 'John Artist', submitted: '2 hours ago' },
                      { asset: 'Spaceship v2', artist: 'Sarah Designer', submitted: '5 hours ago' },
                    ].map((review, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{review.asset}</p>
                          <p className="text-sm text-muted-foreground">By {review.artist} • {review.submitted}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">Review</Button>
                          <Button size="sm">Approve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Tool Launcher
                </CardTitle>
                <CardDescription>Launch DCC tools with project context</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Blender', icon: '🎨', configured: true },
                    { name: 'Maya', icon: '🔧', configured: true },
                    { name: 'ZBrush', icon: '🗿', configured: false },
                    { name: 'Substance', icon: '🖌️', configured: true },
                  ].map((tool, index) => (
                    <Button
                      key={index}
                      variant={tool.configured ? 'outline' : 'ghost'}
                      className="h-20 flex-col gap-2"
                      disabled={!tool.configured}
                    >
                      <span className="text-2xl">{tool.icon}</span>
                      <span>{tool.name}</span>
                    </Button>
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

export default DepartmentWorkspace;
