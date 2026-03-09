
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReferenceUsagePreviewProps {
  referenceId: string;
  projectId: string;
}

export default function ReferenceUsagePreview({ referenceId, projectId }: ReferenceUsagePreviewProps) {
  const { data: assetLinks = [], isLoading } = useQuery({
    queryKey: ['ref-usage-links', referenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_reference_links')
        .select('id, target_name, target_type')
        .eq('source_id', referenceId)
        .eq('source_type', 'reference');
      if (error) throw error;
      return data || [];
    },
    enabled: !!referenceId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking usage...
      </div>
    );
  }

  if (assetLinks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Not yet linked to any assets or generations.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {assetLinks.map((link) => (
        <div key={link.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-secondary/30">
          <LinkIcon className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">
            Linked to <strong>{link.target_name}</strong> ({link.target_type})
          </span>
        </div>
      ))}
    </div>
  );
}
