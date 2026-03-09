import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border border-border bg-card p-3 lg:p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md group",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-xl lg:text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              {trend.positive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className="p-2 rounded-md bg-primary/10 shrink-0">
          <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
