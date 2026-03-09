import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Save } from 'lucide-react';
import { useState } from 'react';

export default function PipelineDefinition() {
  const [pipelineType, setPipelineType] = useState('3d');
  const [software, setSoftware] = useState<string[]>([]);

  const softwareOptions = [
    { id: 'maya', label: 'Autodesk Maya' },
    { id: 'blender', label: 'Blender' },
    { id: 'houdini', label: 'SideFX Houdini' },
    { id: 'nuke', label: 'Foundry Nuke' },
    { id: 'after-effects', label: 'Adobe After Effects' },
    { id: 'davinci', label: 'DaVinci Resolve' },
    { id: 'unreal', label: 'Unreal Engine' },
    { id: 'unity', label: 'Unity' }
  ];

  const toggleSoftware = (id: string) => {
    setSoftware(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Definition</h1>
          <p className="text-muted-foreground">Define production pipeline and software stack</p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={pipelineType} onValueChange={setPipelineType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2d">2D Animation</SelectItem>
                <SelectItem value="3d">3D Animation</SelectItem>
                <SelectItem value="hybrid">Hybrid (2D + 3D)</SelectItem>
                <SelectItem value="vfx">VFX Heavy</SelectItem>
                <SelectItem value="realtime">Real-time (Game Engine)</SelectItem>
              </SelectContent>
            </Select>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Pipeline Description</p>
              <p className="text-sm text-muted-foreground">
                {pipelineType === '3d' && 'Full 3D production pipeline with modeling, rigging, animation, lighting, and rendering stages.'}
                {pipelineType === '2d' && 'Traditional 2D animation pipeline with storyboard, layout, animation, and compositing.'}
                {pipelineType === 'hybrid' && 'Combined 2D and 3D elements for stylized or mixed-media production.'}
                {pipelineType === 'vfx' && 'Heavy VFX integration with live-action or CG plates.'}
                {pipelineType === 'realtime' && 'Real-time rendering using game engines for virtual production.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Software Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {softwareOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={software.includes(option.id)}
                    onCheckedChange={() => toggleSoftware(option.id)}
                  />
                  <label htmlFor={option.id} className="text-sm cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
