import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Zap, DollarSign, Brain, Sparkles, Image } from 'lucide-react';
import { AIModel, ModelSelectionResult } from '@/types/aiOrchestration';

interface AIModelSelectorProps {
  taskKey: string;
  taskName: string;
  availableModels: AIModel[];
  selectedModelId: string;
  selectionResult?: ModelSelectionResult;
  autoMode: boolean;
  onModelChange: (modelId: string) => void;
  onAutoModeChange: (enabled: boolean) => void;
  compact?: boolean;
}

const getCostIcon = (tier: string) => {
  switch (tier) {
    case 'low': return <DollarSign className="h-3 w-3 text-green-500" />;
    case 'medium': return <><DollarSign className="h-3 w-3 text-yellow-500" /><DollarSign className="h-3 w-3 text-yellow-500" /></>;
    case 'high': return <><DollarSign className="h-3 w-3 text-orange-500" /><DollarSign className="h-3 w-3 text-orange-500" /><DollarSign className="h-3 w-3 text-orange-500" /></>;
    case 'premium': return <><DollarSign className="h-3 w-3 text-red-500" /><DollarSign className="h-3 w-3 text-red-500" /><DollarSign className="h-3 w-3 text-red-500" /><DollarSign className="h-3 w-3 text-red-500" /></>;
    default: return null;
  }
};

const getSpeedIcon = (tier: string) => {
  switch (tier) {
    case 'fast': return <Zap className="h-3 w-3 text-green-500" />;
    case 'medium': return <Zap className="h-3 w-3 text-yellow-500" />;
    case 'slow': return <Zap className="h-3 w-3 text-red-500" />;
    default: return null;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'text': return <Brain className="h-4 w-4" />;
    case 'image': return <Image className="h-4 w-4" />;
    case 'multimodal': return <Sparkles className="h-4 w-4" />;
    case 'vision': return <Brain className="h-4 w-4" />;
    default: return <Brain className="h-4 w-4" />;
  }
};

export function AIModelSelector({
  taskKey,
  taskName,
  availableModels,
  selectedModelId,
  selectionResult,
  autoMode,
  onModelChange,
  onAutoModeChange,
  compact = false
}: AIModelSelectorProps) {
  const selectedModel = availableModels.find(m => m.model_id === selectedModelId);
  const hasWarnings = selectionResult?.warnings && selectionResult.warnings.length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Switch
                  id={`auto-${taskKey}`}
                  checked={autoMode}
                  onCheckedChange={onAutoModeChange}
                  className="scale-75"
                />
                <Label htmlFor={`auto-${taskKey}`} className="text-xs text-muted-foreground">
                  Auto
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Auto-select best model for this task</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {!autoMode && (
          <Select value={selectedModelId} onValueChange={onModelChange}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model.model_id} value={model.model_id}>
                  <div className="flex items-center gap-1">
                    {getTypeIcon(model.model_type)}
                    <span className="text-xs">{model.display_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {autoMode && selectedModel && (
          <Badge variant="secondary" className="text-xs">
            {selectedModel.display_name}
          </Badge>
        )}
        
        {hasWarnings && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                {selectionResult?.warnings.map((w, i) => <p key={i}>{w}</p>)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">{taskName}</h4>
          <p className="text-xs text-muted-foreground">
            {autoMode ? selectionResult?.selection_reason : 'Manual selection'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id={`auto-${taskKey}`}
            checked={autoMode}
            onCheckedChange={onAutoModeChange}
          />
          <Label htmlFor={`auto-${taskKey}`} className="text-sm">
            Auto Mode
          </Label>
        </div>
      </div>

      {!autoMode && (
        <Select value={selectedModelId} onValueChange={onModelChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map(model => (
              <SelectItem key={model.model_id} value={model.model_id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(model.model_type)}
                    <span>{model.display_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {model.provider}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">{getCostIcon(model.cost_tier)}</div>
                    {getSpeedIcon(model.speed_tier)}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedModel && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {getTypeIcon(selectedModel.model_type)}
            <span className="capitalize">{selectedModel.model_type}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Cost:</span>
            <div className="flex">{getCostIcon(selectedModel.cost_tier)}</div>
          </div>
          <div className="flex items-center gap-1">
            <span>Speed:</span>
            {getSpeedIcon(selectedModel.speed_tier)}
            <span className="capitalize">{selectedModel.speed_tier}</span>
          </div>
        </div>
      )}

      {hasWarnings && (
        <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            {selectionResult?.warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
