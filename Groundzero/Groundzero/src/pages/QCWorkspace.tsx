import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  ListChecks,
  Package,
  Video,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send
} from 'lucide-react';

interface QCItem {
  id: string;
  name: string;
  type: 'asset' | 'shot';
  department: string;
  status: 'pending' | 'in_review' | 'passed' | 'failed';
}

const mockQCItems: QCItem[] = [
  { id: '1', name: 'Hero Character v4', type: 'asset', department: '3D Modelling', status: 'in_review' },
  { id: '2', name: 'SC01_SH010 v2', type: 'shot', department: 'Animation', status: 'pending' },
  { id: '3', name: 'Alien Creature v3', type: 'asset', department: 'Texturing', status: 'pending' },
  { id: '4', name: 'Command Center v2', type: 'asset', department: 'Lighting', status: 'passed' },
];

const QC_CHECKLIST = [
  { id: 'naming', label: 'Naming convention followed' },
  { id: 'scale', label: 'Correct scale/units' },
  { id: 'topology', label: 'Clean topology (no ngons)' },
  { id: 'uvs', label: 'UVs properly laid out' },
  { id: 'materials', label: 'Materials assigned correctly' },
  { id: 'pivot', label: 'Pivot point at origin' },
  { id: 'history', label: 'History deleted' },
  { id: 'freeze', label: 'Transforms frozen' },
];

const QCWorkspace = () => {
  const [selectedItem, setSelectedItem] = useState<QCItem | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [id]: checked }));
  };

  const allChecked = QC_CHECKLIST.every(item => checklist[item.id]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">QC Workspace</h1>
            <p className="text-muted-foreground">Quality control checks and technical validation</p>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
            <ListChecks className="w-3 h-3 mr-1" />
            QC Team
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QC Queue */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>QC Queue</CardTitle>
                <CardDescription>Assets and shots awaiting quality check</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All ({mockQCItems.length})</TabsTrigger>
                    <TabsTrigger value="assets">Assets</TabsTrigger>
                    <TabsTrigger value="shots">Shots</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4 space-y-3">
                    {mockQCItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.id === item.id ? 'bg-primary/10 border border-primary' : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setSelectedItem(item);
                          setChecklist({});
                          setNotes('');
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            {item.type === 'asset' ? (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Video className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <p className="text-sm text-muted-foreground">{item.department}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={item.status === 'passed' ? 'default' : item.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {item.status === 'passed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {item.status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="assets" className="mt-4 space-y-3">
                    {mockQCItems.filter(i => i.type === 'asset').map((item) => (
                      <div key={item.id} className="p-4 bg-muted/30 rounded-lg">
                        <span className="font-medium">{item.name}</span>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="shots" className="mt-4 space-y-3">
                    {mockQCItems.filter(i => i.type === 'shot').map((item) => (
                      <div key={item.id} className="p-4 bg-muted/30 rounded-lg">
                        <span className="font-medium">{item.name}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* QC Checklist */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  QC Checklist
                </CardTitle>
                <CardDescription>
                  {selectedItem ? selectedItem.name : 'Select an item to review'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Checklist Items */}
                    <div className="space-y-3">
                      {QC_CHECKLIST.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={item.id}
                            checked={checklist[item.id] || false}
                            onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)}
                          />
                          <label 
                            htmlFor={item.id} 
                            className="text-sm cursor-pointer"
                          >
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="text-sm text-muted-foreground">
                      {Object.values(checklist).filter(Boolean).length} / {QC_CHECKLIST.length} checks passed
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Technical Notes
                      </label>
                      <Textarea
                        placeholder="Add technical notes or issues found..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="destructive" className="flex-1">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Fail QC
                      </Button>
                      <Button className="flex-1" disabled={!allChecked}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Pass QC
                      </Button>
                    </div>

                    {!allChecked && (
                      <p className="text-xs text-muted-foreground text-center">
                        Complete all checklist items to pass QC
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an item to start QC review</p>
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

export default QCWorkspace;
