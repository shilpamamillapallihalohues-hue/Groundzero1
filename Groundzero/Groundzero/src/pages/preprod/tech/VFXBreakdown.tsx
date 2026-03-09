import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { VFXBreakdownPanel } from '@/components/vfx/VFXBreakdownPanel';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Sparkles } from 'lucide-react';

export default function VFXBreakdown() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            VFX Breakdown & Cost Analysis
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indian market rates • Animation vs Live Action comparison
          </p>
        </div>
        <ProjectSceneSelector
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
          selectedSceneId={selectedSceneId}
          onSceneSelect={setSelectedSceneId}
        />
      </div>

      <VFXBreakdownPanel projectId={selectedProjectId} sceneId={selectedSceneId} />
    </div>
  );
}
