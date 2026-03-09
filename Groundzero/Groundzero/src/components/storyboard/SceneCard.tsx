import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Sun, Moon, Clapperboard, CheckCircle2, Film, Users, Sparkles, Camera, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneCardProps {
  scene: any;
  shots: any[];
  onClick: () => void;
}

const SUGGESTED_BREAKDOWN = [
  { type: 'Establishing Shot', icon: '🎬' },
  { type: 'Medium Shot', icon: '📷' },
  { type: 'Close Up', icon: '🔍' },
  { type: 'Reaction Shot', icon: '😮' },
  { type: 'Over Shoulder', icon: '🎥' },
  { type: 'Insert Shot', icon: '✋' },
  { type: 'Wide Shot', icon: '🌄' },
  { type: 'Tracking Shot', icon: '🚶' },
];

export function SceneCard({ scene, shots, onClick }: SceneCardProps) {
  const approvedCount = shots.filter((s: any) => s.review_status === 'approved').length;
  const status = shots.length === 0 ? 'draft' : approvedCount === shots.length ? 'approved' : 'in_progress';
  const previewShots = shots.filter((s: any) => s.image_url).slice(0, 5);
  const characters = (scene.characters as string[] | null) || [];
  const description = scene.description || '';
  const estimatedShots = Math.max(3, Math.min(8, Math.ceil((description.length || 100) / 80)));

  // Generate suggested shot types based on scene content
  const suggestedTypes = SUGGESTED_BREAKDOWN.slice(0, estimatedShots);

  const statusConfig = {
    draft: { label: 'Draft', class: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
    in_progress: { label: 'In Progress', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
    approved: { label: 'Approved', class: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  };

  const st = statusConfig[status];

  return (
    <Card
      className="group overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-300 hover:shadow-lg"
      onClick={onClick}
    >
      {/* Scene Header Strip */}
      <div className="px-4 py-3 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
            SC {scene.scene_number}
          </span>
          <h3 className="font-semibold text-sm truncate">{scene.slugline}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
          <Badge className={cn('text-[9px] border shrink-0', st.class)}>{st.label}</Badge>
        </div>
      </div>

      {/* Shot Strip Preview or Production Planning */}
      <div className="h-36 bg-muted/30 relative overflow-hidden">
        {previewShots.length > 0 ? (
          <div className="flex h-full">
            {previewShots.map((shot: any) => (
              <div
                key={shot.id}
                className="h-full flex-1 min-w-0 relative border-r border-background/20 last:border-r-0"
              >
                <img src={shot.image_url} alt={shot.shot_number} className="w-full h-full object-cover" />
                {shot.review_status === 'approved' && (
                  <CheckCircle2 className="absolute top-1 right-1 h-3 w-3 text-green-400 drop-shadow-md" />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-0.5">
                  <span className="text-[8px] text-white/80 font-medium">{shot.shot_number}</span>
                  {shot.camera_angle && (
                    <span className="text-[7px] text-white/50 ml-1">{shot.camera_angle}</span>
                  )}
                </div>
              </div>
            ))}
            {shots.length > 5 && (
              <div className="h-full w-16 shrink-0 bg-muted/60 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-medium">+{shots.length - 5}</span>
              </div>
            )}
          </div>
        ) : (
          /* Professional Shot Breakdown Placeholder */
          <div className="w-full h-full flex flex-col p-3 gap-2">
            {/* Scene description preview */}
            <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">
              {description || 'No scene description. Run Scene Intelligence to analyze.'}
            </p>
            
            {/* Suggested shot breakdown */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Suggested Shot Breakdown ({estimatedShots} shots)
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestedTypes.map((st, i) => (
                  <span
                    key={i}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-muted border border-border/50 text-muted-foreground"
                  >
                    {st.icon} {st.type}
                  </span>
                ))}
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Film className="h-3 w-3 text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground">Ready for storyboarding</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-[9px] px-2 text-primary hover:text-primary"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <Sparkles className="h-2.5 w-2.5 mr-1" />Generate
              </Button>
            </div>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium tracking-wide">Open Scene Workspace →</span>
        </div>
      </div>

      {/* Scene Meta */}
      <CardContent className="p-3 space-y-2">
        {/* Location & Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {scene.location && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="h-2.5 w-2.5 shrink-0" />{scene.location}
              </span>
            )}
            {scene.time_of_day && (
              <span className="flex items-center gap-1">
                {scene.time_of_day?.toLowerCase().includes('night') ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                {scene.time_of_day}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Clapperboard className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-semibold">{shots.length}</span>
            <span className="text-muted-foreground">shot{shots.length !== 1 ? 's' : ''}</span>
            {approvedCount > 0 && (
              <span className="text-green-500 ml-1">({approvedCount} ✓)</span>
            )}
          </div>
        </div>

        {/* Characters in scene */}
        {characters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Users className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
            {characters.slice(0, 4).map((c: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{c}</Badge>
            ))}
            {characters.length > 4 && (
              <span className="text-[8px] text-muted-foreground">+{characters.length - 4}</span>
            )}
          </div>
        )}

        {/* Shot approval progress bar */}
        {shots.length > 0 && (
          <div className="space-y-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${shots.length > 0 ? (approvedCount / shots.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
