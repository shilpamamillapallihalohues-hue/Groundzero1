import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Palette, Layout, Film, Settings, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProducerPreprodOverview() {
  const navigate = useNavigate();

  const stages = [
    { name: 'Script', icon: FileText, progress: 100, status: 'locked' },
    { name: 'Concept Arts', icon: Palette, progress: 75, status: 'in_progress' },
    { name: 'Storyboards', icon: Layout, progress: 60, status: 'in_progress' },
    { name: 'Edit Lineup', icon: Clock, progress: 30, status: 'in_progress' },
    { name: 'Animatic', icon: Film, progress: 0, status: 'not_started' },
    { name: 'Technical', icon: Settings, progress: 0, status: 'not_started' }
  ];

  const overallProgress = Math.round(stages.reduce((acc, s) => acc + s.progress, 0) / stages.length);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Pre-Production Overview</h1>
        <p className="text-muted-foreground">Monitor pre-production progress</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={overallProgress} className="flex-1" />
            <span className="text-2xl font-bold">{overallProgress}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {stages.map((stage) => (
          <Card key={stage.name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <stage.icon className="h-6 w-6 text-primary" />
                  <span className="font-medium">{stage.name}</span>
                </div>
                <Badge variant={stage.status === 'locked' ? 'default' : 'secondary'}>
                  {stage.status.replace('_', ' ')}
                </Badge>
              </div>
              <Progress value={stage.progress} />
              <p className="text-sm text-muted-foreground mt-2">{stage.progress}% complete</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
