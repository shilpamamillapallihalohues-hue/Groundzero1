import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Center, useGLTF, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, Maximize2, Minimize2, 
  Sun, Moon, Grid3X3, Loader2, AlertCircle,
  Play, Pause, Box, MessageSquare, Plus,
  Send, CheckCircle, XCircle, Trash2, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

interface Annotation {
  id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  annotation_text: string;
  annotation_type: string;
  color: string;
  status: string;
  created_at: string;
  created_by?: string;
  profiles?: { full_name: string };
}

interface ModelViewerWithAnnotationsProps {
  modelUrl: string;
  deliverableId: string;
  projectId: string;
  modelName?: string;
  onDownload?: () => void;
  className?: string;
  showControls?: boolean;
  autoRotate?: boolean;
  height?: string;
  canEdit?: boolean;
  onSendForApproval?: () => void;
}

// Component to load and display the 3D model
function Model({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });
  
  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      scene.scale.setScalar(scale);
      
      const center = box.getCenter(new THREE.Vector3());
      scene.position.sub(center.multiplyScalar(scale));
    }
  }, [scene]);
  
  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm">Loading 3D Model...</span>
      </div>
    </Html>
  );
}

function ErrorFallback({ error }: { error: string }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <span className="text-sm text-center max-w-[200px]">{error}</span>
      </div>
    </Html>
  );
}

