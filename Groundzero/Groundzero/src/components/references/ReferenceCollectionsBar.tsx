
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COLLECTION_TYPES, ReferenceCollection } from './types';
import { cn } from '@/lib/utils';

interface ReferenceCollectionsBarProps {
  projectId: string;
  activeCollectionId: string | null;
  onCollectionChange: (id: string | null) => void;
}

export default function ReferenceCollectionsBar({ projectId, activeCollectionId, onCollectionChange }: ReferenceCollectionsBarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('custom');
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['reference-collections', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reference_collections')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ReferenceCollection[];
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('reference_collections').insert({
        project_id: projectId,
        name: newName.trim(),
        description: newDesc.trim() || null,
        collection_type: newType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-collections', projectId] });
      toast.success('Collection created');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewType('custom');
    },
    onError: () => toast.error('Failed to create collection'),
  });

  return (
    <>
      <div className="flex items-center gap-2">
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-2 pb-1">
            <Button
              variant={activeCollectionId === null ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 h-8 text-xs gap-1.5"
              onClick={() => onCollectionChange(null)}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              All
            </Button>
            {collections.map((col) => (
              <Button
                key={col.id}
                variant={activeCollectionId === col.id ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-8 text-xs gap-1.5"
                onClick={() => onCollectionChange(col.id)}
              >
                {col.name}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Collection
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>Organize references into themed collections.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Character References" className="bg-secondary/30" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-secondary/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLLECTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description..." className="bg-secondary/30 min-h-[60px]" rows={2} />
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
