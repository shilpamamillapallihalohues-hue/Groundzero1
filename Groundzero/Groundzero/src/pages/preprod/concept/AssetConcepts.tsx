import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectAssetBreakdown } from '@/components/concept-art/ProjectAssetBreakdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectContext } from '@/contexts/ProjectContext';

interface Project {
  id: string;
  title: string;
}

export default function AssetConcepts() {
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();

  const selectedProjectId = globalProjectId || '';
  const setSelectedProjectId = (id: string) => setGlobalProjectId(id || null);

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects-for-asset-concepts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, title').order('title');
      if (error) throw error;
      return (data || []) as Project[];
    }
  });

  // Set initial project only if no global selection exists
  useEffect(() => {
    if (projects && projects.length > 0 && !globalProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, globalProjectId]);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-amber-500" />
              Concept Breakdown
            </h1>
            <p className="text-muted-foreground mt-1">
              Project asset breakdown with concept art references
            </p>
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ProjectAssetBreakdown 
          selectedProjectId={selectedProjectId}
        />
      </div>
    </MainLayout>
  );
}
