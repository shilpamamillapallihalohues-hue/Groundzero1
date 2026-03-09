import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GitBranch, 
  Cpu, 
  Image, 
  Layers, 
  Palette, 
  Sparkles,
  Plus,
  Trash2,
  Play,
  Save,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Move,
  Link2,
  Unlink,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import type { WorkflowConfig } from "./ComfyUIWorkflowPanel";
import { NodePropertiesPanel } from "./NodePropertiesPanel";

interface NodePosition {
  x: number;
  y: number;
}

interface NodeConnection {
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

interface WorkflowNode {
  id: string;
  type: 'checkpoint' | 'sampler' | 'vae' | 'lora' | 'controlnet' | 'latent' | 'decode' | 'save' | 'prompt' | 'clip';
  position: NodePosition;
  data: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

const NODE_TYPES = [
  { id: 'checkpoint', name: 'Load Checkpoint', icon: Cpu, color: 'bg-blue-500/20 border-blue-500', inputs: [], outputs: ['model', 'clip', 'vae'] },
  { id: 'prompt', name: 'CLIP Text Encode', icon: Sparkles, color: 'bg-purple-500/20 border-purple-500', inputs: ['clip'], outputs: ['conditioning'] },
  { id: 'sampler', name: 'KSampler', icon: GitBranch, color: 'bg-green-500/20 border-green-500', inputs: ['model', 'positive', 'negative', 'latent'], outputs: ['latent'] },
  { id: 'latent', name: 'Empty Latent', icon: Layers, color: 'bg-yellow-500/20 border-yellow-500', inputs: [], outputs: ['latent'] },
  { id: 'vae', name: 'VAE Decode', icon: Image, color: 'bg-orange-500/20 border-orange-500', inputs: ['vae', 'latent'], outputs: ['image'] },
  { id: 'lora', name: 'Load LoRA', icon: Layers, color: 'bg-pink-500/20 border-pink-500', inputs: ['model', 'clip'], outputs: ['model', 'clip'] },
  { id: 'controlnet', name: 'ControlNet Apply', icon: Palette, color: 'bg-cyan-500/20 border-cyan-500', inputs: ['conditioning', 'control_net', 'image'], outputs: ['conditioning'] },
  { id: 'save', name: 'Save Image', icon: Save, color: 'bg-gray-500/20 border-gray-500', inputs: ['image'], outputs: [] },
];

const DEFAULT_WORKFLOW: WorkflowNode[] = [
  {
    id: 'checkpoint_1',
    type: 'checkpoint',
    position: { x: 50, y: 150 },
    data: { checkpoint: 'dreamshaperXL' },
    inputs: [],
    outputs: ['model', 'clip', 'vae']
  },
  {
    id: 'prompt_positive',
    type: 'prompt',
    position: { x: 300, y: 50 },
    data: { text: 'positive prompt', type: 'positive' },
    inputs: ['clip'],
    outputs: ['conditioning']
  },
  {
    id: 'prompt_negative',
    type: 'prompt',
    position: { x: 300, y: 250 },
    data: { text: 'negative prompt', type: 'negative' },
    inputs: ['clip'],
    outputs: ['conditioning']
  },
  {
    id: 'latent_1',
    type: 'latent',
    position: { x: 300, y: 400 },
    data: { width: 1024, height: 1024, batch_size: 1 },
    inputs: [],
    outputs: ['latent']
  },
  {
    id: 'sampler_1',
    type: 'sampler',
    position: { x: 550, y: 150 },
    data: { sampler: 'dpmpp_2m_sde', scheduler: 'karras', steps: 30, cfg: 7, denoise: 1.0 },
    inputs: ['model', 'positive', 'negative', 'latent'],
    outputs: ['latent']
  },
  {
    id: 'vae_decode',
    type: 'vae',
    position: { x: 800, y: 150 },
    data: {},
    inputs: ['vae', 'latent'],
    outputs: ['image']
  },
  {
    id: 'save_1',
    type: 'save',
    position: { x: 1050, y: 150 },
    data: { filename_prefix: 'output' },
    inputs: ['image'],
    outputs: []
  }
];

const DEFAULT_CONNECTIONS: NodeConnection[] = [
  { fromNode: 'checkpoint_1', fromPort: 'model', toNode: 'sampler_1', toPort: 'model' },
  { fromNode: 'checkpoint_1', fromPort: 'clip', toNode: 'prompt_positive', toPort: 'clip' },
  { fromNode: 'checkpoint_1', fromPort: 'clip', toNode: 'prompt_negative', toPort: 'clip' },
  { fromNode: 'checkpoint_1', fromPort: 'vae', toNode: 'vae_decode', toPort: 'vae' },
  { fromNode: 'prompt_positive', fromPort: 'conditioning', toNode: 'sampler_1', toPort: 'positive' },
  { fromNode: 'prompt_negative', fromPort: 'conditioning', toNode: 'sampler_1', toPort: 'negative' },
  { fromNode: 'latent_1', fromPort: 'latent', toNode: 'sampler_1', toPort: 'latent' },
  { fromNode: 'sampler_1', fromPort: 'latent', toNode: 'vae_decode', toPort: 'latent' },
  { fromNode: 'vae_decode', fromPort: 'image', toNode: 'save_1', toPort: 'image' },
];

interface WorkflowNodeEditorProps {
  onWorkflowChange?: (nodes: WorkflowNode[], connections: NodeConnection[]) => void;
  onExportConfig?: (config: WorkflowConfig) => void;
}

export type { WorkflowNode, NodeConnection };

export function WorkflowNodeEditor({ onWorkflowChange, onExportConfig }: WorkflowNodeEditorProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(DEFAULT_WORKFLOW);
  const [connections, setConnections] = useState<NodeConnection[]>(DEFAULT_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; port: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setIsDragging(true);
    setSelectedNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x * zoom - pan.x,
      y: e.clientY - node.position.y * zoom - pan.y
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && selectedNode) {
      const newX = (e.clientX - dragOffset.x - pan.x) / zoom;
      const newY = (e.clientY - dragOffset.y - pan.y) / zoom;
      
      setNodes(prev => prev.map(node => 
        node.id === selectedNode 
          ? { ...node, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
          : node
      ));
    }
  }, [isDragging, selectedNode, dragOffset, pan, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const addNode = (type: WorkflowNode['type']) => {
    const nodeType = NODE_TYPES.find(t => t.id === type);
    if (!nodeType) return;

    const newNode: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {},
      inputs: nodeType.inputs,
      outputs: nodeType.outputs
    };

    setNodes(prev => [...prev, newNode]);
    toast.success(`Added ${nodeType.name} node`);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.fromNode !== nodeId && c.toNode !== nodeId));
    setSelectedNode(null);
    setShowPropertiesPanel(false);
    toast.success('Node deleted');
  };

