import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Brain, 
  Image, 
  Sparkles, 
  Eye,
  Zap,
  DollarSign,
  Check,
  X
} from 'lucide-react';
import { AIModel, AITaskDefinition } from '@/types/aiOrchestration';

interface AIModelRegistryProps {
  models: AIModel[];
  taskDefinitions: AITaskDefinition[];
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'text': return <Brain className="h-4 w-4" />;
    case 'image': return <Image className="h-4 w-4" />;
    case 'multimodal': return <Sparkles className="h-4 w-4" />;
    case 'vision': return <Eye className="h-4 w-4" />;
    default: return <Brain className="h-4 w-4" />;
  }
};

const getCostBadge = (tier: string) => {
  const colors: Record<string, string> = {
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    premium: 'bg-red-500/10 text-red-500 border-red-500/20'
  };
  return colors[tier] || colors.medium;
};

const getSpeedBadge = (tier: string) => {
  const colors: Record<string, string> = {
    fast: 'bg-green-500/10 text-green-500 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    slow: 'bg-red-500/10 text-red-500 border-red-500/20'
  };
  return colors[tier] || colors.medium;
};

export function AIModelRegistry({ models, taskDefinitions }: AIModelRegistryProps) {
  return (
    <div className="space-y-6">
      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map(model => (
          <Card key={model.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(model.model_type)}
                  <CardTitle className="text-base">{model.display_name}</CardTitle>
                </div>
                <Badge variant="outline">{model.provider}</Badge>
              </div>
              <CardDescription className="text-xs font-mono">
                {model.model_id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getCostBadge(model.cost_tier)}>
                  <DollarSign className="h-3 w-3 mr-1" />
                  {model.cost_tier}
                </Badge>
                <Badge variant="outline" className={getSpeedBadge(model.speed_tier)}>
                  <Zap className="h-3 w-3 mr-1" />
                  {model.speed_tier}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {model.model_type}
                </Badge>
              </div>
              
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Strengths</p>
                <div className="flex flex-wrap gap-1">
                  {model.strengths.slice(0, 3).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Limitations</p>
                <div className="flex flex-wrap gap-1">
                  {model.limitations.slice(0, 2).map((l, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-muted-foreground">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Supported Tasks</p>
                <p className="text-xs text-muted-foreground">
                  {model.supported_tasks.length} tasks
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task → Model Mapping</CardTitle>
          <CardDescription>
            Recommended and alternative models for each production task
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vision</TableHead>
                  <TableHead>Image Gen</TableHead>
                  <TableHead>Recommended</TableHead>
                  <TableHead>Alternatives</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskDefinitions.map(task => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.task_name}</p>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {task.task_category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.requires_vision ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {task.requires_image_gen ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {task.recommended_model_ids.map((id, i) => {
                          const model = models.find(m => m.model_id === id);
                          return (
                            <Badge key={i} variant="default" className="text-xs">
                              {model?.display_name || id}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {task.alternative_model_ids.map((id, i) => {
                          const model = models.find(m => m.model_id === id);
                          return (
                            <Badge key={i} variant="outline" className="text-xs">
                              {model?.display_name || id}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