function GridFloor({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <gridHelper args={[10, 10, '#444', '#333']} position={[0, -1, 0]} />;
}

// 3D Annotation marker component
function AnnotationMarker({ 
  annotation, 
  onClick, 
  isSelected 
}: { 
  annotation: Annotation; 
  onClick: () => void;
  isSelected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
    }
  });
  
  const getTypeColor = () => {
    switch (annotation.annotation_type) {
      case 'issue': return '#EF4444';
      case 'suggestion': return '#3B82F6';
      case 'approved': return '#22C55E';
      default: return '#FFCC00';
    }
  };

  return (
    <group position={[annotation.position_x, annotation.position_y, annotation.position_z]}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color={getTypeColor()} 
          emissive={getTypeColor()} 
          emissiveIntensity={isSelected ? 0.8 : 0.3}
        />
      </mesh>
      {isSelected && (
        <Html distanceFactor={5}>
          <div className="bg-popover border border-border rounded-lg p-2 shadow-lg min-w-[150px] max-w-[250px]">
            <Badge className="mb-1 text-xs" variant="outline">
              {annotation.annotation_type}
            </Badge>
            <p className="text-xs text-foreground">{annotation.annotation_text}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Click handler to place annotations
function ClickHandler({ 
  onPlaceAnnotation, 
  enabled 
}: { 
  onPlaceAnnotation: (pos: THREE.Vector3) => void;
  enabled: boolean;
}) {
  const { camera, raycaster, scene } = useThree();
  
  const handleClick = useCallback((event: THREE.Event) => {
    if (!enabled) return;
    
    // Get intersection point
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      onPlaceAnnotation(intersects[0].point);
    }
  }, [enabled, raycaster, scene, onPlaceAnnotation]);

  return null;
}

export function ModelViewerWithAnnotations({
  modelUrl,
  deliverableId,
  projectId,
  modelName = 'Model',
  onDownload,
  className = '',
  showControls = true,
  autoRotate: initialAutoRotate = false,
  height = '500px',
  canEdit = true,
  onSendForApproval,
}: ModelViewerWithAnnotationsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [showGrid, setShowGrid] = useState(true);
  const [lightMode, setLightMode] = useState<'studio' | 'outdoor' | 'night'>('studio');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<THREE.Vector3 | null>(null);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [newAnnotationType, setNewAnnotationType] = useState('note');
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [showAnnotationList, setShowAnnotationList] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load annotations
  useEffect(() => {
    loadAnnotations();
  }, [deliverableId]);

  const loadAnnotations = async () => {
    try {
      const { data, error } = await supabase
        .from('model_annotations')
        .select('*')
        .eq('deliverable_id', deliverableId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnotations((data || []).map(item => ({
        ...item,
        profiles: undefined
      })));
    } catch (error) {
      console.error('Error loading annotations:', error);
    }
  };

  const handlePlaceAnnotation = (position: THREE.Vector3) => {
    setPendingPosition(position);
    setShowAnnotationDialog(true);
  };

  const saveAnnotation = async () => {
    if (!pendingPosition || !newAnnotationText.trim()) {
      toast.error('Please enter annotation text');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      const { error } = await supabase
        .from('model_annotations')
        .insert({
          deliverable_id: deliverableId,
          project_id: projectId,
          position_x: pendingPosition.x,
          position_y: pendingPosition.y,
          position_z: pendingPosition.z,
          annotation_text: newAnnotationText.trim(),
          annotation_type: newAnnotationType,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast.success('Annotation added');
      setShowAnnotationDialog(false);
      setNewAnnotationText('');
      setNewAnnotationType('note');
      setPendingPosition(null);
      setIsAddingAnnotation(false);
      loadAnnotations();
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error('Failed to save annotation');
    }
  };

  const deleteAnnotation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('model_annotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Annotation deleted');
      loadAnnotations();
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Failed to delete annotation');
    }
  };

  const updateAnnotationStatus = async (id: string, status: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      const { error } = await supabase
        .from('model_annotations')
        .update({ 
          status, 
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated');
      loadAnnotations();
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast.error('Failed to update status');
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (modelUrl) {
      const link = document.createElement('a');
      link.href = modelUrl;
      link.download = `${modelName}.glb`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getEnvironment = () => {
    switch (lightMode) {
      case 'outdoor': return 'sunset';
      case 'night': return 'night';
      default: return 'studio';
    }
  };

  useEffect(() => {
    if (!modelUrl) {
      setHasError(true);
      setErrorMessage('No model URL provided');
      return;
    }
    
    setHasError(false);
    setIsLoading(true);
    
    fetch(modelUrl, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load model: ${res.status}`);
        setIsLoading(false);
      })
      .catch((err) => {
        setHasError(true);
        setErrorMessage(err.message);
        setIsLoading(false);
      });
  }, [modelUrl]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'addressed': return 'bg-blue-500/20 text-blue-500';
      case 'approved': return 'bg-green-500/20 text-green-500';
      default: return 'bg-amber-500/20 text-amber-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'suggestion': return <MessageSquare className="h-3 w-3 text-blue-500" />;
      case 'approved': return <CheckCircle className="h-3 w-3 text-green-500" />;
      default: return <Eye className="h-3 w-3 text-amber-500" />;
    }
  };

  return (
    <div className={cn("flex gap-4", isFullscreen && "fixed inset-0 z-50 bg-background p-4")}>
      {/* 3D Viewer */}
      <div 
        ref={containerRef}
        className={cn(
          "relative bg-gradient-to-b from-secondary/50 to-background rounded-lg overflow-hidden flex-1 flex flex-col",
          className
        )}
        style={{ height: isFullscreen ? '100%' : height, minHeight: height }}
      >
        {/* Header Controls */}
        {showControls && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-background/80 to-transparent">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{modelName}</span>
              <Badge variant="secondary" className="text-xs">GLB</Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <MessageSquare className="h-3 w-3" />
                {annotations.length}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button 
                  variant={isAddingAnnotation ? "default" : "ghost"}
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                >
                  <Plus className="h-3 w-3" />
                  {isAddingAnnotation ? 'Cancel' : 'Add Note'}
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setAutoRotate(!autoRotate)}
              >
                {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className={cn("h-4 w-4", showGrid && "text-primary")} />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setLightMode(lightMode === 'studio' ? 'outdoor' : lightMode === 'outdoor' ? 'night' : 'studio')}
              >
                {lightMode === 'night' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Add annotation mode indicator */}
        {isAddingAnnotation && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium">
            Click on the model to place an annotation
          </div>
        )}
        
        {/* 3D Canvas - takes full remaining height */}
        <div className="flex-1 w-full relative" style={{ minHeight: '400px' }}>
          <Canvas
            camera={{ position: [3, 2, 3], fov: 50 }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'transparent' }}
            onPointerDown={(e) => {
            if (isAddingAnnotation && e.target instanceof HTMLCanvasElement) {
              const rect = e.target.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              handlePlaceAnnotation(new THREE.Vector3(x * 2, y * 2, 0));
            }
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          <Environment preset={getEnvironment()} background={false} />
          <GridFloor visible={showGrid} />
          
          <Suspense fallback={<LoadingFallback />}>
            {!hasError && modelUrl && (
              <Center>
                <Model url={modelUrl} autoRotate={autoRotate} />
              </Center>
            )}
            {hasError && <ErrorFallback error={errorMessage} />}
            
            {/* Render annotation markers */}
            {annotations.map((annotation) => (
              <AnnotationMarker
                key={annotation.id}
                annotation={annotation}
                isSelected={selectedAnnotation === annotation.id}
                onClick={() => setSelectedAnnotation(
                  selectedAnnotation === annotation.id ? null : annotation.id
                )}
              />
            ))}
          </Suspense>
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={1}
            maxDistance={10}
          />
        </Canvas>
        </div>
        
        {/* Footer controls */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-t from-background/80 to-transparent">
            <div className="text-xs text-muted-foreground">
              Drag to rotate • Scroll to zoom • Shift+drag to pan
            </div>
            
            <div className="flex gap-2">
              {onSendForApproval && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={onSendForApproval}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send for Approval
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
        
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading 3D Model...</span>
            </div>
          </div>
        )}
      </div>

      {/* Annotations Panel */}
      {showAnnotationList && annotations.length > 0 && (
        <Card className="w-72 flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Annotations</h3>
              <Badge variant="outline" className="text-xs">{annotations.length}</Badge>
            </div>
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {annotations.map((annotation) => (
                  <div 
                    key={annotation.id}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-colors",
                      selectedAnnotation === annotation.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedAnnotation(
                      selectedAnnotation === annotation.id ? null : annotation.id
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(annotation.annotation_type)}
                      <Badge className={cn("text-xs", getStatusColor(annotation.status))}>
                        {annotation.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">
                      {annotation.annotation_text}
                    </p>
                    {canEdit && (
                      <div className="flex gap-1 mt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAnnotationStatus(annotation.id, 'addressed');
                          }}
                        >
                          Addressed
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(annotation.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add Annotation Dialog */}
      <Dialog open={showAnnotationDialog} onOpenChange={setShowAnnotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={newAnnotationType} onValueChange={setNewAnnotationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                placeholder="Enter your annotation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnotationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveAnnotation}>
              Add Annotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
