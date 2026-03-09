import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  User, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreProdApprovalBadgeProps {
  aiGenerated?: boolean;
  humanEdited?: boolean;
  reviewStatus?: 'draft' | 'pending' | 'approved' | 'rejected' | 'revision_requested';
  className?: string;
}

export function PreProdApprovalBadge({
  aiGenerated = false,
  humanEdited = false,
  reviewStatus = 'draft',
  className,
}: PreProdApprovalBadgeProps) {
  const getOriginBadge = () => {
    if (aiGenerated && humanEdited) {
      return (
        <Badge variant="outline" className={cn("gap-1 text-xs", className)}>
          <Sparkles className="w-3 h-3 text-primary" />
          <Edit className="w-3 h-3 text-blue-500" />
          AI + Human
        </Badge>
      );
    }
    if (aiGenerated) {
      return (
        <Badge variant="outline" className={cn("gap-1 text-xs border-primary/50 text-primary", className)}>
          <Sparkles className="w-3 h-3" />
          AI Draft
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={cn("gap-1 text-xs border-blue-500/50 text-blue-500", className)}>
        <User className="w-3 h-3" />
        Manual
      </Badge>
    );
  };

  const getStatusBadge = () => {
    switch (reviewStatus) {
      case 'approved':
        return (
          <Badge className="gap-1 text-xs bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="gap-1 text-xs bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="w-3 h-3" />
            Pending Review
          </Badge>
        );
      case 'revision_requested':
        return (
          <Badge className="gap-1 text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
            <Edit className="w-3 h-3" />
            Revision Requested
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {getOriginBadge()}
      {getStatusBadge()}
    </div>
  );
}