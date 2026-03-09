import { useState, useCallback } from 'react';
import { User, Sparkles, Loader2, RotateCcw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FacialReferenceUploader } from '@/components/characters/FacialReferenceUploader';
import { FacialGenerationSettings } from '@/components/characters/FacialGenerationSettings';
import { FacialTurnaroundViewer } from '@/components/characters/FacialTurnaroundViewer';
import { FacialExportPanel } from '@/components/characters/FacialExportPanel';
import { 
  FacialReferenceImage, 
  FacialTurnaroundView, 
  FacialLandmarks,
  FacialGenerationSettings as FacialSettings,
  DEFAULT_TURNAROUND_VIEWS
} from '@/types/facialReconstruction';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SETTINGS: FacialSettings = {
  stylization: 'realistic',
  outputResolution: '2k',
  outputFormat: 'png',
  generateExpressions: false,
  neutralBackground: true,
};

export default function FacialReconstruction() {
  const navigate = useNavigate();
  const [characterName, setCharacterName] = useState('');
  const [referenceImages, setReferenceImages] = useState<FacialReferenceImage[]>([]);
  const [settings, setSettings] = useState<FacialSettings>(DEFAULT_SETTINGS);
  const [views, setViews] = useState<FacialTurnaroundView[]>([]);
  const [landmarks, setLandmarks] = useState<FacialLandmarks | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');

  const canGenerate = characterName.trim() !== '' && referenceImages.length > 0 && !isGenerating;

  const initializeViews = useCallback((): FacialTurnaroundView[] => {
    return DEFAULT_TURNAROUND_VIEWS.map(v => ({
      ...v,
      id: crypto.randomUUID(),
      imageUrl: null,
      status: 'pending' as const,
      confidence: 0,
    }));
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    const newViews = initializeViews();
    setViews(newViews);
    setLandmarks(null);

    try {
      // Step 1: Face Detection & Landmark Extraction
      setGenerationStep('Detecting face and extracting landmarks...');
      await new Promise(r => setTimeout(r, 1500));

      // Step 2: Identity Reconstruction
      setGenerationStep('Reconstructing facial identity...');
      await new Promise(r => setTimeout(r, 1500));

      // Step 3: Generate each view
      for (let i = 0; i < newViews.length; i++) {
        const view = newViews[i];
        setGenerationStep(`Generating ${view.label}...`);
        
        // Update to generating
        setViews(prev => prev.map(v => 
          v.id === view.id ? { ...v, status: 'generating' } : v
        ));

        await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

        // Complete with placeholder
        setViews(prev => prev.map(v => 
          v.id === view.id ? { 
            ...v, 
            status: 'completed',
            imageUrl: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop&crop=face&q=80&seed=${view.viewType}`,
            confidence: 0.85 + Math.random() * 0.1,
          } : v
        ));
      }

      // Step 4: Generate landmarks
      setGenerationStep('Computing landmark metadata...');
      await new Promise(r => setTimeout(r, 1000));

      setLandmarks({
        eyeDistance: 62.5 + Math.random() * 5,
        headScale: 1.0 + Math.random() * 0.1,
        landmarkConfidence: 0.92 + Math.random() * 0.05,
        identityConfidence: 0.88 + Math.random() * 0.08,
        symmetryScore: 0.94 + Math.random() * 0.04,
      });

      toast.success('Facial turnaround generated', {
        description: `${newViews.length} views created successfully`,
      });
    } catch (error) {
      toast.error('Generation failed', { description: 'Please try again' });
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleRegenerateView = async (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return;

    setViews(prev => prev.map(v => 
      v.id === viewId ? { ...v, status: 'generating' } : v
    ));

    await new Promise(r => setTimeout(r, 1200));

    setViews(prev => prev.map(v => 
      v.id === viewId ? { 
        ...v, 
        status: 'completed',
        imageUrl: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop&crop=face&q=80&t=${Date.now()}`,
        confidence: 0.87 + Math.random() * 0.1,
      } : v
    ));

    toast.success(`${view.label} regenerated`);
  };

  const handleApproveAll = () => {
    toast.success('All views approved', {
      description: 'Ready for export to character pipeline',
    });
  };

  const handleReset = () => {
    setCharacterName('');
    setReferenceImages([]);
    setSettings(DEFAULT_SETTINGS);
    setViews([]);
    setLandmarks(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Facial Reconstruction & Turnaround
                </h1>
                <p className="text-xs text-muted-foreground">
                  Generate production-ready facial turnarounds for KeenTools & modeling
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Inputs */}
          <div className="lg:col-span-3">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-6 pr-4">
                {/* Character Name */}
                <Card className="p-4">
                  <Label className="text-xs text-muted-foreground">Character Name</Label>
                  <Input
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Enter character name..."
                    className="mt-2"
                    disabled={isGenerating}
                  />
                </Card>

                {/* Reference Uploader */}
                <Card className="p-4">
                  <FacialReferenceUploader
                    images={referenceImages}
                    onImagesChange={setReferenceImages}
                    disabled={isGenerating}
                  />
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* Center Panel - Viewer */}
          <div className="lg:col-span-6">
            <Card className="p-6 min-h-[600px]">
              {views.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-10 h-10 text-primary/50" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">No Turnaround Generated</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload reference images and click generate to create facial turnarounds
                    </p>
                  </div>
                  
                  {/* Generation Step Indicator */}
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {generationStep}
                    </div>
                  )}
                </div>
              ) : (
                <FacialTurnaroundViewer
                  views={views}
                  landmarks={landmarks}
                  onRegenerateView={handleRegenerateView}
                  onApproveAll={handleApproveAll}
                  isGenerating={isGenerating}
                />
              )}
            </Card>

            {/* Generate Button */}
            <div className="mt-4">
              <Button
                className="w-full h-12"
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {generationStep || 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Facial Turnaround
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel - Settings & Export */}
          <div className="lg:col-span-3">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-6 pr-4">
                {/* Settings */}
                <Card className="p-4">
                  <FacialGenerationSettings
                    settings={settings}
                    onSettingsChange={setSettings}
                    disabled={isGenerating}
                  />
                </Card>

                {/* Export Panel */}
                {views.length > 0 && (
                  <Card className="p-4">
                    <FacialExportPanel
                      characterName={characterName}
                      views={views}
                      landmarks={landmarks}
                      settings={settings}
                      disabled={isGenerating}
                    />
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
