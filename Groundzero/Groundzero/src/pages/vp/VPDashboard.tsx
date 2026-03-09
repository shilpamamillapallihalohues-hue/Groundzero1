import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';

export default function VPDashboard() {
  return (
    <div className="space-y-6">
      <WelcomeQuote />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Video className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Virtual Production</h1>
          <p className="text-muted-foreground">Dashboard & Overview</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Virtual Production Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Virtual Production module coming soon. This will be the central hub for all VP operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
