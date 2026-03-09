import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Clock, Server, Wand2 } from 'lucide-react';
import { useState } from 'react';

export default function RenderEstimates() {
  const [estimates, setEstimates] = useState<any[]>([]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Render Estimation</h1>
          <p className="text-muted-foreground">AI-powered render time estimates</p>
        </div>
        <Button>
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Estimates
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">0h</p>
                <p className="text-sm text-muted-foreground">Total Render Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Server className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Render Nodes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calculator className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scene-wise Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          {estimates.length > 0 ? (
            <div className="space-y-4">
              {estimates.map((est, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Scene {est.sceneNumber}</p>
                    <p className="text-sm text-muted-foreground">{est.shotCount} shots</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{est.renderTime}h</p>
                    <p className="text-sm text-muted-foreground">${est.cost}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click "Generate Estimates" to calculate render times</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
