import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Send, X, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getStoryboardComments, 
  createComment, 
  deleteComment, 
  subscribeToComments,
  StoryboardComment
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoryboardCommentsProps {
  storyboardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StoryboardComments({ storyboardId, isOpen, onClose }: StoryboardCommentsProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<StoryboardComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && storyboardId) {
      loadComments();
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToComments(
        storyboardId,
        (newComment) => {
          // Fetch full comment with profile
          loadComments();
        },
        (deletedId) => {
          setComments((prev) => prev.filter((c) => c.id !== deletedId));
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [isOpen, storyboardId]);

  useEffect(() => {
    // Scroll to bottom when new comments arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getStoryboardComments(storyboardId);
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSending(true);
    try {
      const comment = await createComment({
        storyboard_id: storyboardId,
        user_id: user.id,
        content: newComment.trim(),
      });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (error: any) {
      toast.error('Failed to send comment');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-card border-l border-border flex flex-col z-10 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Comments</h3>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Be the first to add feedback!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "group flex gap-3",
                  comment.user_id === user?.id && "flex-row-reverse"
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {comment.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex-1 max-w-[200px]",
                    comment.user_id === user?.id && "text-right"
                  )}
                >
                  <div
                    className={cn(
                      "inline-block p-3 rounded-lg",
                      comment.user_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <p className="text-sm">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {comment.user_id === user?.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a comment..."
            className="flex-1"
            disabled={isSending}
          />
          <Button
            variant="gold"
            size="icon"
            onClick={handleSendComment}
            disabled={!newComment.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
