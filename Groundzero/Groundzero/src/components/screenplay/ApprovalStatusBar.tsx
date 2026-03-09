 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { 
   CheckCircle, XCircle, Clock, Lock, Send,
   AlertCircle, FileCheck, Unlock, Shield
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
interface ApprovalStatusBarProps {
  status: 'draft' | 'pending_review' | 'approved' | 'locked_for_production';
  isLocked: boolean;
  approvedBy?: string;
  approvedAt?: string;
  submittedBy?: string;
  submittedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  scenesApproved: number;
  totalScenes: number;
  onSubmitForReview?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  canApprove?: boolean;
  canLock?: boolean;
  isReadOnly?: boolean;
}
 
 export function ApprovalStatusBar({
   status,
   isLocked,
  approvedBy,
  approvedAt,
  submittedBy,
  submittedAt,
  lockedBy,
  lockedAt,
  scenesApproved,
   totalScenes,
   onSubmitForReview,
   onApprove,
   onReject,
   onLock,
   onUnlock,
   canApprove = false,
   canLock = false,
   isReadOnly = false,
 }: ApprovalStatusBarProps) {
   const approvalProgress = totalScenes > 0 ? (scenesApproved / totalScenes) * 100 : 0;
 
   const getStatusDisplay = () => {
     switch (status) {
       case 'draft':
         return {
           icon: <Clock className="h-4 w-4" />,
           text: 'Draft',
           color: 'bg-muted text-muted-foreground',
           description: 'Script is being edited',
         };
        case 'pending_review':
          return {
            icon: <AlertCircle className="h-4 w-4" />,
            text: 'Pending Review',
            color: 'bg-blue-500/10 text-blue-500',
            description: submittedBy ? `Submitted by ${submittedBy}` : 'Awaiting director approval',
          };
       case 'approved':
         return {
           icon: <CheckCircle className="h-4 w-4" />,
           text: 'Approved',
           color: 'bg-green-500/10 text-green-500',
           description: approvedBy ? `Approved by ${approvedBy}` : 'Script approved',
         };
       case 'locked_for_production':
         return {
           icon: <Shield className="h-4 w-4" />,
           text: 'Production Locked',
           color: 'bg-amber-500/10 text-amber-500',
           description: lockedBy ? `Locked by ${lockedBy}` : 'Ready for production',
         };
     }
   };
 
   const statusDisplay = getStatusDisplay();
 
   return (
     <div className="border-b bg-background px-4 py-2">
       <div className="flex items-center justify-between gap-4">
         {/* Status Badge */}
         <div className="flex items-center gap-3">
           <div className={cn(
             'flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm',
             statusDisplay.color
           )}>
             {statusDisplay.icon}
             <span>{statusDisplay.text}</span>
           </div>
           <span className="text-xs text-muted-foreground hidden md:inline">
             {statusDisplay.description}
           </span>
         </div>
 
         {/* Scene Approval Progress */}
         <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs">
           <div className="flex-1">
             <div className="flex items-center justify-between text-xs mb-1">
               <span className="text-muted-foreground">Scenes Approved</span>
               <span className="font-medium">{scenesApproved}/{totalScenes}</span>
             </div>
             <Progress value={approvalProgress} className="h-1.5" />
           </div>
         </div>
 
         {/* Lock Status */}
         {isLocked && (
           <div className="flex items-center gap-1 text-amber-500">
             <Lock className="h-4 w-4" />
             <span className="text-xs font-medium hidden sm:inline">Locked</span>
           </div>
         )}
 
         {/* Actions */}
         {!isReadOnly && (
           <div className="flex items-center gap-2">
             {/* Script Supervisor actions */}
             {status === 'draft' && onSubmitForReview && (
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={onSubmitForReview}
                 disabled={isLocked}
               >
                 <Send className="h-3 w-3 mr-1" />
                 Submit for Review
               </Button>
             )}
 
             {/* Director actions */}
             {status === 'pending_review' && canApprove && (
               <>
                 <Button 
                   variant="outline" 
                   size="sm"
                   onClick={onReject}
                   className="text-red-500 hover:text-red-600"
                 >
                   <XCircle className="h-3 w-3 mr-1" />
                   Request Changes
                 </Button>
                 <Button 
                   variant="default" 
                   size="sm"
                   onClick={onApprove}
                   className="bg-green-500 hover:bg-green-600"
                 >
                   <CheckCircle className="h-3 w-3 mr-1" />
                   Approve
                 </Button>
               </>
             )}
 
             {/* Lock actions */}
             {status === 'approved' && canLock && !isLocked && (
               <Button 
                 variant="default" 
                 size="sm"
                 onClick={onLock}
               >
                 <Lock className="h-3 w-3 mr-1" />
                 Lock for Production
               </Button>
             )}
 
             {isLocked && canLock && onUnlock && (
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={onUnlock}
               >
                 <Unlock className="h-3 w-3 mr-1" />
                 Unlock
               </Button>
             )}
           </div>
         )}
       </div>
     </div>
   );
 }