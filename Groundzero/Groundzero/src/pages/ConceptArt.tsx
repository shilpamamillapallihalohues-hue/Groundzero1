import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConceptArtGenerator } from '@/components/concept-art/ConceptArtGenerator';
import { WorldEnvironmentGenerator } from '@/components/concept-art/WorldEnvironmentGenerator';
import { MoodBoardGenerator } from '@/components/concept-art/MoodBoardGenerator';
import { ProjectAssetBreakdown } from '@/components/concept-art/ProjectAssetBreakdown';
import { useProjectContext } from '@/contexts/ProjectContext';
import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';
import { usePreProdStage } from '@/hooks/usePreProdStage';
import { Palette, Sparkles, LayoutGrid, Lock, AlertCircle, FileText, Globe, User, Box, Shirt } from 'lucide-react';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface Project {
  id: string;
  title: string;
}

type ConceptArtMode = 'character' | 'prop' | 'costume' | 'location' | 'world';

const CONCEPT_MODE_OPTIONS: { value: ConceptArtMode; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'character', label: 'Character', description: 'Character design sheets', icon: <User className="h-4 w-4" /> },
  { value: 'prop', label: 'Prop', description: 'Props and weapons', icon: <Box className="h-4 w-4" /> },
  { value: 'costume', label: 'Costume', description: 'Costume designs', icon: <Shirt className="h-4 w-4" /> },
  { value: 'location', label: 'Location / Environment', description: 'Single set or location', icon: <Palette className="h-4 w-4" /> },
  { value: 'world', label: 'World (Full Environment Pack)', description: 'Complete world-building', icon: <Globe className="h-4 w-4" /> },
];

export default function ConceptArt() {
  const [searchParams] = useSearchParams();
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  const { data: assignedProjects } = useAssignedProjects();
  const projects = (assignedProjects || []).map(p => ({ id: p.id, title: p.title }));
  const [activeTab, setActiveTab] = useState('generate');
  const [conceptMode, setConceptMode] = useState<ConceptArtMode>('character');
  
  const sceneFromUrl = searchParams.get('scene');
  const projectFromUrl = searchParams.get('project');

  const selectedProjectId = globalProjectId || '';
  const setSelectedProjectId = (id: string) => setGlobalProjectId(id || null);

  // Pre-Production Stage Hook
  const {
    isLocked: isConceptLocked,
    previousStagesLocked,
  } = usePreProdStage(selectedProjectId || null, 'concept_art');

  useEffect(() => {
    if (projectFromUrl && projects.length > 0) {
      setSelectedProjectId(projectFromUrl);
    } else if (!globalProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projectFromUrl, projects, globalProjectId]);

  const isWorldOrLocationMode = conceptMode === 'location' || conceptMode === 'world';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Palette className="h-8 w-8 text-primary" />
              Concept Art Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered concept art generation with intelligent prompt building
            </p>
          </div>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stage Gate for Approval/Lock */}
        {selectedProjectId && (
          <PreProdStageGate
            projectId={selectedProjectId}
            stage="concept_art"
            title="Concept Art Department"
            description="Define visual identity of scenes & assets"
          />
        )}

        {/* Previous Stage Warning */}
        {selectedProjectId && !previousStagesLocked && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Script must be locked first</p>
              <p className="text-sm">Complete Script breakdown and lock before proceeding with Concept Art.</p>
            </div>
          </div>
        )}

        {/* Locked Stage Warning */}
        {isConceptLocked && (
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Concept Art Stage Locked</p>
              <p className="text-sm">Approved concepts are now binding visual references. Production must follow them.</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {selectedProjectId ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="generate" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="moodboard" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Mood Board
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="gap-2">
                <FileText className="h-4 w-4" />
                Project Breakdown
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-6 space-y-4">
              {/* Concept Art Type Selector */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Concept Art Type</Label>
                    <Select value={conceptMode} onValueChange={(v: ConceptArtMode) => setConceptMode(v)}>
                      <SelectTrigger className="w-full md:w-80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONCEPT_MODE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              {opt.icon}
                              <div>
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">— {opt.description}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {isWorldOrLocationMode && (
                      <p className="text-xs text-muted-foreground">
                        {conceptMode === 'world' 
                          ? '🌍 Full World Pack: Generates complete world-building concept art across 14 production modules.'
                          : '📍 Location Mode: Generates concept art for a single set or location with key modules.'
                        }
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Render appropriate generator based on mode */}
              {isWorldOrLocationMode ? (
                <WorldEnvironmentGenerator projectId={selectedProjectId} />
              ) : (
                <ConceptArtGenerator 
                  projectId={selectedProjectId} 
                  sceneId={sceneFromUrl || undefined}
                />
              )}
            </TabsContent>

            <TabsContent value="moodboard" className="mt-6">
              <MoodBoardGenerator projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="breakdown" className="mt-6">
              <ProjectAssetBreakdown 
                projects={projects}
                selectedProjectId={selectedProjectId}
                onProjectChange={setSelectedProjectId}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Create a project first to start generating concept art
          </div>
        )}
      </div>
    </MainLayout>
  );
}
