import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GitBranch,
  Box,
  Layers,
  Type,
  Sparkles,
  Wand2,
  ImageIcon,
  Sliders,
  Film,
  Zap,
  Focus,
  Grid3X3,
  Palette,
  ArrowRight
} from 'lucide-react';
import { ParsedWorkflow } from './WorkflowParser';

interface WorkflowNodeGraphProps {
  workflow: ParsedWorkflow;
}

interface NodeInfo {
  id: string;
  type: string;
  title: string;
  category: string;
  inputs: string[];
  outputs: string[];
  position?: { x: number; y: number };
}

interface Connection {
  from: string;
  to: string;
  fromOutput: string;
  toInput: string;
}

const NODE_ICONS: Record<string, any> = {
  'sampler': Sparkles,
  'encoder': Type,
  'latent': Box,
  'image': ImageIcon,
  'model': Layers,
  'vae': Wand2,
  'controlnet': Sliders,
  'video': Film,
  'flux': Zap,
  'mask': Focus,
  'composite': Grid3X3,
  'style': Palette,
  'default': Box,
};

const CATEGORY_COLORS: Record<string, string> = {
  'sampler': 'bg-purple-500/20 border-purple-500/50 text-purple-700',
  'encoder': 'bg-blue-500/20 border-blue-500/50 text-blue-700',
  'latent': 'bg-cyan-500/20 border-cyan-500/50 text-cyan-700',
  'image': 'bg-green-500/20 border-green-500/50 text-green-700',
  'model': 'bg-orange-500/20 border-orange-500/50 text-orange-700',
  'vae': 'bg-pink-500/20 border-pink-500/50 text-pink-700',
  'controlnet': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700',
  'video': 'bg-red-500/20 border-red-500/50 text-red-700',
  'flux': 'bg-indigo-500/20 border-indigo-500/50 text-indigo-700',
  'mask': 'bg-teal-500/20 border-teal-500/50 text-teal-700',
  'default': 'bg-muted border-border text-muted-foreground',
};

function categorizeNode(nodeType: string): string {
  const type = nodeType.toLowerCase();
  if (type.includes('sampler') || type.includes('ksampler')) return 'sampler';
  if (type.includes('clip') || type.includes('encode')) return 'encoder';
  if (type.includes('latent') || type.includes('empty')) return 'latent';
  if (type.includes('image') || type.includes('load') || type.includes('save') || type.includes('preview')) return 'image';
  if (type.includes('checkpoint') || type.includes('unet') || type.includes('lora') || type.includes('loader')) return 'model';
  if (type.includes('vae')) return 'vae';
  if (type.includes('control')) return 'controlnet';
  if (type.includes('video') || type.includes('animate')) return 'video';
  if (type.includes('flux') || type.includes('guidance')) return 'flux';
  if (type.includes('mask')) return 'mask';
  return 'default';
}

export function WorkflowNodeGraph({ workflow }: WorkflowNodeGraphProps) {
  const { nodes, connections, stats } = useMemo(() => {
    const rawWorkflow = workflow.rawWorkflow;
    const nodeMap = new Map<string, NodeInfo>();
    const connections: Connection[] = [];
    
    // Parse nodes
    Object.entries(rawWorkflow).forEach(([nodeId, nodeData]: [string, any]) => {
      const nodeType = nodeData.class_type || 'Unknown';
      const category = categorizeNode(nodeType);
      
      const node: NodeInfo = {
        id: nodeId,
        type: nodeType,
        title: nodeData._meta?.title || nodeType,
        category,
        inputs: [],
        outputs: [],
      };
      
      // Parse inputs and find connections
      if (nodeData.inputs) {
        Object.entries(nodeData.inputs).forEach(([inputName, inputValue]: [string, any]) => {
          if (Array.isArray(inputValue) && inputValue.length === 2 && typeof inputValue[0] === 'string') {
            // This is a connection from another node
            connections.push({
              from: inputValue[0],
              to: nodeId,
              fromOutput: String(inputValue[1]),
              toInput: inputName,
            });
            node.inputs.push(inputName);
          }
        });
      }
      
      nodeMap.set(nodeId, node);
    });
    
    // Calculate stats
    const categories = new Map<string, number>();
    nodeMap.forEach(node => {
      categories.set(node.category, (categories.get(node.category) || 0) + 1);
    });
    
    return {
      nodes: Array.from(nodeMap.values()),
      connections,
      stats: {
        totalNodes: nodeMap.size,
        totalConnections: connections.length,
        categories: Array.from(categories.entries()),
      },
    };
  }, [workflow]);

  // Group nodes by category for visualization
  const groupedNodes = useMemo(() => {
    const groups = new Map<string, NodeInfo[]>();
    nodes.forEach(node => {
      const existing = groups.get(node.category) || [];
      existing.push(node);
      groups.set(node.category, existing);
    });
    return groups;
  }, [nodes]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Node Graph Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.totalNodes} Nodes</Badge>
            <Badge variant="outline">{stats.totalConnections} Connections</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          {stats.categories.map(([category, count]) => {
            const IconComponent = NODE_ICONS[category] || NODE_ICONS.default;
            return (
              <Badge 
                key={category} 
                variant="secondary" 
                className={`${CATEGORY_COLORS[category]} gap-1`}
              >
                <IconComponent className="h-3 w-3" />
                {category}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Visual Node Graph */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 p-2">
            {Array.from(groupedNodes.entries()).map(([category, categoryNodes]) => {
              const IconComponent = NODE_ICONS[category] || NODE_ICONS.default;
              const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <IconComponent className="h-4 w-4" />
                    <span className="capitalize">{category}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {categoryNodes.map((node) => {
                      // Find connections for this node
                      const incomingConnections = connections.filter(c => c.to === node.id);
                      const outgoingConnections = connections.filter(c => c.from === node.id);
                      
                      return (
                        <div
                          key={node.id}
                          className={`group relative px-3 py-2 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default ${colorClass}`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Incoming indicator */}
                            {incomingConnections.length > 0 && (
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-current flex items-center justify-center text-[10px] font-bold">
                                {incomingConnections.length}
                              </div>
                            )}
                            
                            <span className="text-xs font-mono text-muted-foreground">#{node.id}</span>
                            <span className="text-sm font-medium">{node.title}</span>
                            
                            {/* Outgoing indicator */}
                            {outgoingConnections.length > 0 && (
                              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-current flex items-center justify-center text-[10px] font-bold">
                                {outgoingConnections.length}
                              </div>
                            )}
                          </div>
                          
                          {/* Tooltip on hover */}
                          <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <p className="font-medium">{node.type}</p>
                            {incomingConnections.length > 0 && (
                              <p className="text-muted-foreground">
                                Inputs: {incomingConnections.map(c => c.toInput).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Flow Preview */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium text-muted-foreground mb-3">Execution Flow</p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Show simplified flow */}
            {['model', 'encoder', 'latent', 'sampler', 'vae', 'image'].map((category, idx, arr) => {
              const count = stats.categories.find(([c]) => c === category)?.[1] || 0;
              if (count === 0) return null;
              
              const IconComponent = NODE_ICONS[category] || NODE_ICONS.default;
              const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
              
              return (
                <div key={category} className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded-md border ${colorClass} flex items-center gap-1`}>
                    <IconComponent className="h-3 w-3" />
                    <span className="text-xs capitalize">{category}</span>
                    <Badge variant="outline" className="h-4 text-[10px]">{count}</Badge>
                  </div>
                  {idx < arr.length - 1 && count > 0 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
