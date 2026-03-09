import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface NotificationRouting {
  id: string;
  notification_type: string;
  source_role: string | null;
  target_user_id: string;
  is_active: boolean;
}

export function useNotificationRouting() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Get recipients for a specific notification type
  const getRecipients = async (notificationType: string): Promise<string[]> => {
    console.log('[NotificationRouting] Looking up recipients for:', notificationType);
    
    const { data, error } = await supabase
      .from('notification_routing')
      .select('target_user_id')
      .eq('notification_type', notificationType)
      .eq('is_active', true);

    if (error) {
      console.error('[NotificationRouting] Error fetching routing:', error);
      return [];
    }

    console.log('[NotificationRouting] Found routing entries:', data?.length || 0);
    return data?.map((r) => r.target_user_id) || [];
  };

  // Get directors and super_users for approval request notifications
  const getDirectorsAndSuperUsers = async (): Promise<string[]> => {
    console.log('[NotificationRouting] Fetching directors and super_users...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['director', 'super_user']);

    if (error) {
      console.error('[NotificationRouting] Error fetching directors:', error);
      return [];
    }

    console.log('[NotificationRouting] Found directors/super_users:', data?.map(d => `${d.full_name} (${d.role})`));
    return data?.map((d) => d.id) || [];
  };

  // Create or get notification room - simplified and more robust
  const ensureNotificationRoom = async (
    roomName: string, 
    senderId: string,
    recipientIds: string[]
  ): Promise<string | null> => {
    console.log('[NotificationRouting] === ENSURE ROOM ===');
    console.log('[NotificationRouting] Room name:', roomName);
    console.log('[NotificationRouting] Sender ID:', senderId);
    console.log('[NotificationRouting] Recipients:', recipientIds);
    
    try {
      // Check if room exists
      const { data: existingRoom, error: roomFetchError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('name', roomName)
        .eq('room_type', 'hierarchy')
        .maybeSingle();

      if (roomFetchError) {
        console.error('[NotificationRouting] Error fetching room:', roomFetchError);
      }

      let roomId: string;

      if (!existingRoom) {
        console.log('[NotificationRouting] Creating new room:', roomName);
        
        // Create new room
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: roomName,
            room_type: 'hierarchy',
            description: `Automated notifications - ${roomName}`,
            created_by: senderId,
          })
          .select('id')
          .single();

        if (roomError) {
          console.error('[NotificationRouting] Failed to create room:', roomError);
          return null;
        }
        
        roomId = newRoom.id;
        console.log('[NotificationRouting] Created room with ID:', roomId);

        // Add sender as participant first (required for RLS)
        const { error: senderError } = await supabase
          .from('chat_room_participants')
          .insert({
            room_id: roomId,
            user_id: senderId,
            role: 'admin',
          });

        if (senderError) {
          console.error('[NotificationRouting] Failed to add sender as participant:', senderError);
        } else {
          console.log('[NotificationRouting] Added sender as admin participant');
        }

        // Wait for RLS to recognize the participant
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } else {
        roomId = existingRoom.id;
        console.log('[NotificationRouting] Using existing room:', roomId);

        // Ensure sender is participant in existing room
        const { data: senderPart } = await supabase
          .from('chat_room_participants')
          .select('id')
          .eq('room_id', roomId)
          .eq('user_id', senderId)
          .maybeSingle();

        if (!senderPart) {
          console.log('[NotificationRouting] Adding sender to existing room');
          await supabase.from('chat_room_participants').insert({
            room_id: roomId,
            user_id: senderId,
            role: 'admin',
          });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Add all recipients as participants (ignore errors for existing participants)
      for (const recipientId of recipientIds) {
        if (recipientId === senderId) continue;
        
        const { data: existing } = await supabase
          .from('chat_room_participants')
          .select('id')
          .eq('room_id', roomId)
          .eq('user_id', recipientId)
          .maybeSingle();

        if (!existing) {
          console.log('[NotificationRouting] Adding recipient:', recipientId);
          await supabase.from('chat_room_participants').insert({
            room_id: roomId,
            user_id: recipientId,
            role: 'member',
          });
        }
      }

      return roomId;
    } catch (err) {
      console.error('[NotificationRouting] Unexpected error in ensureNotificationRoom:', err);
      return null;
    }
  };

  // Send notification message to a room
  const sendMessage = async (
    roomId: string,
    senderId: string,
    content: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> => {
    console.log('[NotificationRouting] === SEND MESSAGE ===');
    console.log('[NotificationRouting] Room ID:', roomId);
    console.log('[NotificationRouting] Sender ID:', senderId);
    console.log('[NotificationRouting] Content preview:', content.substring(0, 100));
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          content,
          message_type: 'system',
          metadata: metadata as any,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[NotificationRouting] Failed to send message:', error);
        return false;
      }
      
      console.log('[NotificationRouting] Message sent successfully! ID:', data.id);
      return true;
    } catch (err) {
      console.error('[NotificationRouting] Unexpected error sending message:', err);
      return false;
    }
  };

  // Also create a notification record in the notifications table
  const createNotificationRecord = async (
    recipientId: string,
    type: string,
    title: string,
    message: string
  ) => {
    try {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type,
        title,
        message,
        read_status: false,
      });
    } catch (err) {
      console.error('[NotificationRouting] Failed to create notification record:', err);
    }
  };

  // Send review notification (Director → Artists/HODs)
  const sendReviewNotification = useMutation({
    mutationFn: async ({
      notificationType,
      title,
      content,
      projectName,
      entityType,
      entityName,
    }: {
      notificationType: string;
      title: string;
      content: string;
      projectName?: string;
      entityType?: string;
      entityName?: string;
    }) => {
      if (!profile?.id) {
        console.error('[NotificationRouting] No profile ID');
        throw new Error('Not authenticated');
      }

      console.log('[NotificationRouting] ========== REVIEW NOTIFICATION ==========');
      console.log('[NotificationRouting] From:', profile.full_name, '(', profile.id, ')');
      console.log('[NotificationRouting] Type:', notificationType);
      console.log('[NotificationRouting] Title:', title);

      // Get recipients from routing config, fallback to art directors and storyboard supervisors
      let recipientIds = await getRecipients(notificationType);
      
      if (recipientIds.length === 0) {
        console.log('[NotificationRouting] No routing config, falling back to art directors/storyboard supervisors');
        
        // Fallback: Get art directors, storyboard supervisors, and super_users
        const { data: fallbackUsers } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['art_director', 'storyboard_supervisor', 'super_user', 'hod']);

        recipientIds = fallbackUsers?.map((u) => u.id) || [];
        console.log('[NotificationRouting] Fallback recipients:', fallbackUsers?.map(u => `${u.full_name} (${u.role})`));
      }
      
      if (recipientIds.length === 0) {
        console.log('[NotificationRouting] Still no recipients found');
        toast.info('No recipients found - configure in Admin > Notification Routing');
        return { sent: false, reason: 'No recipients found' };
      }

      const roomName = 'Director Notifications';
      const roomId = await ensureNotificationRoom(roomName, profile.id, recipientIds);
      
      if (!roomId) {
        throw new Error('Failed to create notification room');
      }

      // Format message
      const formattedContent = [
        `📋 **${title}**`,
        projectName ? `Project: ${projectName}` : '',
        entityType && entityName ? `${entityType}: ${entityName}` : '',
        '',
        content,
      ].filter(Boolean).join('\n');

      const success = await sendMessage(roomId, profile.id, formattedContent, {
        notification_type: notificationType,
        direction: 'director_to_team',
      });

      if (!success) {
        throw new Error('Failed to send message');
      }

      // Also create notification records for each recipient
      for (const recipientId of recipientIds) {
        await createNotificationRecord(recipientId, 'comment', title, content.substring(0, 200));
      }

      toast.success('Notification sent to team');
      return { sent: true, recipientCount: recipientIds.length };
    },
    onSuccess: (result) => {
      if (result.sent) {
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
    onError: (error) => {
      console.error('[NotificationRouting] Review notification failed:', error);
      toast.error('Failed to send notification');
    },
  });

  // Send approval request notification (Artists/Art Directors → Director)
  const sendApprovalRequest = useMutation({
    mutationFn: async ({
      title,
      content,
      projectName,
      entityType,
      entityName,
      conceptId,
    }: {
      title: string;
      content: string;
      projectName?: string;
      entityType?: string;
      entityName?: string;
      conceptId?: string;
    }) => {
      if (!profile?.id) {
        console.error('[NotificationRouting] No profile ID');
        throw new Error('Not authenticated');
      }

      console.log('[NotificationRouting] ========== APPROVAL REQUEST ==========');
      console.log('[NotificationRouting] From:', profile.full_name, '(', profile.id, ')');
      console.log('[NotificationRouting] Title:', title);

      // First try routing config, then fallback to all directors
      let recipientIds = await getRecipients('approval_request');
      
      if (recipientIds.length === 0) {
        console.log('[NotificationRouting] No routing config, falling back to directors');
        recipientIds = await getDirectorsAndSuperUsers();
      }
      
      if (recipientIds.length === 0) {
        toast.info('No directors found to notify');
        return { sent: false, reason: 'No directors found' };
      }

      console.log('[NotificationRouting] Will notify:', recipientIds.length, 'recipients');

      const roomName = 'Approval Requests';
      const roomId = await ensureNotificationRoom(roomName, profile.id, recipientIds);
      
      if (!roomId) {
        throw new Error('Failed to create notification room');
      }

      // Format message with sender info
      const formattedContent = [
        `📤 **${title}**`,
        `From: ${profile.full_name || profile.email}`,
        projectName ? `Project: ${projectName}` : '',
        entityType && entityName ? `${entityType}: ${entityName}` : '',
        '',
        content,
      ].filter(Boolean).join('\n');

      const success = await sendMessage(roomId, profile.id, formattedContent, {
        notification_type: 'approval_request',
        direction: 'team_to_director',
        concept_id: conceptId,
        sender_name: profile.full_name,
      });

      if (!success) {
        throw new Error('Failed to send message');
      }

      // Also create notification records for each director
      for (const recipientId of recipientIds) {
        await createNotificationRecord(recipientId, 'approval', title, content.substring(0, 200));
      }

      toast.success('Approval request sent to directors');
      return { sent: true, recipientCount: recipientIds.length };
    },
    onSuccess: (result) => {
      if (result.sent) {
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
    onError: (error) => {
      console.error('[NotificationRouting] Approval request failed:', error);
      toast.error('Failed to send approval request');
    },
  });

  return {
    sendReviewNotification,
    sendApprovalRequest,
    getRecipients,
  };
}
