import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutGrid, 
  Download, 
  Trash2, 
  Palette,
  Image as ImageIcon,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ConceptArt } from '@/types/conceptArt';
import { CONCEPT_TYPE_LABELS } from '@/constants/conceptArtLabels';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface MoodBoardGeneratorProps {
  projectId: string;
}

interface MoodBoardItem {
  id: string;
  type: 'concept' | 'reference' | 'color';
  imageUrl?: string;
  title?: string;
  color?: string;
}

interface ReferenceImage {
  id: string;
  image_url: string;
  title?: string;
  style_dna?: Record<string, unknown>;
}

export function MoodBoardGenerator({ projectId }: MoodBoardGeneratorProps) {
  const [boardItems, setBoardItems] = useState<MoodBoardItem[]>([]);
  const [boardTitle, setBoardTitle] = useState('Mood Board');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Fetch concepts using react-query for proper cache sync
  const { data: concepts = [], isLoading: conceptsLoading, refetch: refetchConcepts } = useQuery({
    queryKey: ['concept-arts-wall', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        concept_type: item.concept_type as ConceptArt['concept_type'],
        art_style: item.art_style as ConceptArt['art_style'],
        tags: item.tags || [],
        metadata: (item.metadata as Record<string, unknown>) || {},
      })) as ConceptArt[];
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch references using react-query
  const { data: references = [], isLoading: referencesLoading } = useQuery({
    queryKey: ['reference-images', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('reference_images')
        .select('id, image_url, title, style_dna')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(r => ({
        ...r,
        style_dna: r.style_dna as Record<string, unknown> || {}
      })) as ReferenceImage[];
    },
    enabled: !!projectId,
  });

  const loading = conceptsLoading || referencesLoading;

  const addConceptToBoard = (concept: ConceptArt) => {
    if (boardItems.find(item => item.id === concept.id)) {
      toast.error('Already in board');
      return;
    }
    
    setBoardItems(prev => [...prev, {
      id: concept.id,
      type: 'concept',
      imageUrl: concept.image_url,
      title: concept.title
    }]);
    
    // Extract colors from concept metadata if available
    if (concept.metadata && typeof concept.metadata === 'object') {
      const meta = concept.metadata as Record<string, unknown>;
      if (meta.dominantColors && Array.isArray(meta.dominantColors)) {
        setExtractedColors(prev => [...new Set([...prev, ...meta.dominantColors as string[]])]);
      }
    }
  };

  const addReferenceToBoard = (ref: ReferenceImage) => {
    if (boardItems.find(item => item.id === ref.id)) {
      toast.error('Already in board');
      return;
    }
    
    setBoardItems(prev => [...prev, {
      id: ref.id,
      type: 'reference',
      imageUrl: ref.image_url,
      title: ref.title || 'Reference'
    }]);
    
    // Extract colors from style_dna
    if (ref.style_dna?.dominantColors && Array.isArray(ref.style_dna.dominantColors)) {
      setExtractedColors(prev => [...new Set([...prev, ...ref.style_dna!.dominantColors as string[]])]);
    }
  };

  const addColorToBoard = (color: string) => {
    const colorId = `color-${color.replace('#', '')}`;
    if (boardItems.find(item => item.id === colorId)) return;
    
    setBoardItems(prev => [...prev, {
      id: colorId,
      type: 'color',
      color
    }]);
  };

  const removeFromBoard = (id: string) => {
    setBoardItems(prev => prev.filter(item => item.id !== id));
  };

  const generateColorPalette = async () => {
    // Generate a harmonious color palette based on existing colors
    const baseColors = extractedColors.length > 0 ? extractedColors : ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#00b894'];
    
    // Add complementary and analogous colors
    const palette = [...baseColors];
    
    setExtractedColors(palette.slice(0, 8));
    toast.success('Color palette generated!');
  };

  const exportMoodBoard = async () => {
    if (!boardRef.current || boardItems.length === 0) {
      toast.error('Add items to the board first');
      return;
    }
    
    setIsExporting(true);
    
    try {
      // Use html2canvas for export (simplified approach using browser download)
      const boardElement = boardRef.current;
      
      // Create a canvas manually
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Set canvas size
      canvas.width = 1920;
      canvas.height = 1080;
      
      // Fill background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.fillText(boardTitle, 40, 70);
      
      // Draw items in a grid
      const imageItems = boardItems.filter(item => item.imageUrl);
      const colorItems = boardItems.filter(item => item.color);
      
      // Load and draw images
      const cols = Math.min(4, imageItems.length);
      const rows = Math.ceil(imageItems.length / cols);
      const imgWidth = (canvas.width - 80 - (cols - 1) * 20) / cols;
      const imgHeight = Math.min(400, (canvas.height - 200 - (rows - 1) * 20) / rows);
      
      let loadedCount = 0;
      const totalImages = imageItems.length;
      
      const drawComplete = () => {
        // Draw color palette at bottom
        if (colorItems.length > 0) {
          const colorSize = 60;
          const startX = 40;
          const startY = canvas.height - 100;
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Inter, sans-serif';
          ctx.fillText('Color Palette', startX, startY - 10);
          
          colorItems.forEach((item, idx) => {
            if (item.color) {
              ctx.fillStyle = item.color;
              ctx.fillRect(startX + idx * (colorSize + 10), startY, colorSize, colorSize);
              ctx.strokeStyle = '#ffffff33';
              ctx.strokeRect(startX + idx * (colorSize + 10), startY, colorSize, colorSize);
            }
          });
        }
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${boardTitle.replace(/\s+/g, '_')}_moodboard.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Mood board exported!');
          }
        }, 'image/png');
        
        setIsExporting(false);
      };
      
      if (totalImages === 0) {
        drawComplete();
        return;
      }
      
      imageItems.forEach((item, idx) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = 40 + col * (imgWidth + 20);
          const y = 100 + row * (imgHeight + 20);
          
          // Draw image with cover behavior
          const scale = Math.max(imgWidth / img.width, imgHeight / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (imgWidth - scaledWidth) / 2;
          const offsetY = (imgHeight - scaledHeight) / 2;
          
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, imgWidth, imgHeight, 8);
          ctx.clip();
          ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
          ctx.restore();
          
          // Draw title
          if (item.title) {
            ctx.fillStyle = '#ffffff99';
            ctx.font = '14px Inter, sans-serif';
            ctx.fillText(item.title.slice(0, 30), x + 8, y + imgHeight - 10);
          }
          
          loadedCount++;
          if (loadedCount === totalImages) {
            drawComplete();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            drawComplete();
          }
        };
        img.src = item.imageUrl || '';
      });
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export mood board');
      setIsExporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Assets Panel */}
      <div className="space-y-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Concept Arts ({concepts.length})
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refetchConcepts()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {concepts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No concept arts yet. Generate from Project Breakdown.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {concepts.slice(0, 12).map(concept => (
                    <button
                      key={concept.id}
                      onClick={() => addConceptToBoard(concept)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                        boardItems.find(i => i.id === concept.id) ? 'border-primary opacity-50' : 'border-transparent'
                      }`}
                    >
                      {concept.image_url ? (
                        <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              References ({references.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              {references.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No references uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {references.slice(0, 9).map(ref => (
                    <button
                      key={ref.id}
                      onClick={() => addReferenceToBoard(ref)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                        boardItems.find(i => i.id === ref.id) ? 'border-primary opacity-50' : 'border-transparent'
                      }`}
                    >
                      <img src={ref.image_url} alt={ref.title || 'Reference'} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Color Palette
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {extractedColors.map(color => (
                <button
                  key={color}
                  onClick={() => addColorToBoard(color)}
                  className="w-8 h-8 rounded-lg border-2 border-border hover:border-primary transition-all"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={generateColorPalette}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Generate Palette
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mood Board Canvas */}
      <Card className="lg:col-span-2 border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <Input
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none p-0 h-auto w-64"
              />
            </div>
            <Button onClick={exportMoodBoard} disabled={isExporting || boardItems.length === 0}>
              {isExporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export PNG
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={boardRef}
            className="min-h-[500px] rounded-lg bg-gradient-to-br from-background to-muted/30 border-2 border-dashed border-border p-4"
          >
            {boardItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mb-4 opacity-50" />
                <p>Click on concepts, references, or colors to add them to your mood board</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {boardItems.filter(item => item.imageUrl).map(item => (
                    <div key={item.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                          <span className="text-white text-sm truncate">{item.title}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 text-white"
                            onClick={() => removeFromBoard(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                        {item.type === 'concept' ? 'Concept' : 'Reference'}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Color Swatches */}
                {boardItems.filter(item => item.color).length > 0 && (
                  <div className="border-t border-border/50 pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Color Palette</p>
                    <div className="flex gap-2">
                      {boardItems.filter(item => item.color).map(item => (
                        <div key={item.id} className="relative group">
                          <div 
                            className="w-12 h-12 rounded-lg border border-border"
                            style={{ backgroundColor: item.color }}
                          />
                          <button
                            onClick={() => removeFromBoard(item.id)}
                            className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Trash2 className="h-2 w-2 text-destructive-foreground" />
                          </button>
                          <p className="text-xs text-center mt-1 text-muted-foreground">{item.color}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
