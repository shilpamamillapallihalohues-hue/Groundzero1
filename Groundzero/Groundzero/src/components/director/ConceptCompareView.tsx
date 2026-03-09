import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Columns, ArrowLeftRight, Check, X, 
  ZoomIn, ZoomOut, RotateCcw 
} from 'lucide-react';

interface ConceptCompareViewProps {
  projectId: string;
}

interface ConceptArt {
  id: string;
  title: string;
  image_url: string | null;
  concept_type: string;
  is_approved: boolean;
  review_status: string | null;
  created_at: string;
}

export function ConceptCompareView({ projectId }: ConceptCompareViewProps) {
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');
  const [zoom, setZoom] = useState(1);

  const { data: concepts } = useQuery({
    queryKey: ['concepts-for-compare', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, is_approved, review_status, created_at')
        .eq('project_id', projectId)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ConceptArt[];
    },
    enabled: !!projectId
  });

  const leftConcept = concepts?.find(c => c.id === leftId);
  const rightConcept = concepts?.find(c => c.id === rightId);

  const getStatusBadge = (concept: ConceptArt) => {
    if (concept.is_approved) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Approved</Badge>;
    }
    if (concept.review_status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Columns className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Side-by-Side Compare</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(z => Math.min(2, z + 0.25))}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection row */}
      <div className="grid grid-cols-2 gap-4">
        <Select value={leftId} onValueChange={setLeftId}>
          <SelectTrigger>
            <SelectValue placeholder="Select first concept..." />
          </SelectTrigger>
          <SelectContent>
            {concepts?.filter(c => c.id !== rightId).map(concept => (
              <SelectItem key={concept.id} value={concept.id}>
                <span className="flex items-center gap-2">
                  {concept.is_approved && <Check className="h-3 w-3 text-emerald-500" />}
                  {concept.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rightId} onValueChange={setRightId}>
          <SelectTrigger>
            <SelectValue placeholder="Select second concept..." />
          </SelectTrigger>
          <SelectContent>
            {concepts?.filter(c => c.id !== leftId).map(concept => (
              <SelectItem key={concept.id} value={concept.id}>
                <span className="flex items-center gap-2">
                  {concept.is_approved && <Check className="h-3 w-3 text-emerald-500" />}
                  {concept.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swap button */}
      {leftId && rightId && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const temp = leftId;
              setLeftId(rightId);
              setRightId(temp);
            }}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Swap
          </Button>
        </div>
      )}

      {/* Comparison view */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left panel */}
        <Card className={leftConcept ? '' : 'border-dashed'}>
          {leftConcept ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium truncate">{leftConcept.title}</CardTitle>
                  {getStatusBadge(leftConcept)}
                </div>
                <p className="text-xs text-muted-foreground">{leftConcept.concept_type}</p>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <div 
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                >
                  <img 
                    src={leftConcept.image_url!} 
                    alt={leftConcept.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center">
              <Columns className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a concept</p>
            </CardContent>
          )}
        </Card>

        {/* Right panel */}
        <Card className={rightConcept ? '' : 'border-dashed'}>
          {rightConcept ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium truncate">{rightConcept.title}</CardTitle>
                  {getStatusBadge(rightConcept)}
                </div>
                <p className="text-xs text-muted-foreground">{rightConcept.concept_type}</p>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <div 
                  className="relative aspect-video rounded-lg overflow-hidden bg-muted"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                >
                  <img 
                    src={rightConcept.image_url!} 
                    alt={rightConcept.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center">
              <Columns className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a concept</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Quick info if both selected */}
      {leftConcept && rightConcept && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Left: </span>
                <span className="font-medium">{leftConcept.title}</span>
                {leftConcept.is_approved && <Check className="inline h-3 w-3 text-emerald-500 ml-1" />}
              </div>
              <div>
                <span className="text-muted-foreground">Right: </span>
                <span className="font-medium">{rightConcept.title}</span>
                {rightConcept.is_approved && <Check className="inline h-3 w-3 text-emerald-500 ml-1" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
