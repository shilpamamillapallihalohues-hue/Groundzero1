import { useState, useRef, useEffect } from 'react';
import { Send, Users, Plus, ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { NewChatDialog } from '@/components/chat/NewChatDialog';

function formatMessageTime(date: Date): string {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

export default function ChatPage() {
  const { profile } = useAuth();
  const {
    rooms,
    messages,
    roomsLoading,
    messagesLoading,
    activeRoomId,
    setActiveRoomId,
    sendMessage,
    markAsRead,
  } = useChat();
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening a room
  useEffect(() => {
    if (activeRoomId) {
      markAsRead(activeRoomId);
    }
  }, [activeRoomId, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeRoomId) return;
    sendMessage.mutate({ roomId: activeRoomId, content: messageInput });
    setMessageInput('');
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mobile chat list view
  if (!activeRoomId) {
    return (
      <div className="flex flex-col h-[calc(100dvh-8rem)] bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Messages</h1>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewChat(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Room list */}
        <ScrollArea className="flex-1">
          {roomsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No conversations yet</p>
              <Button size="sm" className="mt-3" onClick={() => setShowNewChat(true)}>
                Start a conversation
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {room.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{room.name}</p>
                      {room.unread_count && room.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs ml-2">
                          {room.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {room.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
      </div>
    );
  }

  // Mobile chat conversation view
  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] bg-background">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setActiveRoomId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {activeRoom?.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{activeRoom?.name}</p>
          <p className="text-xs text-muted-foreground">
            {activeRoom?.room_type === 'direct' ? 'Direct Message' : 'Group Chat'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        {messagesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "")}>
                <div className="w-2/3 h-12 bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.sender_id === profile?.id;
              return (
                <div
                  key={message.id}
                  className={cn("flex", isOwn ? "justify-end" : "")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    {!isOwn && message.sender?.full_name && (
                      <p className="text-xs font-medium mb-0.5 opacity-70">
                        {message.sender.full_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {formatMessageTime(new Date(message.created_at))}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t bg-card/50">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 h-10"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!messageInput.trim() || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
