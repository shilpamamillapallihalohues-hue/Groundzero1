import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { CreativeContextLibrary } from '@/components/creative-context/CreativeContextLibrary';
import { CreativeContextBreakdown } from '@/components/creative-context/CreativeContextBreakdown';
import { Book, Film, FolderOpen, Library } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SupervisorCreativeContext() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('breakdown');

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, title').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Book className="h-4 w-4 text-primary" />
          </div>
          <h1 className="font-semibold text-sm">Creative Context Upload</h1>
        </div>
        <Select value={selectedProjectId || ''} onValueChange={(v) => setSelectedProjectId(v || null)}>
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <Film className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {selectedProjectId ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pt-3">
            <TabsList className="h-8">
              <TabsTrigger value="breakdown" className="text-xs h-7 gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" /> Organized View
              </TabsTrigger>
              <TabsTrigger value="library" className="text-xs h-7 gap-1.5">
                <Library className="h-3.5 w-3.5" /> Upload & Manage
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="breakdown" className="mt-0 p-4">
              <CreativeContextBreakdown projectId={selectedProjectId} />
            </TabsContent>
            <TabsContent value="library" className="mt-0 p-4">
              <CreativeContextLibrary projectId={selectedProjectId} isDirector={true} hideUpload={false} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Film className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select a project to upload creative context</p>
          </div>
        </div>
      )}
    </div>
  );
}
