import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ProducerPreprodLocks() {
  const locks = [
    { stage: 'Script', locked: true, lockedBy: 'Producer', lockedAt: '2024-01-15' },
    { stage: 'Concept Arts', locked: false, lockedBy: null, lockedAt: null },
    { stage: 'Storyboards', locked: false, lockedBy: null, lockedAt: null },
    { stage: 'Edit Lineup', locked: false, lockedBy: null, lockedAt: null },
    { stage: 'Animatic', locked: false, lockedBy: null, lockedAt: null },
    { stage: 'Technical Planning', locked: false, lockedBy: null, lockedAt: null }
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Pre-Production Locks</h1>
        <p className="text-muted-foreground">Manage stage locks and transitions</p>
      </div>

      <Card className="border-orange-500">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-medium">Lock Authority</p>
              <p className="text-sm text-muted-foreground">
                As Producer, you have the authority to lock and unlock pre-production stages.
                Locked stages become immutable and serve as the canonical reference for production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stage Locks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locks.map((lock, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {lock.locked ? (
                    <Lock className="h-5 w-5 text-green-500" />
                  ) : (
                    <Unlock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{lock.stage}</p>
                    {lock.locked && (
                      <p className="text-sm text-muted-foreground">
                        Locked by {lock.lockedBy} on {lock.lockedAt}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={lock.locked ? 'default' : 'secondary'}>
                    {lock.locked ? 'Locked' : 'Unlocked'}
                  </Badge>
                  {lock.locked ? (
                    <Button variant="outline" size="sm">
                      <Unlock className="h-4 w-4 mr-1" />
                      Unlock
                    </Button>
                  ) : (
                    <Button size="sm">
                      <Lock className="h-4 w-4 mr-1" />
                      Lock
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Final Pre-Production Lock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Lock all pre-production stages and transition to Production phase.
            This requires all individual stages to be locked first.
          </p>
          <Button size="lg" disabled>
            <Lock className="h-4 w-4 mr-2" />
            Lock Pre-Production (Requires All Stages)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
