import { Badge } from "@/components/ui/badge";
import { DataConfidence } from "@/types/locationIntelligence";
import { CheckCircle2, HelpCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfidenceBadgeProps {
  confidence: DataConfidence;
  value?: string | number | boolean | null;
  label?: string;
  showIcon?: boolean;
}

export function ConfidenceBadge({ confidence, value, label, showIcon = true }: ConfidenceBadgeProps) {
  const getConfig = () => {
    switch (confidence) {
      case 'verified':
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          tooltip: 'Verified from official source'
        };
      case 'estimated':
        return {
          variant: 'secondary' as const,
          icon: AlertTriangle,
          color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          tooltip: 'AI-estimated value'
        };
      case 'unknown':
      default:
        return {
          variant: 'outline' as const,
          icon: HelpCircle,
          color: 'bg-muted text-muted-foreground',
          tooltip: 'Data not available'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const displayValue = typeof value === 'boolean' 
    ? (value ? 'Yes' : 'No') 
    : value ?? 'N/A';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${config.color} gap-1 font-normal`}>
          {showIcon && <Icon className="h-3 w-3" />}
          {label && <span className="text-xs opacity-70">{label}:</span>}
          <span>{displayValue}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
