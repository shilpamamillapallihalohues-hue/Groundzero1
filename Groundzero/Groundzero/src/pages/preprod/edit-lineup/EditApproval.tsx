import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Lock, Eye } from 'lucide-react';

export default function EditApproval() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-green-500" />Edit Approval</h1></div>
        <Alert><Eye className="h-4 w-4" /><AlertDescription><strong>Director Access:</strong> Review the shot sequence and approve when ready.</AlertDescription></Alert>
        <Card>
          <CardHeader><CardTitle>Approval Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Pre-Approval Checklist</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Shot sequence reviewed</li>
                <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Narrative flow validated</li>
              </ul>
            </div>
            <Button className="w-full" size="lg"><Lock className="h-4 w-4 mr-2" />Approve Edit Lineup (Director Only)</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
