import { useState } from 'react';
import { Users, User, Search, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChat, useChatableUsers } from '@/hooks/useChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { createRoom } = useChat();
  const { data: users = [], isLoading } = useChatableUsers();
  const isMobile = useIsMobile();
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter((user) => {
    const name = user.full_name?.toLowerCase() || '';
    const role = user.role?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || role.includes(query);
  });

  const toggleUser = (userId: string) => {
    if (chatType === 'direct') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
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

  const getRoleBadgeColor = (role: string | null) => {
    if (!role) return 'secondary';
    const r = role.toLowerCase();
    if (r.includes('director')) return 'default';
    if (r.includes('producer')) return 'default';
    if (r.includes('hod') || r.includes('head')) return 'secondary';
    if (r.includes('lead')) return 'outline';
    return 'outline';
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    const selectedUser = users.find((u) => u.id === selectedUsers[0]);
    const name =
      chatType === 'direct'
        ? selectedUser?.full_name || 'Direct Message'
        : groupName || `Group (${selectedUsers.length + 1} members)`;

    await createRoom.mutateAsync({
      name,
      room_type: chatType,
      participantIds: selectedUsers,
    });

    // Reset and close
    setSelectedUsers([]);
    setGroupName('');
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setGroupName('');
    setSearchQuery('');
    setChatType('direct');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "p-0",
        isMobile ? "w-full h-full max-w-full max-h-full rounded-none" : "sm:max-w-md"
      )}>
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <Tabs value={chatType} onValueChange={(v) => {
            setChatType(v as 'direct' | 'group');
            setSelectedUsers([]);
          }}>
            <TabsList className="w-full h-10">
              <TabsTrigger value="direct" className="flex-1 gap-2 text-sm">
                <User className="w-4 h-4" />
                <span className={isMobile ? "hidden" : ""}>Direct</span>
              </TabsTrigger>
              <TabsTrigger value="group" className="flex-1 gap-2 text-sm">
                <Users className="w-4 h-4" />
                <span className={isMobile ? "hidden" : ""}>Group</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              {chatType === 'group' && (
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    placeholder="Enter group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{chatType === 'direct' ? 'Select User' : 'Select Members'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>

              <ScrollArea className={cn(
                "border rounded-lg",
                isMobile ? "h-[calc(100vh-350px)]" : "h-[300px]"
              )}>
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground p-8">
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                    <Users className="w-12 h-12 mb-2 opacity-20" />
                    <p>No users found</p>
                    <p className="text-xs text-center">You can only chat with users in your hierarchy</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => toggleUser(user.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left active:bg-muted',
                            isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary/10 text-sm">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            {isSelected && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.full_name || 'Unknown'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getRoleBadgeColor(user.role)} className="text-[10px]">
                                {user.role || 'No role'}
                              </Badge>
                              {user.specific_role && !isMobile && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {user.specific_role}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = users.find((u) => u.id === userId);
                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="gap-1 cursor-pointer py-1"
                        onClick={() => toggleUser(userId)}
                      >
                        {user?.full_name || 'Unknown'}
                        <span className="text-muted-foreground">×</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-border gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1 md:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="flex-1 md:flex-none"
            disabled={
              selectedUsers.length === 0 ||
              (chatType === 'group' && selectedUsers.length < 1) ||
              createRoom.isPending
            }
          >
            {createRoom.isPending ? 'Creating...' : 'Start Chat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
