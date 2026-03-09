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

export default function ArtDirectorCreativeContext() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('breakdown');

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Book className="h-8 w-8 text-primary" />
            Creative Context Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage creative documents that guide AI generation
          </p>
        </div>

        <Select 
          value={selectedProjectId || ''} 
          onValueChange={(v) => setSelectedProjectId(v || null)}
        >
          <SelectTrigger className="w-64">
            <Film className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      {selectedProjectId ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="breakdown" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Organized View
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Library className="h-4 w-4" />
              Upload & Manage
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="breakdown" className="mt-6">
            <CreativeContextBreakdown projectId={selectedProjectId} />
          </TabsContent>
          
          <TabsContent value="library" className="mt-6">
            <CreativeContextLibrary projectId={selectedProjectId} isDirector={true} hideUpload={false} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a project to manage its creative context</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
