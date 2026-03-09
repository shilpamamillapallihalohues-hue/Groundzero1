import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Palette, Lock, Unlock, Sparkles, Loader2, 
  Sun, Droplets, Camera, Layers 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LookLockProfile, ColorPaletteItem } from '@/types/pipeline';

interface LookDevPanelProps {
  projectId: string;
}

interface ConceptArt {
  id: string;
  title: string;
  image_url?: string;
  is_approved: boolean;
}

export function LookDevPanel({ projectId }: LookDevPanelProps) {
  const [profiles, setProfiles] = useState<LookLockProfile[]>([]);
  const [conceptArts, setConceptArts] = useState<ConceptArt[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, conceptsRes] = await Promise.all([
        supabase
          .from('look_lock_profiles')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('concept_arts')
          .select('id, title, image_url, is_approved')
          .eq('project_id', projectId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (conceptsRes.error) throw conceptsRes.error;

      setProfiles(profilesRes.data as unknown as LookLockProfile[] || []);
      setConceptArts(conceptsRes.data || []);
    } catch (error) {
      console.error('Error loading look dev data:', error);
      toast.error('Failed to load look development data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractProfile = async () => {
    if (selectedConcepts.length === 0) {
      toast.error('Select at least one approved concept art');
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-look-profile', {
        body: {
          conceptArtIds: selectedConcepts,
          projectId,
          profileName: profileName || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Save to database
      const { error: saveError } = await supabase.from('look_lock_profiles').insert({
        project_id: projectId,
        name: data.suggestedName,
        color_palette: data.lookProfile.colorPalette,
        lighting_logic: data.lookProfile.lightingLogic,
        material_behavior: data.lookProfile.materialBehavior,
        scale_proportions: data.lookProfile.scaleProportions,
        camera_contrast: data.lookProfile.cameraContrast,
        source_concept_ids: selectedConcepts,
      });

      if (saveError) throw saveError;

      toast.success('Look profile extracted successfully!');
      setSelectedConcepts([]);
      setProfileName('');
      loadData();
    } catch (error) {
      console.error('Error extracting profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract profile');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleLock = async (profileId: string, isLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('look_lock_profiles')
        .update({ 
          is_locked: !isLocked,
          locked_at: !isLocked ? new Date().toISOString() : null,
        })
        .eq('id', profileId);

      if (error) throw error;
      toast.success(isLocked ? 'Profile unlocked' : 'Profile locked');
      loadData();
    } catch (error) {
      toast.error('Failed to update lock status');
    }
  };

  const toggleConceptSelection = (id: string) => {
    setSelectedConcepts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Extract New Profile */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Extract Look Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Select approved concept arts to extract visual DNA
            </p>
            <Input
              placeholder="Profile name (optional)"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="mb-3"
            />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conceptArts.length > 0 ? (
                conceptArts.map(concept => (
                  <label
                    key={concept.id}
                    className="flex items-center gap-3 p-2 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedConcepts.includes(concept.id)}
                      onCheckedChange={() => toggleConceptSelection(concept.id)}
                    />
                    {concept.image_url && (
                      <img
                        src={concept.image_url}
                        alt={concept.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <span className="text-sm truncate">{concept.title}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No approved concept arts yet
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleExtractProfile}
            disabled={isExtracting || selectedConcepts.length === 0}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Palette className="mr-2 h-4 w-4" />
                Extract Visual DNA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Profiles */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-semibold text-lg">Look Lock Profiles</h3>
        {profiles.length > 0 ? (
          profiles.map(profile => (
            <Card key={profile.id} className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{profile.name}</h4>
                      {profile.is_locked && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      From {profile.source_concept_ids?.length || 0} concept art(s)
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLock(profile.id, profile.is_locked)}
                  >
                    {profile.is_locked ? (
                      <Unlock className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Color Palette */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Color Palette
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {(profile.color_palette as ColorPaletteItem[])?.slice(0, 6).map((color, i) => (
                      <div
                        key={i}
                        className="group relative"
                      >
                        <div
                          className="w-8 h-8 rounded border border-border"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded whitespace-nowrap">
                          {color.name}: {color.hex}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Sun className="h-3 w-3" />
                      Lighting
                    </p>
                    <p className="capitalize">
                      {(profile.lighting_logic as any)?.keyLightDirection || 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Droplets className="h-3 w-3" />
                      Materials
                    </p>
                    <p className="capitalize">
                      {(profile.material_behavior as any)?.textureStyle || 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Camera className="h-3 w-3" />
                      Contrast
                    </p>
                    <p className="capitalize">
                      {(profile.camera_contrast as any)?.dynamicRange || 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Layers className="h-3 w-3" />
                      Scale
                    </p>
                    <p className="capitalize">
                      {(profile.scale_proportions as any)?.environmentScale || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="py-8 text-center text-muted-foreground">
              No look profiles yet. Extract one from approved concept art.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
