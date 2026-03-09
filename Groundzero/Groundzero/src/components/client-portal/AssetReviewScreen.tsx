import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientReview } from '@/hooks/useClientReview';
import { useAuth } from '@/hooks/useAuth';
import { 
  Box,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeftRight,
  Layers,
  Pen
} from 'lucide-react';
import { toast } from 'sonner';

interface AssetReviewScreenProps {
  projectId: string;
  assetId?: string;
}

export function AssetReviewScreen({ projectId, assetId }: AssetReviewScreenProps) {
  const { profile } = useAuth();
  const { versions, submitApproval, isSubmitting, isLoading } = useClientReview(projectId);
  
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionIndex, setCompareVersionIndex] = useState(1);
  const [notes, setNotes] = useState('');
  const [annotationMode, setAnnotationMode] = useState(false);

  const assetVersions = assetId 
    ? versions?.filter(v => v.asset_id === assetId) 
    : versions;
  
  const currentVersion = assetVersions?.[selectedVersionIndex];
  const compareVersion = assetVersions?.[compareVersionIndex];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleApproval = (decision: 'approved' | 'changes_required' | 'rejected') => {
    if (!currentVersion || !profile) return;
    
    submitApproval({
      project_id: projectId,
      scene_id: currentVersion.scene_id,
      shot_id: null,
      asset_id: currentVersion.asset_id,
      version_id: currentVersion.id,
      client_id: profile.id,
      decision,
      notes: notes || null,
    });
    
    toast.success(`Asset ${decision === 'approved' ? 'approved' : 'sent for revision'}`);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Box className="h-5 w-5" />
                Asset Review
              </h2>
              
              {currentVersion && (
                <Badge variant="outline">
                  Version {currentVersion.version_number}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Compare
              </Button>
              <Button
                variant={annotationMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnnotationMode(!annotationMode)}
              >
                <Pen className="h-4 w-4 mr-2" />
                Annotate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Preview */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-0">
              {compareMode ? (
                <div className="grid grid-cols-2 divide-x">
                  {/* Before */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Before (v{compareVersion?.version_number})</span>
                    </div>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {compareVersion?.thumbnail_url ? (
                        <img 
                          src={compareVersion.thumbnail_url} 
                          alt="Previous version"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* After */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">After (v{currentVersion?.version_number})</span>
                      <Badge className="bg-emerald-500">Current</Badge>
                    </div>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {currentVersion?.thumbnail_url ? (
                        <img 
                          src={currentVersion.thumbnail_url} 
                          alt="Current version"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div 
                    className="aspect-video bg-black rounded-lg overflow-hidden relative"
                    style={{ cursor: annotationMode ? 'crosshair' : 'default' }}
                  >
                    {currentVersion?.thumbnail_url ? (
                      <img 
                        src={currentVersion.thumbnail_url} 
                        alt="Asset preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        <Box className="h-16 w-16" />
                      </div>
                    )}
                    
                    {annotationMode && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <p className="text-primary font-medium">
                          Click to add annotation
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes & Approval */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Textarea
                placeholder="Add notes for the team..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleApproval('approved')}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Asset
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                  onClick={() => handleApproval('changes_required')}
                  disabled={isSubmitting}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button 
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => handleApproval('rejected')}
                  disabled={isSubmitting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Version History */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Versions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assetVersions?.map((version, idx) => (
                  <button
                    key={version.id}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      idx === selectedVersionIndex 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedVersionIndex(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{version.version_number}</span>
                      {version.is_approved && (
                        <Badge className="bg-emerald-500">Approved</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(version as any).profiles?.full_name || 'Unknown'}
                    </p>
                    {version.upload_notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {version.upload_notes}
                      </p>
                    )}
                  </button>
                ))}
                
                {(!assetVersions || assetVersions.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No versions available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
