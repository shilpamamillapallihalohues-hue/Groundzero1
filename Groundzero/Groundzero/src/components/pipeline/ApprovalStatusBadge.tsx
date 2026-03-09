import React from 'react';
import { CheckCircle2, Clock, XCircle, RotateCcw, Send, UserCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ApprovalStatusBadgeProps {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'revision_requested';
  compact?: boolean;
}

export function ApprovalStatusBadge({ status, compact = false }: ApprovalStatusBadgeProps) {
  const config = {
    none: { label: 'Not Submitted', icon: Clock, color: 'bg-muted text-muted-foreground' },
    pending: { label: 'Pending Review', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/50' },
    approved: { label: 'Approved', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 border-green-500/50' },
    rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-500/10 text-red-600 border-red-500/50' },
    revision_requested: { label: 'Revision Needed', icon: RotateCcw, color: 'bg-orange-500/10 text-orange-600 border-orange-500/50' },
  };

  const { label, icon: Icon, color } = config[status];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge className={cn('border gap-1', color)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

interface ApprovalActionsProps {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'revision_requested';
  isAdmin: boolean;
  onSubmitForReview?: () => Promise<{ success: boolean; error?: string }>;
  onApprove?: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  onReject?: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  onRequestRevision?: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  variant?: 'default' | 'compact';
}

export function ApprovalActions({
  status,
  isAdmin,
  onSubmitForReview,
  onApprove,
  onReject,
  onRequestRevision,
  variant = 'default',
}: ApprovalActionsProps) {
  const [notes, setNotes] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleAction = async (
    action: (notes?: string) => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => {
    setIsProcessing(true);
    try {
      const result = await action(notes);
      if (result.success) {
        toast.success(successMessage);
        setNotes('');
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {(status === 'none' || status === 'rejected' || status === 'revision_requested') && onSubmitForReview && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleAction(onSubmitForReview, 'Submitted for review')}
                  disabled={isProcessing}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Submit for Review</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {status === 'pending' && isAdmin && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => onApprove && handleAction(onApprove, 'Approved')}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Approve</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onReject && handleAction(onReject, 'Rejected')}
                    disabled={isProcessing}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reject</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {(status === 'none' || status === 'rejected' || status === 'revision_requested') && onSubmitForReview && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction(onSubmitForReview, 'Submitted for review')}
          disabled={isProcessing}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Submit for Review
        </Button>
      )}

      {status === 'pending' && isAdmin && (
        <>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve</DialogTitle>
                <DialogDescription>Add optional notes for this approval.</DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={() => onApprove && handleAction(onApprove, 'Approved')}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 text-orange-600 hover:text-orange-700">
                <RotateCcw className="w-4 h-4" />
                Revision
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Revision</DialogTitle>
                <DialogDescription>Describe what changes are needed.</DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Required changes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
              <DialogFooter>
                <Button
                  onClick={() => onRequestRevision && handleAction(onRequestRevision, 'Revision requested')}
                  disabled={isProcessing || !notes.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Request Revision
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive" className="gap-2">
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject</DialogTitle>
                <DialogDescription>Provide a reason for rejection.</DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Reason for rejection..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
              <DialogFooter>
                <Button
                  onClick={() => onReject && handleAction(onReject, 'Rejected')}
                  disabled={isProcessing || !notes.trim()}
                  variant="destructive"
                >
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {status === 'approved' && (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/50 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </Badge>
      )}
    </div>
  );
}
