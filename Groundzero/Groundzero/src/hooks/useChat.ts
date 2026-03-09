import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ChatRoom {
  id: string;
  name: string;
  room_type: 'direct' | 'group' | 'department' | 'hierarchy';
  description: string | null;
  department_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    role: string | null;
    specific_role: string | null;
  };
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  metadata: any;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    role: string | null;
  };
}

export function useChat() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Fetch all chat rooms for current user
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['chat-rooms', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data: participations, error: partError } = await supabase
        .from('chat_room_participants')
        .select('room_id')
        .eq('user_id', profile.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const roomIds = participations.map(p => p.room_id);

      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (roomsError) throw roomsError;

      // Get last message and unread count for each room
      const roomsWithDetails = await Promise.all(
        (roomsData || []).map(async (room) => {
          // Get last message
          const { data: lastMsgData } = await supabase
            .from('chat_messages')
            .select('*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, role)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get participants
          const { data: participantsData } = await supabase
            .from('chat_room_participants')
            .select('*, profile:profiles!chat_room_participants_user_id_fkey(id, full_name, role, specific_role)')
            .eq('room_id', room.id);

          // Get user's last read time
          const userParticipation = participantsData?.find(p => p.user_id === profile.id);
          const lastReadAt = userParticipation?.last_read_at || room.created_at;

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .gt('created_at', lastReadAt)
            .neq('sender_id', profile.id);

          return {
            ...room,
            last_message: lastMsgData,
            participants: participantsData || [],
            unread_count: unreadCount || 0,
          } as ChatRoom;
        })
      );

      return roomsWithDetails;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  // Fetch messages for active room
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', activeRoomId],
    queryFn: async () => {
      if (!activeRoomId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, role)')
        .eq('room_id', activeRoomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!activeRoomId,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!activeRoomId || !profile?.id) return;

    const channel = supabase
      .channel(`room-${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoomId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', activeRoomId] });
          queryClient.invalidateQueries({ queryKey: ['chat-rooms', profile.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, profile?.id, queryClient]);

  // Subscribe to new messages in any room for notifications
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_id !== profile.id && newMessage.room_id !== activeRoomId) {
            // Fetch sender info for notification
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .single();

            toast({
              title: `New message from ${sender?.full_name || 'Unknown'}`,
              description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
            });
          }
          queryClient.invalidateQueries({ queryKey: ['chat-rooms', profile.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, activeRoomId, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: profile.id,
          content,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeRoomId] });
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', profile?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create room mutation
  const createRoom = useMutation({
    mutationFn: async ({
      name,
      room_type,
      participantIds,
      description,
    }: {
      name: string;
      room_type: 'direct' | 'group' | 'department' | 'hierarchy';
      participantIds: string[];
      description?: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Create room with profile.id (RLS now uses get_profile_id function to validate)
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          room_type,
          description,
          created_by: profile.id, // Use profile id - RLS validates via get_profile_id(auth.uid())
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as admin
      const { error: creatorError } = await supabase
        .from('chat_room_participants')
        .insert({
          room_id: room.id,
          user_id: profile.id,
          role: 'admin',
        });

      if (creatorError) throw creatorError;

      // Add other participants
      if (participantIds.length > 0) {
        const { error: partError } = await supabase
          .from('chat_room_participants')
          .insert(
            participantIds.map((userId) => ({
              room_id: room.id,
              user_id: userId,
              role: 'member',
            }))
          );

        if (partError) throw partError;
      }

      return room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms', profile?.id] });
      toast({
        title: 'Chat room created',
        description: 'Your new chat room is ready!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create room',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark room as read
  const markAsRead = useCallback(
    async (roomId: string) => {
      if (!profile?.id) return;

      await supabase
        .from('chat_room_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', profile.id);

      queryClient.invalidateQueries({ queryKey: ['chat-rooms', profile.id] });
    },
    [profile?.id, queryClient]
  );

  // Total unread count
  const totalUnread = rooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);

  return {
    rooms,
    messages,
    roomsLoading,
    messagesLoading,
    activeRoomId,
    setActiveRoomId,
    sendMessage,
    createRoom,
    markAsRead,
    totalUnread,
  };
}

// Hook to get available users for chat based on hierarchy
export function useChatableUsers() {
  const { profile } = useAuth();

  // Check if current user is admin/super_user
  const isAdmin = profile?.role ? 
    ['super_user', 'superuser', 'admin'].includes(profile.role.toLowerCase()) ||
    profile.role.toLowerCase().includes('super') : 
    false;

  return useQuery({
    queryKey: ['chatable-users', profile?.id, profile?.role, isAdmin],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Fetch all users with their roles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, specific_role, department_id')
        .neq('id', profile.id)
        .order('full_name');

      if (error) throw error;
      
      // If no users found, return empty array
      if (!data || data.length === 0) return [];

      // Check if current user is admin/super_user - they can chat with everyone
      const userRole = (profile.role || '').toLowerCase().trim();
      const isCurrentUserAdmin = isAdmin || 
        userRole === 'super_user' || 
        userRole === 'superuser' ||
        userRole === 'admin' ||
        userRole.includes('super');

      // Admins and super users can chat with everyone
      if (isCurrentUserAdmin) {
        return data;
      }

      // Filter based on hierarchy for non-admin users
      const filteredUsers = data.filter((user) => {
        const targetRole = (user.role || '').toLowerCase().trim();

        // Directors can chat with HODs, Leads, Producers, other Directors
        if (userRole === 'director') {
          return ['hod', 'head', 'lead', 'producer', 'director', 'super', 'admin'].some(
            (r) => targetRole.includes(r)
          );
        }

        // Producers can chat with Directors, HODs, Leads
        if (userRole === 'producer') {
          return ['director', 'hod', 'head', 'lead', 'producer', 'super', 'admin'].some(
            (r) => targetRole.includes(r)
          );
        }

        // Production Managers can chat with everyone in production flow
        if (userRole === 'production_manager' || userRole.includes('production')) {
          return true; // Production managers coordinate with everyone
        }

        // HODs can chat with Directors, Producers, Leads in their dept, Artists in their dept
        if (userRole === 'hod' || userRole.includes('head')) {
          if (['director', 'producer', 'super', 'admin'].some((r) => targetRole.includes(r))) return true;
          if (profile.department_id && user.department_id === profile.department_id) return true;
          return ['hod', 'head', 'lead'].some((r) => targetRole.includes(r)); // HODs can chat with other HODs
        }

        // Leads can chat with HODs, other Leads, Artists in their dept
        if (userRole === 'lead' || userRole.includes('lead')) {
          if (['hod', 'head', 'lead', 'director', 'producer'].some((r) => targetRole.includes(r))) return true;
          if (profile.department_id && user.department_id === profile.department_id) return true;
          return false;
        }

        // Artists can chat with their Leads, HODs, and co-team members
        if (userRole === 'artist') {
          if (['hod', 'head', 'lead', 'director', 'producer', 'production'].some((r) => targetRole.includes(r))) return true;
          if (profile.department_id && user.department_id === profile.department_id) return true;
          // Artists can also chat with other artists in general
          if (targetRole === 'artist') return true;
          return false;
        }

        // Default: allow chatting with everyone (for flexibility)
        return true;
      });

      return filteredUsers;
    },
    enabled: !!profile?.id,
  });
}
