import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, Package, Check, Image, 
  Loader2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

interface DownloadApprovedPackProps {
  projectId: string;
  projectTitle?: string;
}

export function DownloadApprovedPack({ projectId, projectTitle }: DownloadApprovedPackProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: approvedConcepts } = useQuery({
    queryKey: ['approved-concepts-for-download', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type')
        .eq('project_id', projectId)
        .or('is_approved.eq.true,director_approved.eq.true')
        .not('image_url', 'is', null);
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  const downloadImages = async () => {
    if (!approvedConcepts || approvedConcepts.length === 0) {
      toast.error('No approved concepts to download');
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    try {
      // For now, download each image individually
      // In a production app, you'd use a server-side ZIP generator
      for (let i = 0; i < approvedConcepts.length; i++) {
        const concept = approvedConcepts[i];
        if (concept.image_url) {
          // Create a link and trigger download
          const link = document.createElement('a');
          link.href = concept.image_url;
          link.download = `${concept.title.replace(/[^a-z0-9]/gi, '_')}_${concept.concept_type}.jpg`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Wait a bit between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        setProgress(((i + 1) / approvedConcepts.length) * 100);
      }

      toast.success(`Downloaded ${approvedConcepts.length} approved concepts`);
    } catch (error) {
      toast.error('Failed to download some images');
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const count = approvedConcepts?.length || 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Download Approved Pack</h3>
              <Badge variant="secondary">{count} images</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Export all approved concept art for {projectTitle || 'this project'}
            </p>
          </div>
          <Button
            onClick={downloadImages}
            disabled={isDownloading || count === 0}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download All
              </>
            )}
          </Button>
        </div>

        {isDownloading && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Downloading {Math.round(progress)}%...
            </p>
          </div>
        )}

        {count === 0 && !isDownloading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No approved concepts available for download
          </div>
        )}
      </CardContent>
    </Card>
  );
}
