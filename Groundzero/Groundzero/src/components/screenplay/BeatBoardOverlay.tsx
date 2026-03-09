 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { 
   Bookmark, Target, Compass, Star, Triangle, 
   ArrowRight, CheckCircle, Circle, AlertCircle
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 export type BeatStructure = 'save_the_cat' | 'heros_journey' | 'seven_point';
 
 interface Beat {
   id: string;
   name: string;
   description: string;
   pageRange: string;
   percentage: number;
   status: 'mapped' | 'partial' | 'missing';
   sceneIds?: string[];
 }
 
 interface BeatBoardOverlayProps {
   structure: BeatStructure;
   onStructureChange: (structure: BeatStructure) => void;
   beats: Beat[];
   onBeatClick?: (beatId: string) => void;
   totalPages: number;
   onAssignScene?: (beatId: string) => void;
 }
 
 const STRUCTURE_DEFINITIONS: Record<BeatStructure, { name: string; icon: React.ReactNode; beats: Omit<Beat, 'status' | 'sceneIds'>[] }> = {
   save_the_cat: {
     name: 'Save the Cat',
     icon: <Star className="h-4 w-4" />,
     beats: [
       { id: 'opening_image', name: 'Opening Image', description: 'The first impression of the story world', pageRange: '1', percentage: 1 },
       { id: 'theme_stated', name: 'Theme Stated', description: 'A character states the theme (often to protagonist)', pageRange: '5', percentage: 5 },
       { id: 'setup', name: 'Set-Up', description: 'Introduce protagonist, stakes, and the world before change', pageRange: '1-10', percentage: 10 },
       { id: 'catalyst', name: 'Catalyst', description: 'The inciting incident that disrupts the status quo', pageRange: '12', percentage: 12 },
       { id: 'debate', name: 'Debate', description: 'Protagonist questions whether to take the journey', pageRange: '12-25', percentage: 17 },
       { id: 'break_into_two', name: 'Break into Two', description: 'Protagonist commits to the journey', pageRange: '25', percentage: 25 },
       { id: 'b_story', name: 'B Story', description: 'The love story or secondary plot begins', pageRange: '30', percentage: 30 },
       { id: 'fun_and_games', name: 'Fun and Games', description: 'The promise of the premise is delivered', pageRange: '30-55', percentage: 42 },
       { id: 'midpoint', name: 'Midpoint', description: 'False victory or false defeat; stakes are raised', pageRange: '55', percentage: 55 },
       { id: 'bad_guys_close_in', name: 'Bad Guys Close In', description: 'Opposition strengthens, team fractures', pageRange: '55-75', percentage: 65 },
       { id: 'all_is_lost', name: 'All Is Lost', description: 'The lowest point; often a death (literal or metaphorical)', pageRange: '75', percentage: 75 },
       { id: 'dark_night', name: 'Dark Night of the Soul', description: 'Protagonist wallows in despair', pageRange: '75-85', percentage: 80 },
       { id: 'break_into_three', name: 'Break into Three', description: 'Solution found through A and B stories merging', pageRange: '85', percentage: 85 },
       { id: 'finale', name: 'Finale', description: 'Protagonist confronts opposition and wins', pageRange: '85-110', percentage: 92 },
       { id: 'final_image', name: 'Final Image', description: 'Mirror of opening; shows transformation', pageRange: '110', percentage: 100 },
     ],
   },
   heros_journey: {
     name: "Hero's Journey",
     icon: <Compass className="h-4 w-4" />,
     beats: [
       { id: 'ordinary_world', name: 'Ordinary World', description: 'Hero in their normal environment', pageRange: '1-12', percentage: 10 },
       { id: 'call_to_adventure', name: 'Call to Adventure', description: 'Hero receives invitation to change', pageRange: '12-17', percentage: 15 },
       { id: 'refusal', name: 'Refusal of the Call', description: 'Hero hesitates or refuses', pageRange: '17-25', percentage: 22 },
       { id: 'meeting_mentor', name: 'Meeting the Mentor', description: 'Hero gains guidance or tools', pageRange: '25-30', percentage: 27 },
       { id: 'crossing_threshold', name: 'Crossing the Threshold', description: 'Hero enters the special world', pageRange: '30', percentage: 30 },
       { id: 'tests_allies', name: 'Tests, Allies, Enemies', description: 'Hero learns the rules of the new world', pageRange: '30-55', percentage: 45 },
       { id: 'approach', name: 'Approach to Inmost Cave', description: 'Hero prepares for major challenge', pageRange: '55-60', percentage: 55 },
       { id: 'ordeal', name: 'Ordeal', description: 'Hero faces death or greatest fear', pageRange: '60-65', percentage: 60 },
       { id: 'reward', name: 'Reward (Seizing the Sword)', description: 'Hero gains what they sought', pageRange: '65-75', percentage: 70 },
       { id: 'road_back', name: 'The Road Back', description: 'Hero begins journey home', pageRange: '75-85', percentage: 80 },
       { id: 'resurrection', name: 'Resurrection', description: 'Final test; hero is transformed', pageRange: '85-100', percentage: 92 },
       { id: 'return_elixir', name: 'Return with the Elixir', description: 'Hero returns transformed', pageRange: '100-110', percentage: 100 },
     ],
   },
   seven_point: {
     name: '7-Point Structure',
     icon: <Triangle className="h-4 w-4" />,
     beats: [
       { id: 'hook', name: 'Hook', description: 'Opposite state of resolution; grab attention', pageRange: '1-10', percentage: 8 },
       { id: 'plot_turn_1', name: 'Plot Turn 1', description: 'Introduce conflict; set story in motion', pageRange: '20-30', percentage: 25 },
       { id: 'pinch_1', name: 'Pinch Point 1', description: 'Apply pressure; force into action', pageRange: '37-45', percentage: 38 },
       { id: 'midpoint', name: 'Midpoint', description: 'Move from reaction to action', pageRange: '50-60', percentage: 50 },
       { id: 'pinch_2', name: 'Pinch Point 2', description: 'Apply more pressure; all seems lost', pageRange: '62-75', percentage: 62 },
       { id: 'plot_turn_2', name: 'Plot Turn 2', description: 'Final piece falls into place', pageRange: '75-85', percentage: 80 },
       { id: 'resolution', name: 'Resolution', description: 'Hero achieves (or fails) goal', pageRange: '100-110', percentage: 100 },
     ],
   },
 };
 
 export function BeatBoardOverlay({
   structure,
   onStructureChange,
   beats,
   onBeatClick,
   totalPages,
   onAssignScene,
 }: BeatBoardOverlayProps) {
   const structureDef = STRUCTURE_DEFINITIONS[structure];
   
   // Merge definition with actual beat data
   const mergedBeats = structureDef.beats.map(defBeat => {
     const actualBeat = beats.find(b => b.id === defBeat.id);
     return {
       ...defBeat,
       status: actualBeat?.status || 'missing',
       sceneIds: actualBeat?.sceneIds || [],
     };
   });
 
   const mappedCount = mergedBeats.filter(b => b.status === 'mapped').length;
   const partialCount = mergedBeats.filter(b => b.status === 'partial').length;
   const missingCount = mergedBeats.filter(b => b.status === 'missing').length;
 
   const getStatusIcon = (status: Beat['status']) => {
     switch (status) {
       case 'mapped': return <CheckCircle className="h-4 w-4 text-green-500" />;
       case 'partial': return <AlertCircle className="h-4 w-4 text-amber-500" />;
       case 'missing': return <Circle className="h-4 w-4 text-muted-foreground" />;
     }
   };
 
   const getStatusColor = (status: Beat['status']) => {
     switch (status) {
       case 'mapped': return 'bg-green-500';
       case 'partial': return 'bg-amber-500';
       case 'missing': return 'bg-muted';
     }
   };
 
   return (
     <div className="h-full flex flex-col">
       {/* Structure Selector */}
       <div className="p-4 border-b">
         <div className="flex items-center justify-between mb-3">
           <h3 className="font-semibold flex items-center gap-2">
             <Bookmark className="h-5 w-5 text-primary" />
             Beat Board
           </h3>
           <Select value={structure} onValueChange={(v) => onStructureChange(v as BeatStructure)}>
             <SelectTrigger className="w-[180px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {Object.entries(STRUCTURE_DEFINITIONS).map(([key, def]) => (
                 <SelectItem key={key} value={key}>
                   <div className="flex items-center gap-2">
                     {def.icon}
                     <span>{def.name}</span>
                   </div>
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* Progress Stats */}
         <div className="grid grid-cols-3 gap-2 text-center">
           <div className="bg-green-500/10 rounded p-2">
             <p className="text-lg font-bold text-green-500">{mappedCount}</p>
             <p className="text-xs text-muted-foreground">Mapped</p>
           </div>
           <div className="bg-amber-500/10 rounded p-2">
             <p className="text-lg font-bold text-amber-500">{partialCount}</p>
             <p className="text-xs text-muted-foreground">Partial</p>
           </div>
           <div className="bg-muted rounded p-2">
             <p className="text-lg font-bold text-muted-foreground">{missingCount}</p>
             <p className="text-xs text-muted-foreground">Missing</p>
           </div>
         </div>
       </div>
 
       {/* Timeline Progress Bar */}
       <div className="px-4 py-3 border-b">
         <div className="relative h-8 bg-muted rounded-full overflow-hidden">
           {mergedBeats.map((beat, idx) => (
             <div
               key={beat.id}
               className={cn(
                 'absolute top-0 h-full cursor-pointer hover:brightness-110 transition-all',
                 getStatusColor(beat.status)
               )}
               style={{
                 left: `${idx === 0 ? 0 : mergedBeats[idx - 1].percentage}%`,
                 width: `${beat.percentage - (idx === 0 ? 0 : mergedBeats[idx - 1].percentage)}%`,
               }}
               onClick={() => onBeatClick?.(beat.id)}
               title={beat.name}
             />
           ))}
         </div>
         <div className="flex justify-between mt-1 text-xs text-muted-foreground">
           <span>p.1</span>
           <span>p.{Math.floor(totalPages / 2)}</span>
           <span>p.{totalPages}</span>
         </div>
       </div>
 
       {/* Beat List */}
       <ScrollArea className="flex-1">
         <div className="p-4 space-y-2">
           {mergedBeats.map((beat, idx) => (
             <Card 
               key={beat.id}
               className={cn(
                 'cursor-pointer transition-colors hover:border-primary/50',
                 beat.status === 'mapped' && 'border-green-500/30 bg-green-500/5',
                 beat.status === 'partial' && 'border-amber-500/30 bg-amber-500/5'
               )}
               onClick={() => onBeatClick?.(beat.id)}
             >
               <CardContent className="p-3">
                 <div className="flex items-start gap-3">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                     {getStatusIcon(beat.status)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between">
                       <h4 className="font-medium text-sm">{beat.name}</h4>
                       <Badge variant="outline" className="text-[10px]">
                         p.{beat.pageRange}
                       </Badge>
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">{beat.description}</p>
                     
                     {beat.sceneIds && beat.sceneIds.length > 0 && (
                       <div className="flex flex-wrap gap-1 mt-2">
                         {beat.sceneIds.slice(0, 3).map((id, i) => (
                           <Badge key={i} variant="secondary" className="text-[10px]">
                             Scene {i + 1}
                           </Badge>
                         ))}
                         {beat.sceneIds.length > 3 && (
                           <Badge variant="secondary" className="text-[10px]">
                             +{beat.sceneIds.length - 3}
                           </Badge>
                         )}
                       </div>
                     )}
 
                     {beat.status === 'missing' && onAssignScene && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="mt-2 h-6 text-xs"
                         onClick={(e) => {
                           e.stopPropagation();
                           onAssignScene(beat.id);
                         }}
                       >
                         <Target className="h-3 w-3 mr-1" />
                         Assign Scene
                       </Button>
                     )}
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       </ScrollArea>
     </div>
   );
 }