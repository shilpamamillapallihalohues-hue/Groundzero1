import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tag, Plus, X, User, MapPin, Package, Shirt, Clapperboard, Video,
  Link as LinkIcon, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AssetReferenceLink {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_name: string;
  target_id?: string;
  created_at: string;
}

interface AssetTaggingPanelProps {
  projectId: string;
  sourceType: 'deliverable' | 'reference_image' | 'concept_art';
  sourceId: string;
  sourceName: string;
  compact?: boolean;
  onTagsChanged?: () => void;
}

const TARGET_TYPES = [
  { value: 'character', label: 'Character', icon: User },
  { value: 'prop', label: 'Prop', icon: Package },
  { value: 'location', label: 'Location', icon: MapPin },
  { value: 'costume', label: 'Costume', icon: Shirt },
  { value: 'scene', label: 'Scene', icon: Clapperboard },
  { value: 'shot', label: 'Shot', icon: Video },
];

export function AssetTaggingPanel({
  projectId,
  sourceType,
  sourceId,
  sourceName,
  compact = false,
  onTagsChanged,
}: AssetTaggingPanelProps) {
  const [links, setLinks] = useState<AssetReferenceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetType, setTargetType] = useState('character');
  const [targetName, setTargetName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLinks();
  }, [sourceId]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_reference_links')
        .select('*')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading asset links:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load suggestions based on target type and existing data
  const loadSuggestions = async (type: string) => {
    try {
      let suggestionsData: string[] = [];

      if (type === 'character') {
        // Get from character_proxies
        const { data } = await supabase
          .from('character_proxies')
          .select('name')
          .eq('project_id', projectId);
        suggestionsData = data?.map(c => c.name) || [];
      } else if (type === 'scene') {
        // Get from scenes
        const { data } = await supabase
          .from('scenes')
          .select('slugline')
          .eq('project_id', projectId);
        suggestionsData = data?.map(s => s.slugline).filter(Boolean) as string[] || [];
      } else if (type === 'location') {
        // Get from existing links
        const { data } = await supabase
          .from('asset_reference_links')
          .select('target_name')
          .eq('project_id', projectId)
          .eq('target_type', 'location');
        suggestionsData = [...new Set(data?.map(l => l.target_name) || [])];
      } else if (type === 'prop') {
        // Get from existing links with prop type
        const { data } = await supabase
          .from('asset_reference_links')
          .select('target_name')
          .eq('project_id', projectId)
          .eq('target_type', 'prop');
        suggestionsData = [...new Set(data?.map(l => l.target_name) || [])];
      } else if (type === 'costume') {
        const { data } = await supabase
          .from('character_costumes')
          .select('costume_name')
          .eq('project_id', projectId);
        suggestionsData = data?.map(c => c.costume_name) || [];
      }

      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      loadSuggestions(targetType);
    }
  }, [targetType, dialogOpen]);

  const addLink = async () => {
    if (!targetName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .single();

      const { error } = await supabase
        .from('asset_reference_links')
        .insert({
          project_id: projectId,
          source_type: sourceType,
          source_id: sourceId,
          target_type: targetType,
          target_name: targetName.trim(),
          created_by: profile?.id,
        });

      if (error) throw error;

      toast.success(`Linked to ${targetName}`);
      setDialogOpen(false);
      setTargetName('');
      loadLinks();
      onTagsChanged?.();
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Failed to add link');
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('asset_reference_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Link removed');
      loadLinks();
      onTagsChanged?.();
    } catch (error) {
      console.error('Error removing link:', error);
      toast.error('Failed to remove link');
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = TARGET_TYPES.find(t => t.value === type);
    if (!typeConfig) return Tag;
    return typeConfig.icon;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'character': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'prop': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'location': return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
      case 'costume': return 'bg-pink-500/20 text-pink-500 border-pink-500/50';
      case 'scene': return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
      case 'shot': return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {links.map((link) => {
          const Icon = getTypeIcon(link.target_type);
          return (
            <Badge 
              key={link.id} 
              className={cn("text-xs gap-1 pr-1", getTypeColor(link.target_type))}
            >
              <Icon className="h-3 w-3" />
              {link.target_name}
              <button 
                onClick={() => removeLink(link.id)}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          );
        })}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tag Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Asset Type</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input 
                  value={targetName} 
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder={`Enter ${targetType} name`}
                />
                {suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.slice(0, 8).map((suggestion) => (
                        <Badge 
                          key={suggestion}
                          variant="outline"
                          className="cursor-pointer text-xs hover:bg-primary/10"
                          onClick={() => setTargetName(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={addLink} disabled={saving}>
                {saving ? 'Adding...' : 'Add Tag'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Asset Tags
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tag "{sourceName}" to Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Asset Type</Label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={targetName} 
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder={`Enter ${targetType} name`}
                  />
                  {suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Existing in project:</p>
                      <ScrollArea className="h-24">
                        <div className="flex flex-wrap gap-1">
                          {suggestions.map((suggestion) => (
                            <Badge 
                              key={suggestion}
                              variant="outline"
                              className={cn(
                                "cursor-pointer text-xs",
                                targetName === suggestion ? "bg-primary/20 border-primary" : "hover:bg-muted"
                              )}
                              onClick={() => setTargetName(suggestion)}
                            >
                              {targetName === suggestion && <Check className="h-3 w-3 mr-1" />}
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={addLink} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Tag'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : links.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No tags yet. Add tags to link this asset to characters, props, scenes, etc.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {links.map((link) => {
              const Icon = getTypeIcon(link.target_type);
              return (
                <Badge 
                  key={link.id} 
                  className={cn("gap-1.5 pr-1", getTypeColor(link.target_type))}
                >
                  <Icon className="h-3 w-3" />
                  <span className="text-xs font-medium">{link.target_name}</span>
                  <button 
                    onClick={() => removeLink(link.id)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
