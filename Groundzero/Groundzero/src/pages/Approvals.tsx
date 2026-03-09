import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Eye,
  Package,
  Video,
  RotateCcw
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  name: string;
  type: 'asset' | 'shot';
  department: string;
  artist: string;
  version: string;
  submittedAt: string;
  thumbnail?: string;
}

const mockApprovals: ApprovalItem[] = [
  { id: '1', name: 'Hero Character', type: 'asset', department: '3D Modelling', artist: 'John Artist', version: 'v4', submittedAt: '2 hours ago' },
  { id: '2', name: 'SC01_SH010', type: 'shot', department: 'Animation', artist: 'Sarah Animator', version: 'v2', submittedAt: '5 hours ago' },
  { id: '3', name: 'Alien Creature', type: 'asset', department: 'Texturing', artist: 'Mike Texture', version: 'v3', submittedAt: '1 day ago' },
  { id: '4', name: 'Command Center', type: 'asset', department: 'Lighting', artist: 'Lisa Lighter', version: 'v2', submittedAt: '1 day ago' },
];

const Approvals = () => {
  const { role, canApprove } = useProductionRole();
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [feedback, setFeedback] = useState('');

  // Access: Director (full), Producer (view-only)
  const isDirector = role === 'director' || role === 'super_user';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Approvals</h1>
            <p className="text-muted-foreground">Review and approve assets before pipeline progression</p>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            {mockApprovals.length} Pending
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval Queue */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Approval Queue</CardTitle>
                <CardDescription>Assets and shots awaiting Director approval</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All ({mockApprovals.length})</TabsTrigger>
                    <TabsTrigger value="assets">Assets</TabsTrigger>
                    <TabsTrigger value="shots">Shots</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4 space-y-3">
                    {mockApprovals.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.id === item.id ? 'bg-primary/10 border border-primary' : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                            {item.type === 'asset' ? (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <Video className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              <Badge variant="outline">{item.version}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.department} • {item.artist}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.submittedAt}</span>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="assets" className="mt-4 space-y-3">
                    {mockApprovals.filter(i => i.type === 'asset').map((item) => (
                      <div key={item.id} className="p-4 bg-muted/30 rounded-lg">
                        <span className="font-medium">{item.name}</span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="shots" className="mt-4 space-y-3">
                    {mockApprovals.filter(i => i.type === 'shot').map((item) => (
                      <div key={item.id} className="p-4 bg-muted/30 rounded-lg">
                        <span className="font-medium">{item.name}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Review Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Review Panel</CardTitle>
                <CardDescription>
                  {selectedItem ? `Reviewing: ${selectedItem.name}` : 'Select an item to review'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Preview */}
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">Preview</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize">{selectedItem.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department:</span>
                        <span>{selectedItem.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Artist:</span>
                        <span>{selectedItem.artist}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version:</span>
                        <span>{selectedItem.version}</span>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Feedback</label>
                      <Textarea
                        placeholder="Add your feedback or notes..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Actions */}
                    {isDirector ? (
                      <div className="flex gap-2">
                        <Button variant="destructive" className="flex-1">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Rework
                        </Button>
                        <Button className="flex-1">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                        View only - Director approval required
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an item from the queue to review</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Approvals;
