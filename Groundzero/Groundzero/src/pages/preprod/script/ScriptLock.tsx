import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Unlock, Check, AlertTriangle, FileText, Users, MapPin, Package, Shield } from 'lucide-react';
import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  required: boolean;
}

export default function ScriptLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { 
      id: '1', 
      label: 'All scenes have been reviewed', 
      description: 'Every scene has been verified by the script team',
      checked: true, 
      required: true 
    },
    { 
      id: '2', 
      label: 'Character list is complete', 
      description: 'All characters have been identified and verified',
      checked: true, 
      required: true 
    },
    { 
      id: '3', 
      label: 'Location list is finalized', 
      description: 'All locations have been documented',
      checked: true, 
      required: true 
    },
    { 
      id: '4', 
      label: 'Props have been identified', 
      description: 'Key props for each scene are listed',
      checked: false, 
      required: true 
    },
    { 
      id: '5', 
      label: 'Director has reviewed script', 
      description: 'Director approval on script content',
      checked: false, 
      required: true 
    },
    { 
      id: '6', 
      label: 'Scene numbers are finalized', 
      description: 'No more scene reordering expected',
      checked: true, 
      required: true 
    },
  ]);

  const allRequiredChecked = checklist.filter(item => item.required).every(item => item.checked);

  const handleCheckItem = (id: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleLock = () => {
    if (allRequiredChecked) {
      setIsLocked(true);
    }
  };

  const scriptSummary = {
    totalScenes: 24,
    totalCharacters: 12,
    totalLocations: 8,
    totalProps: 45,
    aiGenerated: 20,
    humanEdited: 18,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Script Lock</h1>
            <p className="text-muted-foreground mt-1">
              Final review and lock script for production
            </p>
          </div>
          <Badge 
            variant={isLocked ? 'default' : 'secondary'}
            className={isLocked ? 'bg-green-500' : ''}
          >
            {isLocked ? (
              <><Lock className="h-3 w-3 mr-1" /> Locked</>
            ) : (
              <><Unlock className="h-3 w-3 mr-1" /> Unlocked</>
            )}
          </Badge>
        </div>

        {/* Stage gate requires projectId - shown as visual indicator only */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Stage approval workflow active</p>
        </div>

        {isLocked ? (
          <Alert className="border-green-500 bg-green-500/10">
            <Lock className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Script Locked</AlertTitle>
            <AlertDescription>
              The script has been locked by the Producer. Scene IDs and counts are now frozen.
              Concept Arts department is now unlocked and can begin work.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Pre-Lock Checklist</AlertTitle>
            <AlertDescription>
              Complete all required items before the script can be locked. Only Producers can lock the script.
            </AlertDescription>
          </Alert>
        )}

        {/* Script Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{scriptSummary.totalScenes}</div>
                  <p className="text-sm text-muted-foreground">Scenes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{scriptSummary.totalCharacters}</div>
                  <p className="text-sm text-muted-foreground">Characters</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{scriptSummary.totalLocations}</div>
                  <p className="text-sm text-muted-foreground">Locations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Package className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{scriptSummary.totalProps}</div>
                  <p className="text-sm text-muted-foreground">Props</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Pre-Lock Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checklist.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    item.checked ? 'border-green-500/50 bg-green-500/5' : ''
                  } ${isLocked ? 'opacity-75' : ''}`}
                >
                  <Checkbox 
                    checked={item.checked} 
                    onCheckedChange={() => handleCheckItem(item.id)}
                    disabled={isLocked}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.label}
                      </span>
                      {item.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  {item.checked && <Check className="h-5 w-5 text-green-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lock Button */}
        {!isLocked && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Lock Script</h3>
                    <p className="text-sm text-muted-foreground">
                      This action requires Producer authorization
                    </p>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleLock}
                  disabled={!allRequiredChecked}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Script
                </Button>
              </div>
              {!allRequiredChecked && (
                <p className="text-sm text-amber-500 mt-4">
                  Complete all required checklist items before locking
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
