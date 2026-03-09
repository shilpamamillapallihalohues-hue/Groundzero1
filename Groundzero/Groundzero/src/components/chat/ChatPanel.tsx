import { useState, useRef, useEffect } from 'react';
import { X, Send, Users, Plus, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChat, useChatableUsers, ChatRoom, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { NewChatDialog } from './NewChatDialog';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
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

  const handleSend = () => {
    if (!messageInput.trim() || !activeRoomId) return;
    sendMessage.mutate({ roomId: activeRoomId, content: messageInput.trim() });
    setMessageInput('');
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday ' + format(date, 'HH:mm');
    return format(date, 'MMM d, HH:mm');
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.room_type === 'direct' && room.participants) {
      const otherParticipant = room.participants.find((p) => p.user_id !== profile?.id);
      return otherParticipant?.profile?.full_name || room.name;
    }
    return room.name;
  };

  const filteredRooms = rooms.filter((room) => {
    const displayName = getRoomDisplayName(room).toLowerCase();
    return displayName.includes(searchQuery.toLowerCase());
  });

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "fixed z-50 bg-card border border-border shadow-2xl flex flex-col overflow-hidden",
        isMobile 
          ? "inset-0 rounded-none" 
          : "right-4 top-20 w-[400px] h-[600px] rounded-xl"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/30">
          {activeRoomId ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => setActiveRoomId(null)} className="h-8 w-8 md:h-9 md:w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 ml-2">
                <h3 className="font-semibold text-sm">{activeRoom ? getRoomDisplayName(activeRoom) : 'Chat'}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeRoom?.participants?.length || 0} participants
                </p>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold">Messages</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNewChat(true)} className="h-8 w-8 md:h-9 md:w-9">
                <Plus className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-9 md:w-9">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        {activeRoomId ? (
          // Messages View
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-3 md:p-4">
              <div className="space-y-3 md:space-y-4">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === profile?.id;
                    return (
                      <div key={msg.id} className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                        {!isOwn && (
                          <Avatar className="w-7 h-7 md:w-8 md:h-8">
                            <AvatarFallback className="text-xs bg-primary/10">
                              {getInitials(msg.sender?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn('max-w-[75%] md:max-w-[70%]', isOwn && 'text-right')}>
                          {!isOwn && (
                            <p className="text-xs text-muted-foreground mb-1">{msg.sender?.full_name}</p>
                          )}
                          <div
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm',
                              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}
                          >
                            {msg.content}
                          </div>
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{formatMessageDate(msg.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 md:p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1 h-10"
                />
                <Button onClick={handleSend} disabled={!messageInput.trim() || sendMessage.isPending} size="icon" className="h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Rooms List View
          <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col">
              <TabsList className="mx-3 mt-2 h-9">
                <TabsTrigger value="all" className="flex-1 text-xs md:text-sm">All</TabsTrigger>
                <TabsTrigger value="direct" className="flex-1 text-xs md:text-sm">Direct</TabsTrigger>
                <TabsTrigger value="groups" className="flex-1 text-xs md:text-sm">Groups</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex-1 m-0">
                <RoomsList
                  rooms={filteredRooms}
                  loading={roomsLoading}
                  onSelectRoom={setActiveRoomId}
                  profile={profile}
                  getRoomDisplayName={getRoomDisplayName}
                  formatMessageDate={formatMessageDate}
                  getInitials={getInitials}
                />
              </TabsContent>
              <TabsContent value="direct" className="flex-1 m-0">
                <RoomsList
                  rooms={filteredRooms.filter((r) => r.room_type === 'direct')}
                  loading={roomsLoading}
                  onSelectRoom={setActiveRoomId}
                  profile={profile}
                  getRoomDisplayName={getRoomDisplayName}
                  formatMessageDate={formatMessageDate}
                  getInitials={getInitials}
                />
              </TabsContent>
              <TabsContent value="groups" className="flex-1 m-0">
                <RoomsList
                  rooms={filteredRooms.filter((r) => r.room_type !== 'direct')}
                  loading={roomsLoading}
                  onSelectRoom={setActiveRoomId}
                  profile={profile}
                  getRoomDisplayName={getRoomDisplayName}
                  formatMessageDate={formatMessageDate}
                  getInitials={getInitials}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
    </>
  );
}

interface RoomsListProps {
  rooms: ChatRoom[];
  loading: boolean;
  onSelectRoom: (id: string) => void;
  profile: any;
  getRoomDisplayName: (room: ChatRoom) => string;
  formatMessageDate: (date: string) => string;
  getInitials: (name: string | null) => string;
}

function RoomsList({
  rooms,
  loading,
  onSelectRoom,
  profile,
  getRoomDisplayName,
  formatMessageDate,
  getInitials,
}: RoomsListProps) {
  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>;
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>No conversations yet</p>
        <p className="text-xs">Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        {rooms.map((room) => {
          const displayName = getRoomDisplayName(room);
          const otherParticipant =
            room.room_type === 'direct'
              ? room.participants?.find((p) => p.user_id !== profile?.id)
              : null;

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left active:bg-muted"
            >
              <div className="relative">
                <Avatar className="w-10 h-10 md:w-11 md:h-11">
                  <AvatarFallback className="bg-primary/10 text-sm">
                    {room.room_type === 'direct' ? getInitials(otherParticipant?.profile?.full_name) : <Users className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                {room.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {room.unread_count > 9 ? '9+' : room.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn('font-medium text-sm truncate', room.unread_count > 0 && 'font-semibold')}>
                    {displayName}
                  </p>
                  {room.last_message && (
                    <span className="text-[10px] md:text-xs text-muted-foreground ml-2 shrink-0">
                      {formatMessageDate(room.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {room.room_type !== 'direct' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                      {room.room_type}
                    </Badge>
                  )}
                  {room.last_message && (
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {room.last_message.sender_id === profile?.id ? 'You: ' : ''}
                      {room.last_message.content}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
