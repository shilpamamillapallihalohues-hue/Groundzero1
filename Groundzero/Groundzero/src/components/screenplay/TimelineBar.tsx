 import { useMemo } from 'react';
 import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { 
   Clock, Film, Users, Zap, AlertTriangle, 
   CheckCircle, Lock, Bookmark
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface SceneMarker {
   id: string;
   sceneNumber: string;
   slugline: string;
   pageStart: number;
   pageEnd: number;
   duration: number; // in minutes
   characters: string[];
   isLocked?: boolean;
   isApproved?: boolean;
   beatTag?: string;
   hasVFX?: boolean;
 }
 
 interface TimelineBarProps {
   scenes: SceneMarker[];
   totalPages: number;
   totalRuntime: number; // in minutes
   currentPage?: number;
   selectedSceneId?: string;
   onSceneClick?: (sceneId: string) => void;
   onPageClick?: (page: number) => void;
 }
 
 const PAGES_PER_MINUTE = 1; // Industry standard: 1 page ≈ 1 minute
 
 export function TimelineBar({
   scenes,
   totalPages,
   totalRuntime,
   currentPage = 1,
   selectedSceneId,
   onSceneClick,
   onPageClick,
 }: TimelineBarProps) {
   // Generate page markers (every 10 pages)
   const pageMarkers = useMemo(() => {
     const markers: number[] = [];
     for (let i = 1; i <= totalPages; i += 10) {
       markers.push(i);
     }
     if (markers[markers.length - 1] !== totalPages) {
       markers.push(totalPages);
     }
     return markers;
   }, [totalPages]);
 
   // Generate time markers (every 15 minutes)
   const timeMarkers = useMemo(() => {
     const markers: number[] = [];
     for (let i = 0; i <= totalRuntime; i += 15) {
       markers.push(i);
     }
     return markers;
   }, [totalRuntime]);
 
   const getSceneWidth = (scene: SceneMarker) => {
     const pages = scene.pageEnd - scene.pageStart + 1;
     return (pages / totalPages) * 100;
   };
 
   const getScenePosition = (scene: SceneMarker) => {
     return ((scene.pageStart - 1) / totalPages) * 100;
   };
 
   const formatTime = (minutes: number) => {
     const hrs = Math.floor(minutes / 60);
     const mins = minutes % 60;
     if (hrs > 0) {
       return `${hrs}h ${mins}m`;
     }
     return `${mins}m`;
   };
 
   return (
     <div className="w-full border-b bg-muted/30">
       {/* Runtime Display */}
       <div className="flex items-center justify-between px-4 py-2 border-b">
         <div className="flex items-center gap-4 text-sm">
           <div className="flex items-center gap-1">
             <Film className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">{totalPages} pages</span>
           </div>
           <div className="flex items-center gap-1">
             <Clock className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">{formatTime(totalRuntime)}</span>
           </div>
           <div className="flex items-center gap-1">
             <Users className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">{scenes.length} scenes</span>
           </div>
         </div>
 
         {/* Legend */}
         <div className="flex items-center gap-3 text-xs">
           <div className="flex items-center gap-1">
             <div className="w-3 h-3 rounded bg-primary" />
             <span>Current</span>
           </div>
           <div className="flex items-center gap-1">
             <Lock className="h-3 w-3 text-amber-500" />
             <span>Locked</span>
           </div>
           <div className="flex items-center gap-1">
             <CheckCircle className="h-3 w-3 text-green-500" />
             <span>Approved</span>
           </div>
           <div className="flex items-center gap-1">
             <Zap className="h-3 w-3 text-purple-500" />
             <span>VFX</span>
           </div>
         </div>
       </div>
 
       {/* Timeline Track */}
       <ScrollArea className="w-full">
         <div className="px-4 py-3" style={{ minWidth: Math.max(800, totalPages * 8) }}>
           {/* Time markers */}
           <div className="relative h-4 mb-2">
             {timeMarkers.map((time) => (
               <div
                 key={time}
                 className="absolute text-[10px] text-muted-foreground font-mono transform -translate-x-1/2"
                 style={{ left: `${(time / totalRuntime) * 100}%` }}
               >
                 {formatTime(time)}
               </div>
             ))}
           </div>
 
           {/* Scene blocks */}
           <TooltipProvider>
             <div className="relative h-12 bg-muted/50 rounded-lg overflow-hidden">
               {/* Current position indicator */}
               <div
                 className="absolute top-0 bottom-0 w-0.5 bg-primary z-20"
                 style={{ left: `${((currentPage - 1) / totalPages) * 100}%` }}
               />
 
               {scenes.map((scene) => (
                 <Tooltip key={scene.id}>
                   <TooltipTrigger asChild>
                     <div
                       className={cn(
                         'absolute top-1 bottom-1 rounded cursor-pointer transition-all hover:brightness-110',
                         selectedSceneId === scene.id && 'ring-2 ring-primary ring-offset-1',
                         scene.isApproved ? 'bg-green-500/80' : 
                         scene.isLocked ? 'bg-amber-500/80' : 
                         scene.hasVFX ? 'bg-purple-500/80' : 'bg-secondary'
                       )}
                       style={{
                         left: `${getScenePosition(scene)}%`,
                         width: `${Math.max(getSceneWidth(scene), 0.5)}%`,
                       }}
                       onClick={() => onSceneClick?.(scene.id)}
                     >
                       {/* Scene number if wide enough */}
                       {getSceneWidth(scene) > 3 && (
                         <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white truncate px-1">
                           {scene.sceneNumber}
                         </span>
                       )}
 
                       {/* Status icons */}
                       <div className="absolute -top-1 -right-1 flex gap-0.5">
                         {scene.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                         {scene.isApproved && <CheckCircle className="h-3 w-3 text-green-500" />}
                       </div>
                     </div>
                   </TooltipTrigger>
                   <TooltipContent>
                     <div className="space-y-1">
                       <p className="font-bold">Scene {scene.sceneNumber}</p>
                       <p className="text-xs">{scene.slugline}</p>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <span>p.{scene.pageStart}-{scene.pageEnd}</span>
                         <span>•</span>
                         <span>{scene.duration}min</span>
                       </div>
                       {scene.beatTag && (
                         <Badge variant="outline" className="text-[10px]">
                           <Bookmark className="h-3 w-3 mr-1" />
                           {scene.beatTag}
                         </Badge>
                       )}
                       {scene.characters.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-1">
                           {scene.characters.slice(0, 4).map((char, i) => (
                             <Badge key={i} variant="secondary" className="text-[10px]">
                               {char}
                             </Badge>
                           ))}
                         </div>
                       )}
                     </div>
                   </TooltipContent>
                 </Tooltip>
               ))}
             </div>
           </TooltipProvider>
 
           {/* Page markers */}
           <div className="relative h-4 mt-2">
             {pageMarkers.map((page) => (
               <div
                 key={page}
                 className="absolute text-[10px] text-muted-foreground font-mono transform -translate-x-1/2 cursor-pointer hover:text-primary"
                 style={{ left: `${((page - 1) / totalPages) * 100}%` }}
                 onClick={() => onPageClick?.(page)}
               >
                 {page}
               </div>
             ))}
           </div>
         </div>
         <ScrollBar orientation="horizontal" />
       </ScrollArea>
     </div>
   );
 }