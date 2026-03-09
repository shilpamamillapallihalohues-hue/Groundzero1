import { useState, useRef, useEffect } from 'react';
import { X, Send, Users, Plus, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useChat, ChatRoom, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { NewChatDialog } from './NewChatDialog';

interface ChatSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidePanel({ isOpen, onClose }: ChatSidePanelProps) {
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

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="right" 
          className={cn(
            "p-0 flex flex-col",
            isMobile ? "w-full" : "w-[400px] sm:w-[450px]"
          )}
        >
          {/* Header */}
          <SheetHeader className="flex-shrink-0 p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              {activeRoomId ? (
                <div className="flex items-center gap-2 flex-1">
                  <Button variant="ghost" size="icon" onClick={() => setActiveRoomId(null)} className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-sm truncate">{activeRoom ? getRoomDisplayName(activeRoom) : 'Chat'}</SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {activeRoom?.participants?.length || 0} participants
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <SheetTitle>Messages</SheetTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowNewChat(true)} className="h-8 w-8">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeRoomId ? (
              // Messages View
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
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
                              <Avatar className="w-7 h-7 flex-shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {getInitials(msg.sender?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={cn('max-w-[75%]', isOwn && 'text-right')}>
                              {!isOwn && (
                                <p className="text-xs text-muted-foreground mb-1">{msg.sender?.full_name}</p>
                              )}
                              <div
                                className={cn(
                                  'rounded-lg px-3 py-2 text-sm break-words',
                                  isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}
                              >
                                {msg.content}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">{formatMessageDate(msg.created_at)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="flex-shrink-0 p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      className="flex-1 h-10"
                    />
                    <Button onClick={handleSend} disabled={!messageInput.trim() || sendMessage.isPending} size="icon" className="h-10 w-10 flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              // Rooms List View
              <>
                {/* Search */}
                <div className="flex-shrink-0 p-3 border-b">
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

                <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="mx-3 mt-2 h-9 flex-shrink-0">
                    <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
                    <TabsTrigger value="direct" className="flex-1 text-xs">Direct</TabsTrigger>
                    <TabsTrigger value="groups" className="flex-1 text-xs">Groups</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="flex-1 m-0 overflow-hidden">
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
                  <TabsContent value="direct" className="flex-1 m-0 overflow-hidden">
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
                  <TabsContent value="groups" className="flex-1 m-0 overflow-hidden">
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
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
    <ScrollArea className="flex-1 h-full">
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
              <div className="relative flex-shrink-0">
                <Avatar className="w-10 h-10">
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
                    <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                      {formatMessageDate(room.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {room.room_type !== 'direct' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
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
