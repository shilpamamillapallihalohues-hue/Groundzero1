import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Database, FolderTree, Server, Activity, Wrench, Shield, FileText, Bot, Box } from 'lucide-react';
import { StorageConfigSection } from '@/components/admin/infrastructure/StorageConfigSection';
import { ProjectStorageMappingSection } from '@/components/admin/infrastructure/ProjectStorageMappingSection';
import { RenderFarmSection } from '@/components/admin/infrastructure/RenderFarmSection';
import { ServerHealthSection } from '@/components/admin/infrastructure/ServerHealthSection';
import { ToolConfigSection } from '@/components/admin/infrastructure/ToolConfigSection';
import { AccessPermissionsSection } from '@/components/admin/infrastructure/AccessPermissionsSection';
import { SystemLogsSection } from '@/components/admin/infrastructure/SystemLogsSection';
import { AIToolsConfigSection } from '@/components/admin/infrastructure/AIToolsConfigSection';
import { Engine3DConfigSection } from '@/components/admin/infrastructure/Engine3DConfigSection';

export default function Infrastructure() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState('storage');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isLoading, isAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Infrastructure & System Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure storage, render farm, tools, and system settings. Admin access only.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-9 w-full">
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden md:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="project-mapping" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              <span className="hidden md:inline">Mapping</span>
            </TabsTrigger>
            <TabsTrigger value="render-farm" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden md:inline">Render</span>
            </TabsTrigger>
            <TabsTrigger value="server-health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden md:inline">Health</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden md:inline">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="ai-tools" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden md:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="3d-engine" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              <span className="hidden md:inline">3D</span>
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Access</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="storage">
            <StorageConfigSection />
          </TabsContent>

          <TabsContent value="project-mapping">
            <ProjectStorageMappingSection />
          </TabsContent>

          <TabsContent value="render-farm">
            <RenderFarmSection />
          </TabsContent>

          <TabsContent value="server-health">
            <ServerHealthSection />
          </TabsContent>

          <TabsContent value="tools">
            <ToolConfigSection />
          </TabsContent>

          <TabsContent value="ai-tools">
            <AIToolsConfigSection />
          </TabsContent>

          <TabsContent value="3d-engine">
            <Engine3DConfigSection />
          </TabsContent>

          <TabsContent value="access">
            <AccessPermissionsSection />
          </TabsContent>

          <TabsContent value="logs">
            <SystemLogsSection />
          </TabsContent>
        </Tabs>
    </div>
  );
}
