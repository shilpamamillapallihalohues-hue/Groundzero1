import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Clock, User, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { ApprovalGate, ApprovalType } from '@/hooks/usePipelineState';

interface ApprovalGatePanelProps {
  approvals: ApprovalGate[];
  onApprove: (id: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  onReject: (id: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  onRequestRevision: (id: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  canApprove: boolean;
}

const APPROVAL_TYPE_LABELS: Record<ApprovalType, { label: string; description: string }> = {
  script_draft: { label: 'Script Draft', description: 'Initial script draft approval' },
  script_final: { label: 'Final Script', description: 'Final script approval before lock' },
  script_lock: { label: 'Script Lock', description: 'Lock script - no further changes' },
  concept_internal: { label: 'Concept Art (Internal)', description: 'HOD review of concept art' },
  concept_director: { label: 'Concept Art (Director)', description: 'Director approval of concept art' },
  storyboard_internal: { label: 'Storyboard (Internal)', description: 'Lead review of storyboards' },
  storyboard_director: { label: 'Storyboard (Director)', description: 'Director approval of storyboards' },
  animatic_internal: { label: 'Animatic (Internal)', description: 'Lead review of animatic' },
  animatic_director: { label: 'Animatic (Director)', description: 'Director approval of animatic' },
  technical_plan: { label: 'Technical Plan', description: 'Technical feasibility approval' },
  production_asset: { label: 'Production Asset', description: 'Asset completion approval' },
  post_review: { label: 'Post Review', description: 'Post-production review' },
  client_final: { label: 'Client Final', description: 'Final client approval' },
};

export function ApprovalGatePanel({
  approvals,
  onApprove,
  onReject,
  onRequestRevision,
  canApprove,
}: ApprovalGatePanelProps) {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalGate | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revision' | null>(null);

  const handleAction = async () => {
    if (!selectedApproval || !actionType) return;

    setIsProcessing(true);
    try {
      let result;
      switch (actionType) {
        case 'approve':
          result = await onApprove(selectedApproval.id, notes);
          break;
        case 'reject':
          result = await onReject(selectedApproval.id, notes);
          break;
        case 'revision':
          result = await onRequestRevision(selectedApproval.id, notes);
          break;
      }

      if (result.success) {
        toast.success(`Approval ${actionType === 'approve' ? 'granted' : actionType === 'reject' ? 'rejected' : 'revision requested'}`);
        setSelectedApproval(null);
        setNotes('');
        setActionType(null);
      } else {
        toast.error(result.error || 'Failed to process approval');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Approvals
          </CardTitle>
          <CardDescription>No pending approvals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All approval gates are clear. Ready to proceed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Pending Approvals
          <Badge variant="secondary">{approvals.length}</Badge>
        </CardTitle>
        <CardDescription>Review and approve items to unlock next stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvals.map((approval) => {
            const typeInfo = APPROVAL_TYPE_LABELS[approval.approval_type];
            return (
              <div
                key={approval.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-yellow-500/10">
                    <FileText className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{typeInfo?.label || approval.approval_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeInfo?.description || 'Approval required'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Requested {formatDistanceToNow(new Date(approval.requested_at), { addSuffix: true })}</span>
                      {approval.revision_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Rev {approval.revision_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {canApprove ? (
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setActionType('approve');
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve {typeInfo?.label}</DialogTitle>
                          <DialogDescription>
                            Add optional notes for this approval.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          placeholder="Add notes (optional)..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAction}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Approval'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setActionType('revision');
                          }}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Revision</DialogTitle>
                          <DialogDescription>
                            Specify what changes are needed.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          placeholder="Describe required changes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          required
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAction}
                            disabled={isProcessing || !notes.trim()}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            {isProcessing ? 'Processing...' : 'Request Revision'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedApproval(approval);
                            setActionType('reject');
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject {typeInfo?.label}</DialogTitle>
                          <DialogDescription>
                            Provide a reason for rejection.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          placeholder="Reason for rejection..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          required
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAction}
                            disabled={isProcessing || !notes.trim()}
                            variant="destructive"
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <User className="w-3 h-3 mr-1" />
                    Awaiting Review
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
