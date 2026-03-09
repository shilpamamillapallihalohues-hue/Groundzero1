import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Download, GitCompare, Clock, Check } from 'lucide-react';


interface ScriptVersion {
  id: string;
  version: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'draft' | 'review' | 'approved';
  changes: string;
}

export default function ScriptVersions() {
  const [versions] = useState<ScriptVersion[]>([
    {
      id: '1',
      version: 'v3.0',
      filename: 'Project_Phoenix_Script_v3.pdf',
      uploadedAt: '2 hours ago',
      uploadedBy: 'Script Editor',
      status: 'review',
      changes: 'Added scene 12-15, revised character arc for Maya',
    },
    {
      id: '2',
      version: 'v2.0',
      filename: 'Project_Phoenix_Script_v2.pdf',
      uploadedAt: '3 days ago',
      uploadedBy: 'Script Writer',
      status: 'approved',
      changes: 'Complete second draft with feedback incorporated',
    },
    {
      id: '3',
      version: 'v1.0',
      filename: 'Project_Phoenix_Script_v1.pdf',
      uploadedAt: '2 weeks ago',
      uploadedBy: 'Script Writer',
      status: 'approved',
      changes: 'Initial draft submission',
    },
  ]);

  const getStatusBadge = (status: ScriptVersion['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'review':
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">In Review</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Script Upload & Versions</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage script versions
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Drop script file here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supports PDF, DOC, DOCX, FDX (Final Draft)
              </p>
              <Input type="file" className="hidden" id="script-upload" accept=".pdf,.doc,.docx,.fdx" />
              <Button asChild>
                <label htmlFor="script-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Browse Files
                </label>
              </Button>
            </div>
            
          </CardContent>
        </Card>

        {/* Version History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div 
                  key={version.id}
                  className={`p-4 rounded-lg border ${index === 0 ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{version.version}</span>
                          {index === 0 && <Badge variant="outline">Current</Badge>}
                          {getStatusBadge(version.status)}
                        </div>
                        <p className="text-sm font-medium">{version.filename}</p>
                        <p className="text-sm text-muted-foreground mt-1">{version.changes}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {version.uploadedAt}
                          </span>
                          <span>by {version.uploadedBy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      {index > 0 && (
                        <Button variant="outline" size="sm">
                          <GitCompare className="h-4 w-4 mr-1" />
                          Compare
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
