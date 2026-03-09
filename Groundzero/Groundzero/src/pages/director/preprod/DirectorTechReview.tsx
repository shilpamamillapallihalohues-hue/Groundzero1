import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Settings, Lock } from 'lucide-react';

export default function DirectorTechReview() {
  const techItems = [
    { name: 'Pipeline Type', value: '3D Animation', status: 'pending' },
    { name: 'Primary Software', value: 'Maya, Houdini, Nuke', status: 'pending' },
    { name: 'Render Engine', value: 'Arnold', status: 'pending' },
    { name: 'VFX Complexity', value: 'High (45 shots)', status: 'pending' },
    { name: 'Mocap Required', value: 'Yes (12 sessions)', status: 'pending' },
    { name: 'Estimated Render Time', value: '2,400 hours', status: 'pending' }
  ];

  return (
    <div className="space-y-4 p-4">

      <Card>
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {techItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.value}</p>
                </div>
                <Badge variant="secondary">{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Approve & Lock Pre-Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            As Director, your approval is required to lock pre-production and begin production.
            This action cannot be undone.
          </p>
          <Button size="lg">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Pre-Production
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
