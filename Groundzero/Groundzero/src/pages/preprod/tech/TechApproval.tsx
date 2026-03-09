import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';

export default function TechApproval() {
  const checklist = [
    { id: 1, label: 'Pipeline type defined', completed: false },
    { id: 2, label: 'Software stack confirmed', completed: false },
    { id: 3, label: 'VFX requirements documented', completed: false },
    { id: 4, label: 'Mocap needs identified', completed: false },
    { id: 5, label: 'Render estimates approved', completed: false },
    { id: 6, label: 'Resource allocation confirmed', completed: false }
  ];

  const allCompleted = checklist.every(item => item.completed);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Final Pre-Production Approval</h1>
        <p className="text-muted-foreground">Lock technical planning to unlock Production</p>
      </div>

      <PreProdStageGate 
        stage="technical_planning"
        projectId=""
        title="Technical Planning"
        description="Final gate before production"
      />

      <Card>
        <CardHeader>
          <CardTitle>Approval Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                  <span>{item.label}</span>
                </div>
                <Badge variant={item.completed ? 'default' : 'secondary'}>
                  {item.completed ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Lock Pre-Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Important</p>
                  <p className="text-sm text-muted-foreground">
                    Locking pre-production will freeze all scripts, concepts, storyboards, 
                    and technical specifications. This action requires both Producer and 
                    Director approval.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button disabled={!allCompleted} className="flex-1">
                <Lock className="h-4 w-4 mr-2" />
                Request Lock (Producer)
              </Button>
              <Button disabled={!allCompleted} className="flex-1">
                <Lock className="h-4 w-4 mr-2" />
                Request Lock (Director)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