  const handleNodeDataUpdate = (nodeId: string, data: Record<string, unknown>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data }
        : node
    ));
  };

  const openNodeProperties = (nodeId: string) => {
    setSelectedNode(nodeId);
    setShowPropertiesPanel(true);
  };

  const startConnection = (nodeId: string, port: string) => {
    setIsConnecting(true);
    setConnectingFrom({ nodeId, port });
  };

  const endConnection = (nodeId: string, port: string) => {
    if (connectingFrom && connectingFrom.nodeId !== nodeId) {
      const newConnection: NodeConnection = {
        fromNode: connectingFrom.nodeId,
        fromPort: connectingFrom.port,
        toNode: nodeId,
        toPort: port
      };
      
      // Check if connection already exists
      const exists = connections.some(c => 
        c.fromNode === newConnection.fromNode && 
        c.fromPort === newConnection.fromPort &&
        c.toNode === newConnection.toNode &&
        c.toPort === newConnection.toPort
      );

      if (!exists) {
        setConnections(prev => [...prev, newConnection]);
        toast.success('Connection created');
      }
    }
    setIsConnecting(false);
    setConnectingFrom(null);
  };

  const deleteConnection = (index: number) => {
    setConnections(prev => prev.filter((_, i) => i !== index));
  };

  const getNodePosition = (nodeId: string): NodePosition => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.position || { x: 0, y: 0 };
  };

  const renderConnections = () => {
    return connections.map((conn, index) => {
      const fromNode = nodes.find(n => n.id === conn.fromNode);
      const toNode = nodes.find(n => n.id === conn.toNode);
      if (!fromNode || !toNode) return null;

      const fromX = fromNode.position.x + 200;
      const fromY = fromNode.position.y + 40;
      const toX = toNode.position.x;
      const toY = toNode.position.y + 40;

      const midX = (fromX + toX) / 2;

      return (
        <g key={index}>
          <path
            d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            opacity="0.6"
            className="cursor-pointer hover:stroke-destructive hover:opacity-100 transition-all"
            onClick={() => deleteConnection(index)}
          />
          <circle cx={fromX} cy={fromY} r="4" fill="hsl(var(--primary))" />
          <circle cx={toX} cy={toY} r="4" fill="hsl(var(--primary))" />
        </g>
      );
    });
  };

  const exportToConfig = () => {
    const checkpointNode = nodes.find(n => n.type === 'checkpoint');
    const samplerNode = nodes.find(n => n.type === 'sampler');
    const latentNode = nodes.find(n => n.type === 'latent');
    const loraNodes = nodes.filter(n => n.type === 'lora');
    const controlNetNodes = nodes.filter(n => n.type === 'controlnet');

    const config: WorkflowConfig = {
      name: 'Exported Workflow',
      checkpoint: (checkpointNode?.data.checkpoint as string) || 'dreamshaperXL',
      vae: 'automatic',
      sampler: (samplerNode?.data.sampler as string) || 'dpmpp_2m_sde',
      scheduler: (samplerNode?.data.scheduler as string) || 'karras',
      steps: (samplerNode?.data.steps as number) || 30,
      cfgScale: (samplerNode?.data.cfg as number) || 7,
      width: (latentNode?.data.width as number) || 1024,
      height: (latentNode?.data.height as number) || 1024,
      batchSize: (latentNode?.data.batch_size as number) || 1,
      seed: -1,
      seedLocked: false,
      denoise: (samplerNode?.data.denoise as number) || 1.0,
      clipSkip: 2,
      loras: loraNodes.map((n, i) => ({
        id: n.id,
        name: (n.data.name as string) || `lora_${i}`,
        strength: (n.data.strength as number) || 0.8,
        clipStrength: (n.data.clip_strength as number) || 0.8,
        enabled: true
      })),
      controlNets: controlNetNodes.map((n, i) => ({
        id: n.id,
        type: (n.data.type as 'canny' | 'depth' | 'pose' | 'lineart' | 'softedge' | 'scribble') || 'canny',
        strength: (n.data.strength as number) || 1.0,
        startPercent: (n.data.start as number) || 0,
        endPercent: (n.data.end as number) || 1,
        enabled: true,
        preprocessor: (n.data.preprocessor as string) || 'canny'
      })),
      upscaler: 'none',
      upscaleBy: 2,
      hiresFixEnabled: false,
      hiresFixDenoise: 0.5,
      hiresFixSteps: 15
    };

    onExportConfig?.(config);
    toast.success('Workflow exported to configuration');
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-primary" />
            Visual Workflow Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={exportToConfig}>
              <Save className="h-4 w-4 mr-2" />
              Export Config
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* Node Palette */}
          <div className="w-48 border-r bg-muted/30 p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Add Nodes</Label>
            <div className="space-y-1">
              {NODE_TYPES.map(nodeType => (
                <Button
                  key={nodeType.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => addNode(nodeType.id as WorkflowNode['type'])}
                >
                  <nodeType.icon className="h-3 w-3 mr-2" />
                  {nodeType.name}
                </Button>
              ))}
            </div>

            {/* Selected Node Properties */}
            {selectedNode && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Selected Node</Label>
                <div className="space-y-2">
                  <p className="text-xs font-mono truncate">{selectedNode}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openNodeProperties(selectedNode)}
                  >
                    <Settings className="h-3 w-3 mr-2" />
                    Edit Properties
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => deleteNode(selectedNode)}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete Node
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area */}
          <div 
            ref={canvasRef}
            className="flex-1 h-[500px] bg-background overflow-hidden relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Connections SVG Layer */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ 
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: '0 0'
              }}
            >
              <g className="pointer-events-auto">
                {renderConnections()}
              </g>
            </svg>

            {/* Nodes */}
            <div
              className="absolute inset-0"
              style={{ 
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: '0 0'
              }}
            >
              {nodes.map(node => {
                const nodeType = NODE_TYPES.find(t => t.id === node.type);
                const Icon = nodeType?.icon || Cpu;
                
                return (
                  <div
                    key={node.id}
                    className={`absolute w-[200px] rounded-lg border-2 shadow-lg cursor-move transition-shadow ${
                      nodeType?.color || 'bg-muted border-border'
                    } ${selectedNode === node.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    style={{
                      left: node.position.x,
                      top: node.position.y
                    }}
                    onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    {/* Node Header */}
                    <div className="flex items-center gap-2 p-2 border-b border-current/20">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium truncate flex-1">
                        {nodeType?.name}
                      </span>
                    </div>

                    {/* Node Body */}
                    <div className="p-2 space-y-1">
                      {/* Inputs */}
                      {node.inputs.length > 0 && (
                        <div className="space-y-1">
                          {node.inputs.map(input => (
                            <div 
                              key={input}
                              className="flex items-center gap-1 cursor-pointer hover:bg-background/50 rounded px-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isConnecting) {
                                  endConnection(node.id, input);
                                }
                              }}
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-400 border border-blue-600" />
                              <span className="text-[10px] text-muted-foreground">{input}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Outputs */}
                      {node.outputs.length > 0 && (
                        <div className="space-y-1">
                          {node.outputs.map(output => (
                            <div 
                              key={output}
                              className="flex items-center justify-end gap-1 cursor-pointer hover:bg-background/50 rounded px-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                startConnection(node.id, output);
                              }}
                            >
                              <span className="text-[10px] text-muted-foreground">{output}</span>
                              <div className={`w-2 h-2 rounded-full border ${
                                isConnecting && connectingFrom?.nodeId === node.id && connectingFrom?.port === output
                                  ? 'bg-primary border-primary animate-pulse'
                                  : 'bg-green-400 border-green-600'
                              }`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connection Mode Indicator */}
            {isConnecting && (
              <div className="absolute bottom-4 left-4 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 animate-pulse">
                <Link2 className="h-4 w-4" />
                Click an input port to connect
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => {
                    setIsConnecting(false);
                    setConnectingFrom(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Node Properties Panel */}
          {showPropertiesPanel && selectedNode && (
            <div className="border-l">
              <NodePropertiesPanel
                node={nodes.find(n => n.id === selectedNode) || null}
                onNodeUpdate={handleNodeDataUpdate}
                onClose={() => setShowPropertiesPanel(false)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
