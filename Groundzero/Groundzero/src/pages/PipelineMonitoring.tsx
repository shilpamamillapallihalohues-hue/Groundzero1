import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Brain,
  Workflow,
  Clock,
  FileWarning
} from 'lucide-react';

interface PipelineError {
  id: string;
  type: 'routing' | 'validation' | 'system';
  message: string;
  asset: string;
  timestamp: string;
  resolved: boolean;
}

interface AIWarning {
  id: string;
  type: 'continuity' | 'quality' | 'suggestion';
  message: string;
  asset: string;
  confidence: number;
  timestamp: string;
  dismissed: boolean;
}

const mockErrors: PipelineError[] = [
  { id: '1', type: 'routing', message: 'Asset stuck in routing queue', asset: 'Hero Character v4', timestamp: '10 min ago', resolved: false },
  { id: '2', type: 'validation', message: 'Missing required metadata', asset: 'Alien Creature v2', timestamp: '1 hour ago', resolved: false },
  { id: '3', type: 'system', message: 'Render farm connection timeout', asset: 'SC01_SH010', timestamp: '2 hours ago', resolved: true },
];

const mockWarnings: AIWarning[] = [
  { id: '1', type: 'continuity', message: 'Character costume differs from Scene 1', asset: 'Hero Character Scene 3', confidence: 0.85, timestamp: '30 min ago', dismissed: false },
  { id: '2', type: 'quality', message: 'Potential texture stretching detected', asset: 'Spaceship Hull', confidence: 0.72, timestamp: '1 hour ago', dismissed: false },
  { id: '3', type: 'suggestion', message: 'Similar asset found in library', asset: 'Generic Chair', confidence: 0.91, timestamp: '2 hours ago', dismissed: true },
];

const PipelineMonitoring = () => {
  const [activeTab, setActiveTab] = useState('errors');

  const unresolvedErrors = mockErrors.filter(e => !e.resolved).length;
  const activeWarnings = mockWarnings.filter(w => !w.dismissed).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pipeline Monitoring</h1>
            <p className="text-muted-foreground">Track routing errors and AI warnings</p>
          </div>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
            <Server className="w-3 h-3 mr-1" />
            Pipeline TD
          </Badge>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Status</p>
                  <p className="text-xl font-bold text-green-600">Healthy</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Errors</p>
                  <p className="text-xl font-bold text-red-600">{unresolvedErrors}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Warnings</p>
                  <p className="text-xl font-bold text-amber-600">{activeWarnings}</p>
                </div>
                <Brain className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Assets in Transit</p>
                  <p className="text-xl font-bold">24</p>
                </div>
                <Workflow className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pipeline Errors
              {unresolvedErrors > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {unresolvedErrors}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="warnings" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              AI Warnings
              {activeWarnings > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-amber-500/20 text-amber-600">
                  {activeWarnings}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Routing & System Errors
                </CardTitle>
                <CardDescription>Issues requiring Pipeline TD attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockErrors.map((error) => (
                    <div 
                      key={error.id} 
                      className={`p-4 rounded-lg ${error.resolved ? 'bg-muted/30 opacity-60' : 'bg-red-500/5 border border-red-500/20'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {error.resolved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{error.message}</p>
                            <p className="text-sm text-muted-foreground">
                              Asset: {error.asset} • Type: {error.type}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {error.timestamp}
                            </div>
                          </div>
                        </div>
                        {!error.resolved && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                            <Button size="sm">Resolve</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warnings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-500" />
                  AI-Generated Warnings
                </CardTitle>
                <CardDescription>Non-decisional suggestions and quality alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockWarnings.map((warning) => (
                    <div 
                      key={warning.id} 
                      className={`p-4 rounded-lg ${warning.dismissed ? 'bg-muted/30 opacity-60' : 'bg-amber-500/5 border border-amber-500/20'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <FileWarning className={`h-5 w-5 mt-0.5 ${warning.dismissed ? 'text-muted-foreground' : 'text-amber-500'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{warning.message}</p>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(warning.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Asset: {warning.asset} • Type: {warning.type}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {warning.timestamp}
                            </div>
                          </div>
                        </div>
                        {!warning.dismissed && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">Dismiss</Button>
                            <Button variant="outline" size="sm">Review</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Recent pipeline activity logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-2">
                  <p className="text-green-600">[14:30:12] Asset "Hero Character v4" routed to Animation</p>
                  <p className="text-muted-foreground">[14:28:45] Director approval received for SC01_SH010</p>
                  <p className="text-amber-600">[14:25:30] Warning: High render queue load (85%)</p>
                  <p className="text-muted-foreground">[14:20:15] Backup completed successfully</p>
                  <p className="text-red-600">[14:15:00] Error: Failed to connect to external storage</p>
                  <p className="text-muted-foreground">[14:10:30] Asset "Alien Creature v3" submitted for review</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PipelineMonitoring;
