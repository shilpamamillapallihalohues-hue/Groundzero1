 import { useState } from 'react';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Textarea } from '@/components/ui/textarea';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { 
   MessageSquare, Send, CheckCircle, X, 
   Filter, Clock, User
 } from 'lucide-react';
 import { format } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface Comment {
   id: string;
   userId: string;
   userName: string;
   userInitials: string;
   elementId?: string;
   sceneId?: string;
   commentText: string;
   commentType: 'note' | 'suggestion' | 'revision_request' | 'approval';
   isResolved: boolean;
   resolvedBy?: string;
   resolvedAt?: string;
   createdAt: string;
 }

 interface SceneInfo {
   id: string;
   sceneNumber: string;
   slugline: string;
 }

interface ScreenplayCommentsProps {
  comments: Comment[];
  onAddComment: (text: string, type: Comment['commentType']) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  selectedElementId?: string | null;
  currentSceneId?: string | null;
  currentUserId?: string;
  isReadOnly?: boolean;
  scenes?: SceneInfo[];
  onSceneClick?: (sceneId: string) => void;
}

export function ScreenplayComments({
  comments,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  selectedElementId,
  currentSceneId,
  currentUserId,
  isReadOnly,
  scenes = [],
  onSceneClick,
}: ScreenplayCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<Comment['commentType']>('note');
  const [showResolved, setShowResolved] = useState(false);
  const [filterSceneId, setFilterSceneId] = useState<string | null>(null);

  // Show ALL comments (no scene filtering by default), only filter resolved
  const filteredComments = comments.filter(c => {
    if (!showResolved && c.isResolved) return false;
    if (filterSceneId && c.sceneId !== filterSceneId) return false;
    return true;
  });

  // Group comments by scene for display
  const getSceneLabel = (sceneId?: string) => {
    if (!sceneId) return null;
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return null;
    return { number: scene.sceneNumber, slugline: scene.slugline };
  };

  // Sort: most recent first
  const sortedComments = [...filteredComments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
 
   const handleSubmit = () => {
     if (!newComment.trim()) return;
     onAddComment(newComment.trim(), commentType);
     setNewComment('');
   };
 
   const getTypeBadge = (type: Comment['commentType']) => {
     switch (type) {
       case 'suggestion':
         return <Badge className="bg-blue-500 text-white text-[10px]">Suggestion</Badge>;
       case 'revision_request':
         return <Badge className="bg-amber-500 text-white text-[10px]">Revision</Badge>;
       case 'approval':
         return <Badge className="bg-green-500 text-white text-[10px]">Approval</Badge>;
       default:
         return <Badge variant="outline" className="text-[10px]">Note</Badge>;
     }
   };
 
   const stats = {
     total: comments.length,
     unresolved: comments.filter(c => !c.isResolved).length,
     revisions: comments.filter(c => c.commentType === 'revision_request' && !c.isResolved).length,
   };

   // Get unique scenes that have comments
   const scenesWithComments = scenes.filter(s => 
     comments.some(c => c.sceneId === s.id)
   );
 
   return (
     <div className="h-full flex flex-col border-l">
       {/* Header */}
       <div className="p-3 border-b space-y-2">
         <div className="flex items-center justify-between">
           <h3 className="font-semibold flex items-center gap-2">
             <MessageSquare className="h-4 w-4" />
             All Comments
           </h3>
           <Badge variant={stats.unresolved > 0 ? 'default' : 'secondary'}>
             {stats.unresolved}
           </Badge>
         </div>
 
         {/* Quick Stats */}
         <div className="flex items-center gap-2 text-xs">
           <span className="text-muted-foreground">{stats.total} total</span>
           {stats.revisions > 0 && (
             <Badge variant="destructive" className="text-[10px]">
               {stats.revisions} revision requests
             </Badge>
           )}
         </div>
 
         {/* Filters row */}
         <div className="flex items-center gap-1 flex-wrap">
           <Button
             variant="ghost"
             size="sm"
             className="text-xs h-7"
             onClick={() => setShowResolved(!showResolved)}
           >
             <Filter className="h-3 w-3 mr-1" />
             {showResolved ? 'Hide Resolved' : 'Show Resolved'}
           </Button>
           {/* Scene filter chips */}
           <Button
             variant={filterSceneId === null ? "secondary" : "ghost"}
             size="sm"
             className="text-xs h-7"
             onClick={() => setFilterSceneId(null)}
           >
             All
           </Button>
           {scenesWithComments.slice(0, 6).map(s => (
             <Button
               key={s.id}
               variant={filterSceneId === s.id ? "secondary" : "ghost"}
               size="sm"
               className="text-xs h-7 max-w-[100px] truncate"
               onClick={() => setFilterSceneId(filterSceneId === s.id ? null : s.id)}
               title={s.slugline}
             >
               Sc {s.sceneNumber || '?'}
             </Button>
           ))}
         </div>
       </div>
 
       {/* Comment List */}
       <ScrollArea className="flex-1">
         <div className="p-2 space-y-2">
           {sortedComments.map((comment) => {
             const sceneLabel = getSceneLabel(comment.sceneId);
             return (
               <div
                 key={comment.id}
                 className={cn(
                   'p-2 rounded-lg border',
                   comment.isResolved && 'opacity-60 bg-muted/30',
                   selectedElementId === comment.elementId && 'border-primary'
                 )}
               >
                 {/* Scene tag - clickable to scroll */}
                 {sceneLabel && (
                   <button
                     className="flex items-center gap-1 mb-1.5 w-full text-left group"
                     onClick={() => comment.sceneId && onSceneClick?.(comment.sceneId)}
                     title="Click to scroll to this scene"
                   >
                     <Badge 
                       variant="outline" 
                       className="text-[9px] bg-primary/5 border-primary/20 text-primary group-hover:bg-primary/15 transition-colors cursor-pointer"
                     >
                       Sc {sceneLabel.number} — {sceneLabel.slugline.length > 30 ? sceneLabel.slugline.slice(0, 30) + '…' : sceneLabel.slugline}
                     </Badge>
                   </button>
                 )}

                 <div className="flex items-start gap-2">
                   <Avatar className="h-6 w-6">
                     <AvatarFallback className="text-[10px]">
                       {comment.userInitials}
                     </AvatarFallback>
                   </Avatar>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 flex-wrap">
                       <span className="text-sm font-medium">{comment.userName}</span>
                       {getTypeBadge(comment.commentType)}
                       {comment.isResolved && (
                         <CheckCircle className="h-3 w-3 text-green-500" />
                       )}
                     </div>
                     <p className="text-sm mt-1">{comment.commentText}</p>
                     <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                       <Clock className="h-3 w-3" />
                       <span>{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                     </div>
                   </div>
                 </div>
 
                 {/* Actions */}
                 {!isReadOnly && !comment.isResolved && (
                   <div className="flex gap-1 mt-2 pt-2 border-t">
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-6 text-xs flex-1"
                       onClick={() => onResolveComment(comment.id)}
                     >
                       <CheckCircle className="h-3 w-3 mr-1" />
                       Resolve
                     </Button>
                     {currentUserId === comment.userId && onDeleteComment && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-6 text-xs text-red-500"
                         onClick={() => onDeleteComment(comment.id)}
                       >
                         <X className="h-3 w-3" />
                       </Button>
                     )}
                   </div>
                 )}
               </div>
             );
           })}
 
           {sortedComments.length === 0 && (
             <div className="text-center py-8 text-muted-foreground">
               <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
               <p className="text-sm">No comments</p>
               <p className="text-xs">Add notes to any scene element</p>
             </div>
           )}
         </div>
       </ScrollArea>
 
       {/* Add Comment */}
       {!isReadOnly && (
         <div className="p-3 border-t space-y-2">
           {/* Comment Type Selector */}
           <div className="flex gap-1">
             {(['note', 'suggestion', 'revision_request'] as const).map((type) => (
               <Button
                 key={type}
                 variant={commentType === type ? 'secondary' : 'ghost'}
                 size="sm"
                 className="text-xs flex-1"
                 onClick={() => setCommentType(type)}
               >
                 {type === 'note' && 'Note'}
                 {type === 'suggestion' && 'Suggest'}
                 {type === 'revision_request' && 'Revision'}
               </Button>
             ))}
           </div>
 
           <div className="flex gap-2">
             <Textarea
               value={newComment}
               onChange={(e) => setNewComment(e.target.value)}
               placeholder="Add a comment..."
               className="min-h-[60px] text-sm"
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                   handleSubmit();
                 }
               }}
             />
           </div>
           <Button 
             size="sm" 
             className="w-full"
             onClick={handleSubmit}
             disabled={!newComment.trim()}
           >
             <Send className="h-3 w-3 mr-1" />
             Add Comment
           </Button>
         </div>
       )}
     </div>
   );
 }