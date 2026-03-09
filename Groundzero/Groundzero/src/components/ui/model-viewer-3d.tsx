import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Center, useGLTF, Html, PresentationControls } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Download, RotateCcw, Maximize2, Minimize2, 
  Sun, Moon, Grid3X3, Eye, Loader2, AlertCircle,
  Play, Pause, Camera, Box
} from 'lucide-react';
import * as THREE from 'three';

interface ModelViewer3DProps {
  modelUrl: string;
  thumbnailUrl?: string;
  modelName?: string;
  onDownload?: () => void;
  className?: string;
  showControls?: boolean;
  autoRotate?: boolean;
  height?: string;
}

// Component to load and display the 3D model
function Model({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });
  
  // Calculate bounding box and center the model
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

// Loading fallback
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

// Error fallback
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

// Grid floor
function GridFloor({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <gridHelper args={[10, 10, '#444', '#333']} position={[0, -1, 0]} />
  );
}

// Camera controller for resetting view
function CameraController({ onReset }: { onReset: () => void }) {
  const { camera } = useThree();
  
  useEffect(() => {
    // Reset camera position
    camera.position.set(3, 2, 3);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return null;
}

export function ModelViewer3D({
  modelUrl,
  thumbnailUrl,
  modelName = 'Model',
  onDownload,
  className = '',
  showControls = true,
  autoRotate: initialAutoRotate = true,
  height = '400px',
}: ModelViewer3DProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [showGrid, setShowGrid] = useState(true);
  const [lightMode, setLightMode] = useState<'studio' | 'outdoor' | 'night'>('studio');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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
      case 'outdoor':
        return 'sunset';
      case 'night':
        return 'night';
      default:
        return 'studio';
    }
  };
  
  // Check if URL is valid
  useEffect(() => {
    if (!modelUrl) {
      setHasError(true);
      setErrorMessage('No model URL provided');
      return;
    }
    
    setHasError(false);
    setIsLoading(true);
    
    // Preload check
    fetch(modelUrl, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load model: ${res.status}`);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setHasError(true);
        setErrorMessage(err.message);
        setIsLoading(false);
      });
  }, [modelUrl]);
  
  return (
    <div 
      ref={containerRef}
      className={`relative bg-gradient-to-b from-secondary/50 to-background rounded-lg overflow-hidden ${className}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Header */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-background/80 to-transparent">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{modelName}</span>
            <Badge variant="secondary" className="text-xs">GLB</Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? 'Stop rotation' : 'Auto rotate'}
            >
              {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? 'Hide grid' : 'Show grid'}
            >
              <Grid3X3 className={`h-4 w-4 ${showGrid ? 'text-primary' : ''}`} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setLightMode(lightMode === 'studio' ? 'outdoor' : lightMode === 'outdoor' ? 'night' : 'studio')}
              title="Change lighting"
            >
              {lightMode === 'night' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: 'transparent' }}
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
        </Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
      
      {/* Footer controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-t from-background/80 to-transparent">
          <div className="text-xs text-muted-foreground">
            Drag to rotate • Scroll to zoom • Shift+drag to pan
          </div>
          
          <Button 
            variant="gold" 
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download GLB
          </Button>
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading 3D Model...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified preview component for thumbnails
export function ModelPreview3D({ 
  modelUrl, 
  size = 150,
  className = '' 
}: { 
  modelUrl: string; 
  size?: number;
  className?: string;
}) {
  return (
    <div 
      className={`rounded-lg overflow-hidden bg-secondary/50 ${className}`}
      style={{ width: size, height: size }}
    >
      <Canvas camera={{ position: [2, 1.5, 2], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Environment preset="studio" background={false} />
        
        <Suspense fallback={null}>
          <Center>
            <Model url={modelUrl} autoRotate={true} />
          </Center>
        </Suspense>
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={4} />
      </Canvas>
    </div>
  );
}
