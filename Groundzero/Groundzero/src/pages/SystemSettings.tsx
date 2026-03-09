import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield,
  Workflow,
  GitBranch,
  Wrench,
  Brain,
  HardDrive,
  Save
} from 'lucide-react';

const SystemSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useUserRole();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">Configure platform-wide settings</p>
          </div>
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <Shield className="w-3 h-3 mr-1" />
            Super User Only
          </Badge>
        </div>

        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Pipeline Rules
                </CardTitle>
                <CardDescription>Configure stage-gating and approval requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Director Approval for Stage Transitions</Label>
                    <p className="text-sm text-muted-foreground">Assets must be approved before moving to next stage</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-route Assets After Approval</Label>
                    <p className="text-sm text-muted-foreground">Automatically move assets to next department</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require HOD Internal Review</Label>
                    <p className="text-sm text-muted-foreground">Assets must pass internal review before Director</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Routing Templates
                </CardTitle>
                <CardDescription>Define asset routing paths through departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Character Asset', path: '3D → Texturing → Rigging → Animation' },
                    { name: 'Environment Asset', path: '3D → Texturing → Lighting → Compositing' },
                    { name: 'FX Asset', path: 'FX → Lighting → Compositing' },
                    { name: 'Prop Asset', path: '3D → Texturing → Lighting' },
                  ].map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.path}</p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Tool Integrations
                </CardTitle>
                <CardDescription>Configure external DCC tool paths</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Blender', path: '/Applications/Blender.app', status: 'configured' },
                    { name: 'Maya', path: '/Applications/Maya2024', status: 'configured' },
                    { name: 'Houdini', path: '/Applications/Houdini', status: 'configured' },
                    { name: 'Nuke', path: '/Applications/Nuke', status: 'not_configured' },
                  ].map((tool, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{tool.name}</p>
                        <p className="text-sm text-muted-foreground">{tool.path}</p>
                      </div>
                      <Badge variant={tool.status === 'configured' ? 'default' : 'secondary'}>
                        {tool.status === 'configured' ? 'Configured' : 'Not Set'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Configuration
                </CardTitle>
                <CardDescription>Configure AI assistance settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable AI Auto-tagging</Label>
                    <p className="text-sm text-muted-foreground">Automatically tag uploaded assets</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Continuity Checks</Label>
                    <p className="text-sm text-muted-foreground">Highlight potential continuity issues</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Suggestions (Non-decisional)</Label>
                    <p className="text-sm text-muted-foreground">Show AI recommendations to users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage Configuration
                </CardTitle>
                <CardDescription>Manage storage settings and quotas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Project Storage Limit</Label>
                    <p className="text-sm text-muted-foreground">Maximum storage per project</p>
                  </div>
                  <span className="font-medium">500 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-archive Old Versions</Label>
                    <p className="text-sm text-muted-foreground">Archive versions older than 90 days</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default SystemSettings;
