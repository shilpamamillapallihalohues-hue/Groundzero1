import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertTriangle, CheckCircle2, Video, Shield } from 'lucide-react';

export default function ShotLock() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><Lock className="h-8 w-8 text-red-500" />Shot Lock</h1></div>
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600"><strong>Director Access Only:</strong> Locking shots is irreversible.</AlertDescription>
        </Alert>
        <Card>
          <CardHeader><CardTitle>Shot Lock Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Pre-Lock Checklist</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />All shots reviewed by Director</li>
                <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Shot order finalized</li>
              </ul>
            </div>
            <Button className="w-full" size="lg"><Shield className="h-4 w-4 mr-2" />Lock All Shots (Director Only)</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
