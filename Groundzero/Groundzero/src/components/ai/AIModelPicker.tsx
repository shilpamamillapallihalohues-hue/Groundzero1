import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Brain, Zap, DollarSign, ChevronDown, Sparkles, Image } from 'lucide-react';
import { useAIOrchestration } from '@/hooks/useAIOrchestration';
import { TaskContext } from '@/types/aiOrchestration';

interface AIModelPickerProps {
  projectId: string;
  taskKey: string;
  onModelChange?: (modelId: string) => void;
}

const getCostIndicator = (tier: string) => {
  const count = { low: 1, medium: 2, high: 3, premium: 4 }[tier] || 2;
  const color = { low: 'text-green-500', medium: 'text-yellow-500', high: 'text-orange-500', premium: 'text-red-500' }[tier] || 'text-yellow-500';
  return (
    <span className={`flex ${color}`}>
      {Array(count).fill(0).map((_, i) => <DollarSign key={i} className="h-3 w-3" />)}
    </span>
  );
};

const getSpeedIndicator = (tier: string) => {
  const color = { fast: 'text-green-500', medium: 'text-yellow-500', slow: 'text-red-500' }[tier] || 'text-yellow-500';
  return <Zap className={`h-3 w-3 ${color}`} />;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'image': return <Image className="h-3 w-3" />;
    case 'multimodal': return <Sparkles className="h-3 w-3" />;
    default: return <Brain className="h-3 w-3" />;
  }
};

export function AIModelPicker({ projectId, taskKey, onModelChange }: AIModelPickerProps) {
  const { 
    models, 
    projectSettings, 
    autoSelectModel, 
    getModelsForTask,
    updateProjectSettings 
  } = useAIOrchestration(projectId);
  
  const [autoMode, setAutoMode] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const taskModels = getModelsForTask(taskKey);
  
  // Auto-select on mount
  useEffect(() => {
    if (autoMode && models.length > 0) {
      const context: TaskContext = { task_key: taskKey };
      const result = autoSelectModel(context);
      setSelectedModelId(result.selected_model.model_id);
      onModelChange?.(result.selected_model.model_id);
    }
  }, [autoMode, models, taskKey]);

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    onModelChange?.(modelId);
  };

  const handleAutoModeChange = (enabled: boolean) => {
    setAutoMode(enabled);
    if (enabled) {
      const context: TaskContext = { task_key: taskKey };
      const result = autoSelectModel(context);
      setSelectedModelId(result.selected_model.model_id);
      onModelChange?.(result.selected_model.model_id);
    }
  };

  const selectedModel = models.find(m => m.model_id === selectedModelId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 gap-1.5 text-xs"
        >
          {selectedModel ? (
            <>
              {getTypeIcon(selectedModel.model_type)}
              <span className="max-w-[100px] truncate">{selectedModel.display_name}</span>
              {autoMode && <Badge variant="secondary" className="h-4 text-[10px] px-1">Auto</Badge>}
            </>
          ) : (
            <>
              <Brain className="h-3 w-3" />
              <span>AI Model</span>
            </>
          )}
          <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Auto Mode</Label>
            <Switch
              checked={autoMode}
              onCheckedChange={handleAutoModeChange}
              className="scale-75"
            />
          </div>
          
          {!autoMode && (
            <Select value={selectedModelId} onValueChange={handleModelChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {taskModels.map(model => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(model.model_type)}
                        <span className="text-xs">{model.display_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getCostIndicator(model.cost_tier)}
                        {getSpeedIndicator(model.speed_tier)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedModel && (
            <div className="pt-2 border-t border-border space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Provider</span>
                <Badge variant="outline" className="text-[10px]">{selectedModel.provider}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cost</span>
                {getCostIndicator(selectedModel.cost_tier)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Speed</span>
                <div className="flex items-center gap-1">
                  {getSpeedIndicator(selectedModel.speed_tier)}
                  <span className="capitalize text-[10px]">{selectedModel.speed_tier}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
