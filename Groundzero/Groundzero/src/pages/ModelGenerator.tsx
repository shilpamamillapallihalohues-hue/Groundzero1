import { Suspense, lazy } from 'react';
import { Box, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the heavy 3D component to prevent blank screen
const ModelGenerator3D = lazy(() => 
  import('@/components/pipeline/ModelGenerator3D').then(mod => ({ default: mod.ModelGenerator3D }))
);

// Loading fallback for the 3D generator
function LoadingFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}

// 3D Model Generator Page - MainLayout is provided by App.tsx router
export default function ModelGenerator() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ModelGenerator3D />
    </Suspense>
  );
}
