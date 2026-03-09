  import { useState } from 'react';
  import { ScrollArea } from '@/components/ui/scroll-area';
  import { Button } from '@/components/ui/button';
  import { Badge } from '@/components/ui/badge';
  import { Card, CardContent } from '@/components/ui/card';
  import { 
   History, GitCompare, Download, Upload, Lock, Unlock, Send,
   CheckCircle, Clock, FileText, ChevronDown, ChevronRight, Eye, Trash2
  } from 'lucide-react';
  import { format } from 'date-fns';
  import { cn } from '@/lib/utils';
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';

interface ScriptVersion {
   id: string;
   versionNumber: number;
   title: string;
   createdAt: string;
   createdBy?: string;
   changesSummary?: string;
   pageCount?: number;
   isLocked?: boolean;
   approvalStatus?: 'draft' | 'pending_review' | 'approved' | 'locked_for_production';
   submittedBy?: string;
   submittedAt?: string;
 }
  
  interface VersionHistoryPanelProps {
    versions: ScriptVersion[];
    currentVersionId?: string;
    onVersionSelect: (versionId: string) => void;
    onCompare?: (v1: string, v2: string) => void;
    onExport?: (versionId: string) => void;
    onImport?: () => void;
    onDelete?: (versionId: string) => void;
    isReadOnly?: boolean;
  }
  
  export function VersionHistoryPanel({
    versions,
    currentVersionId,
    onVersionSelect,
    onCompare,
    onExport,
    onImport,
    onDelete,
    isReadOnly,
  }: VersionHistoryPanelProps) {
    const [compareMode, setCompareMode] = useState(false);
    const [compareVersions, setCompareVersions] = useState<{ v1?: string; v2?: string }>({});
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
    const handleCompareToggle = (versionId: string) => {
      if (!compareVersions.v1) {
        setCompareVersions({ v1: versionId });
      } else if (!compareVersions.v2 && compareVersions.v1 !== versionId) {
        setCompareVersions({ ...compareVersions, v2: versionId });
      } else {
        setCompareVersions({ v1: versionId });
      }
    };
  
    const handleRunCompare = () => {
      if (compareVersions.v1 && compareVersions.v2 && onCompare) {
        onCompare(compareVersions.v1, compareVersions.v2);
      }
    };
  
    const getStatusBadge = (status?: string) => {
      switch (status) {
        case 'approved':
          return <Badge className="bg-green-500 text-white text-[10px]">Approved</Badge>;
        case 'locked_for_production':
          return <Badge className="bg-amber-500 text-white text-[10px]">Production</Badge>;
        case 'pending_review':
          return <Badge variant="secondary" className="text-[10px]">In Review</Badge>;
        default:
          return <Badge variant="outline" className="text-[10px]">Draft</Badge>;
      }
    };
  
    return (
      <div className="h-full flex flex-col border-l">
        {/* Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Version History
            </h3>
            <Badge variant="outline">{versions.length}</Badge>
          </div>
  
          {/* Actions */}
          <div className="flex gap-2">
            {!isReadOnly && onImport && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onImport}>
                <Upload className="h-3 w-3 mr-1" />
                Import
              </Button>
            )}
            <Button 
              variant={compareMode ? 'secondary' : 'outline'} 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersions({});
              }}
            >
              <GitCompare className="h-3 w-3 mr-1" />
              Compare
            </Button>
          </div>
  
          {/* Compare Selection */}
          {compareMode && (
            <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
              <p>Select two versions to compare:</p>
              <div className="flex items-center gap-2">
                <span className="font-mono">
                  {compareVersions.v1 ? `v${versions.find(v => v.id === compareVersions.v1)?.versionNumber}` : '---'}
                </span>
                <span>vs</span>
                <span className="font-mono">
                  {compareVersions.v2 ? `v${versions.find(v => v.id === compareVersions.v2)?.versionNumber}` : '---'}
                </span>
              </div>
              {compareVersions.v1 && compareVersions.v2 && (
                <Button size="sm" className="w-full mt-2" onClick={handleRunCompare}>
                  <GitCompare className="h-3 w-3 mr-1" />
                  View Diff
                </Button>
              )}
            </div>
          )}
        </div>
  
        {/* Version List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {versions.map((version, idx) => {
              const isCurrent = currentVersionId === version.id;
              const isCompareSelected = compareVersions.v1 === version.id || compareVersions.v2 === version.id;
  
              return (
                <Card 
                  key={version.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isCurrent && 'border-primary bg-primary/5',
                    isCompareSelected && compareMode && 'border-blue-500 bg-blue-500/5'
                  )}
                  onClick={() => compareMode ? handleCompareToggle(version.id) : onVersionSelect(version.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-bold',
                            isCurrent && 'text-primary'
                          )}>
                            v{version.versionNumber}
                          </span>
                          {idx === 0 && (
                            <Badge variant="default" className="text-[10px]">Latest</Badge>
                          )}
                          {version.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-sm font-medium mt-0.5 truncate">
                          {version.title}
                        </p>
                         {version.changesSummary && (
                           <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                             {version.changesSummary}
                           </p>
                         )}
                         {version.submittedBy && version.approvalStatus === 'pending_review' && (
                           <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                             <Send className="h-3 w-3" />
                             Submitted by {version.submittedBy}
                           </p>
                         )}
                      </div>
                      {getStatusBadge(version.approvalStatus)}
                    </div>
  
                    <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(version.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {version.pageCount && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{version.pageCount} pages</span>
                        </div>
                      )}
                    </div>
  
                    {/* Actions */}
                    {!compareMode && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVersionSelect(version.id);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {onExport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExport(version.id);
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        )}
                        {onDelete && !version.isLocked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs flex-1 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(version.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
  
            {versions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No versions yet</p>
                <p className="text-xs">Upload a script to create the first version</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Version?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The version and all its related comments will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirm && onDelete) {
                    onDelete(deleteConfirm);
                    setDeleteConfirm(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }