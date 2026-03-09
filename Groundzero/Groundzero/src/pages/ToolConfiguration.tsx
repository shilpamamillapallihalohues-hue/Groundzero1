// MainLayout is provided by App.tsx router - do not import here
import { useProductionRole } from '@/hooks/useProductionRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings,
  FolderOpen,
  FileCode,
  Ruler,
  Tag,
  Save
} from 'lucide-react';

const ToolConfiguration = () => {
  const { isHOD, isSuperUser } = useProductionRole();
  const canEdit = isHOD || isSuperUser;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tool Configuration</h1>
            <p className="text-muted-foreground">Configure DCC tool paths and export settings</p>
          </div>
          {!canEdit && (
            <Badge variant="secondary">View Only</Badge>
          )}
        </div>

        <Tabs defaultValue="paths" className="w-full">
          <TabsList>
            <TabsTrigger value="paths">Tool Paths</TabsTrigger>
            <TabsTrigger value="export">Export Presets</TabsTrigger>
            <TabsTrigger value="units">Units & Scale</TabsTrigger>
            <TabsTrigger value="naming">Naming Conventions</TabsTrigger>
          </TabsList>

          <TabsContent value="paths" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Application Paths
                </CardTitle>
                <CardDescription>Configure paths to DCC applications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Blender', path: '/Applications/Blender.app', version: '4.0' },
                  { name: 'Maya', path: '/Applications/Autodesk/Maya2024', version: '2024' },
                  { name: 'Houdini', path: '/Applications/Houdini/19.5', version: '19.5' },
                  { name: 'Nuke', path: '/Applications/Nuke14.0v5', version: '14.0' },
                  { name: 'Substance Painter', path: '/Applications/Adobe/Substance 3D Painter', version: '9.0' },
                ].map((tool) => (
                  <div key={tool.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{tool.name}</Label>
                      <Badge variant="outline">{tool.version}</Badge>
                    </div>
                    <Input value={tool.path} disabled={!canEdit} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Export Presets
                </CardTitle>
                <CardDescription>Configure default export settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">3D Models</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Format</Label>
                      <Select defaultValue="fbx" disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fbx">FBX</SelectItem>
                          <SelectItem value="obj">OBJ</SelectItem>
                          <SelectItem value="gltf">glTF</SelectItem>
                          <SelectItem value="abc">Alembic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Include Textures</Label>
                      <div className="pt-2">
                        <Switch defaultChecked disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Textures</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Format</Label>
                      <Select defaultValue="exr" disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exr">EXR</SelectItem>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="tiff">TIFF</SelectItem>
                          <SelectItem value="jpg">JPEG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Resolution</Label>
                      <Select defaultValue="4k" disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2k">2K (2048px)</SelectItem>
                          <SelectItem value="4k">4K (4096px)</SelectItem>
                          <SelectItem value="8k">8K (8192px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Units & Scale
                </CardTitle>
                <CardDescription>Configure scene units and scale settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Scene Unit</Label>
                    <Select defaultValue="cm" disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">Millimeters</SelectItem>
                        <SelectItem value="cm">Centimeters</SelectItem>
                        <SelectItem value="m">Meters</SelectItem>
                        <SelectItem value="in">Inches</SelectItem>
                        <SelectItem value="ft">Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frame Rate</Label>
                    <Select defaultValue="24" disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 fps</SelectItem>
                        <SelectItem value="25">25 fps</SelectItem>
                        <SelectItem value="30">30 fps</SelectItem>
                        <SelectItem value="60">60 fps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Auto-convert on Import</Label>
                    <p className="text-sm text-muted-foreground">Automatically convert imported assets to project units</p>
                  </div>
                  <Switch defaultChecked disabled={!canEdit} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="naming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Naming Conventions
                </CardTitle>
                <CardDescription>Configure asset naming rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset Naming Pattern</Label>
                  <Input 
                    value="{project}_{asset}_{type}_{version}" 
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available tokens: {'{project}'}, {'{scene}'}, {'{shot}'}, {'{asset}'}, {'{type}'}, {'{version}'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Shot Naming Pattern</Label>
                  <Input 
                    value="SC{scene}_SH{shot}_{version}" 
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Enforce Naming Rules</Label>
                    <p className="text-sm text-muted-foreground">Reject uploads that don't follow naming conventions</p>
                  </div>
                  <Switch defaultChecked disabled={!canEdit} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {canEdit && (
          <div className="flex justify-end">
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        )}
    </div>
  );
};

export default ToolConfiguration;

