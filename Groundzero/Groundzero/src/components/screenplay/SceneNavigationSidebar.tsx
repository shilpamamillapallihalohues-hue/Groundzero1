import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Film, Lock, CheckCircle, AlertCircle, Users, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneInfo {
  id: string;
  sceneNumber: string;
  slugline: string;
  description?: string;
  location?: string;
  timeOfDay?: string;
  characters: string[];
  pageStart?: number;
  pageEnd?: number;
  isLocked?: boolean;
  isApproved?: boolean;
  status?: "draft" | "review" | "approved" | "locked";
  beatTag?: string;
}

interface SceneNavigationSidebarProps {
  scenes: SceneInfo[];
  selectedSceneId?: string | null;
  onSceneSelect: (sceneId: string) => void;
  onSceneLock?: (sceneId: string) => void;
  isReadOnly?: boolean;
  highlightedSceneIds?: Set<string>;
}

export function SceneNavigationSidebar({
  scenes,
  selectedSceneId,
  onSceneSelect,
  onSceneLock,
  isReadOnly,
  highlightedSceneIds,
}: SceneNavigationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Natural numeric sort helper: "1" < "2" < "10" < "12.B" < "12.C"
  const naturalSortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => {
      const parseSceneNum = (s: string) => {
        const match = s.match(/^(-?\d+)(\.?\s*[A-Za-z]*)$/);
        if (!match) return { num: Infinity, suffix: s };
        return { num: parseFloat(match[1]), suffix: match[2] || '' };
      };
      const aNum = parseSceneNum(a.sceneNumber || '');
      const bNum = parseSceneNum(b.sceneNumber || '');
      if (aNum.num !== bNum.num) return aNum.num - bNum.num;
      return aNum.suffix.localeCompare(bNum.suffix);
    });
  }, [scenes]);

  const filteredScenes = naturalSortedScenes.filter((scene) => {
    const matchesSearch =
      scene.slugline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.sceneNumber?.includes(searchQuery) ||
      scene.characters?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = !filterStatus || scene.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (scene: SceneInfo) => {
    if (scene.isLocked) return "border-amber-500/60 bg-amber-500/5";
    if (scene.isApproved) return "border-green-500/60 bg-green-500/5";
    if (scene.status === "review") return "border-blue-500/60 bg-blue-500/5";
    return "border-border";
  };

  const getStatusIcon = (scene: SceneInfo) => {
    if (scene.isLocked) return <Lock className="h-3 w-3 text-amber-500" />;
    if (scene.isApproved) return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (scene.status === "review") return <AlertCircle className="h-3 w-3 text-blue-500" />;
    return null;
  };

  const stats = {
    total: scenes.length,
    approved: scenes.filter((s) => s.isApproved).length,
    locked: scenes.filter((s) => s.isLocked).length,
    draft: scenes.filter((s) => !s.isApproved && !s.isLocked).length,
  };

  return (
    <div className="h-full flex flex-col border-r bg-background">
      {/* Header */}
      <div className="p-2.5 border-b space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
            <Film className="h-3.5 w-3.5" />
            Scenes
          </h3>
          <Badge variant="outline" className="text-[10px] h-5">{scenes.length}</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search scenes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-1 text-center">
          <button
            className={cn("p-1 rounded text-xs transition-colors", !filterStatus && "bg-primary/10 text-primary")}
            onClick={() => setFilterStatus(null)}
          >
            <p className="font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">All</p>
          </button>
          <button
            className={cn(
              "p-1 rounded text-xs transition-colors",
              filterStatus === "approved" && "bg-green-500/10 text-green-500",
            )}
            onClick={() => setFilterStatus(filterStatus === "approved" ? null : "approved")}
          >
            <p className="font-bold text-green-500">{stats.approved}</p>
            <p className="text-[10px] text-muted-foreground">Done</p>
          </button>
          <button
            className={cn(
              "p-1 rounded text-xs transition-colors",
              filterStatus === "locked" && "bg-amber-500/10 text-amber-500",
            )}
            onClick={() => setFilterStatus(filterStatus === "locked" ? null : "locked")}
          >
            <p className="font-bold text-amber-500">{stats.locked}</p>
            <p className="text-[10px] text-muted-foreground">Locked</p>
          </button>
          <button
            className={cn(
              "p-1 rounded text-xs transition-colors",
              filterStatus === "draft" && "bg-muted text-muted-foreground",
            )}
            onClick={() => setFilterStatus(filterStatus === "draft" ? null : "draft")}
          >
            <p className="font-bold">{stats.draft}</p>
            <p className="text-[10px] text-muted-foreground">Draft</p>
          </button>
        </div>
      </div>

      {/* Scene List - Single column, larger tiles */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filteredScenes.map((scene) => {
            const isHighlighted = highlightedSceneIds?.has(scene.id);
            return (
            <button
              key={scene.id}
              className={cn(
                "w-full text-left p-2.5 rounded-md border transition-all group",
                getStatusColor(scene),
                selectedSceneId === scene.id
                  ? "ring-1 ring-primary bg-primary/10 border-primary"
                  : isHighlighted
                    ? "ring-1 ring-amber-400/70 bg-amber-500/10 border-amber-400/50"
                    : "hover:bg-muted/50 hover:border-muted-foreground/20",
              )}
              onClick={() => onSceneSelect(scene.id)}
            >
              {/* Scene number & status */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                    selectedSceneId === scene.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  Sc {scene.sceneNumber || "—"}
                </span>
                {getStatusIcon(scene)}
              </div>

              {/* Slugline */}
              <p className="text-xs font-semibold leading-tight mb-1.5 line-clamp-2">
                {scene.slugline || "Untitled"}
              </p>

              {/* Description */}
              {scene.description && (
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5 line-clamp-2">
                  {scene.description}
                </p>
              )}

              {/* Location & Time */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                {scene.location && (
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                    {scene.location}
                  </span>
                )}
                {scene.timeOfDay && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                    {scene.timeOfDay}
                  </span>
                )}
              </div>

              {/* Characters */}
              {scene.characters && scene.characters.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">
                    {scene.characters.slice(0, 3).join(", ")}
                    {scene.characters.length > 3 && ` +${scene.characters.length - 3}`}
                  </span>
                </div>
              )}

              {/* Beat tag */}
              {scene.beatTag && (
                <Badge
                  variant={selectedSceneId === scene.id ? "secondary" : "outline"}
                  className="mt-2 text-[10px] h-5"
                >
                  {scene.beatTag}
                </Badge>
              )}
            </button>
            );
          })}

          {filteredScenes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No scenes found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
