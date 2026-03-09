import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Flag, Clock, ChevronRight, 
  Eye, Check, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DirectorPriorityQueueProps {
  projectId: string;
}

interface PriorityConcept {
  id: string;
  title: string;
  image_url: string | null;
  concept_type: string;
  is_priority: boolean;
  priority_reason: string | null;
  review_status: string | null;
  created_at: string;
}

export function DirectorPriorityQueue({ projectId }: DirectorPriorityQueueProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: priorityConcepts, isLoading } = useQuery({
    queryKey: ['priority-concepts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, is_priority, priority_reason, review_status, created_at')
        .eq('project_id', projectId)
        .eq('is_priority', true)
        .in('review_status', ['pending', 'pending_review', 'pending_approval'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as PriorityConcept[];
    },
    enabled: !!projectId
  });

  // Also get oldest pending items as implicit priority
  const { data: oldestPending } = useQuery({
    queryKey: ['oldest-pending-concepts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, is_priority, priority_reason, review_status, created_at')
        .eq('project_id', projectId)
        .in('review_status', ['pending', 'pending_review', 'pending_approval'])
        .eq('is_priority', false)
        .order('created_at', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data as PriorityConcept[];
    },
    enabled: !!projectId
  });

  const removePriority = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ is_priority: false, priority_reason: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priority-concepts', projectId] });
      toast.success('Removed from priority');
    }
  });

  const allPriorityItems = [
    ...(priorityConcepts || []).map(c => ({ ...c, isPriority: true })),
    ...(oldestPending || []).map(c => ({ ...c, isPriority: false }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold">Priority Queue</h2>
          <Badge variant="destructive">{priorityConcepts?.length || 0}</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      ) : allPriorityItems.length > 0 ? (
        <div className="space-y-3">
          {/* Explicit priority items */}
          {priorityConcepts && priorityConcepts.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Flagged as Urgent
              </p>
              {priorityConcepts.map(concept => (
                <Card 
                  key={concept.id} 
                  className="border-amber-500/50 bg-amber-500/5 cursor-pointer hover:border-amber-500 transition-colors"
                  onClick={() => navigate('/director/preprod/concept-review')}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {concept.image_url ? (
                        <img 
                          src={concept.image_url} 
                          alt={concept.title}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                          <Flag className="h-5 w-5 text-amber-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Flag className="h-3 w-3 text-amber-500" />
                          <p className="font-medium text-sm truncate">{concept.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{concept.concept_type}</p>
                        {concept.priority_reason && (
                          <p className="text-xs text-amber-400 mt-1">{concept.priority_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePriority.mutate(concept.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Oldest pending items */}
          {oldestPending && oldestPending.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-4">
                Waiting Longest
              </p>
              {oldestPending.map(concept => (
                <Card 
                  key={concept.id} 
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate('/director/preprod/concept-review')}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {concept.image_url ? (
                        <img 
                          src={concept.image_url} 
                          alt={concept.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{concept.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Waiting since {format(new Date(concept.created_at), 'MMM d')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Check className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <p className="text-sm text-muted-foreground">No priority items</p>
            <p className="text-xs text-muted-foreground mt-1">
              All concepts are up to date
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
