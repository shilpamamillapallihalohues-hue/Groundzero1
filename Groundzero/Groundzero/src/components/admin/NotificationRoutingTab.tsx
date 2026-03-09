import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Bell, MessageCircle, UserPlus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  specific_role: string | null;
}

interface NotificationRouting {
  id: string;
  notification_type: string;
  source_role: string | null;
  target_user_id: string;
  is_active: boolean;
}

const NOTIFICATION_TYPES = [
  { 
    key: 'director_review', 
    label: 'Director Reviews & Notes',
    description: 'Concept art reviews, annotations, and approval feedback from directors'
  },
  { 
    key: 'approval_request', 
    label: 'Approval Requests',
    description: 'Notifications when assets are submitted for approval'
  },
  { 
    key: 'revision_request', 
    label: 'Revision Requests',
    description: 'When work requires revisions based on feedback'
  },
];

export function NotificationRoutingTab() {
  const { profile: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string[]>>({});

  // Fetch all profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['all-profiles-for-routing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, specific_role')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch existing routing config
  const { data: routingConfig = [], isLoading: routingLoading } = useQuery({
    queryKey: ['notification-routing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_routing')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as NotificationRouting[];
    },
  });

  // Initialize selected users from routing config
  useEffect(() => {
    if (routingConfig.length > 0) {
      const grouped: Record<string, string[]> = {};
      routingConfig.forEach((config) => {
        if (!grouped[config.notification_type]) {
          grouped[config.notification_type] = [];
        }
        grouped[config.notification_type].push(config.target_user_id);
      });
      setSelectedUsers(grouped);
    }
  }, [routingConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { notificationType: string; userIds: string[] }) => {
      // Delete existing routing for this type
      await supabase
        .from('notification_routing')
        .delete()
        .eq('notification_type', data.notificationType);

      // Insert new routing
      if (data.userIds.length > 0) {
        const { error } = await supabase.from('notification_routing').insert(
          data.userIds.map((userId) => ({
            notification_type: data.notificationType,
            source_role: 'director',
            target_user_id: userId,
            is_active: true,
            created_by: currentUser?.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-routing'] });
      toast.success('Notification routing updated');
    },
    onError: (error) => {
      console.error('Error saving routing:', error);
      toast.error('Failed to save routing configuration');
    },
  });

  const toggleUser = (notificationType: string, userId: string) => {
    setSelectedUsers((prev) => {
      const current = prev[notificationType] || [];
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...prev, [notificationType]: updated };
    });
  };

  const handleSave = (notificationType: string) => {
    saveMutation.mutate({
      notificationType,
      userIds: selectedUsers[notificationType] || [],
    });
  };

  const getRoleBadge = (profile: Profile) => {
    const role = profile.specific_role || profile.role || 'Unknown';
    const roleColors: Record<string, string> = {
      super_user: 'bg-red-100 text-red-800',
      director: 'bg-purple-100 text-purple-800',
      producer: 'bg-blue-100 text-blue-800',
      hod: 'bg-green-100 text-green-800',
      artist: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <Badge variant="outline" className={roleColors[profile.role || ''] || ''}>
        {role.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (profilesLoading || routingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter profiles to show eligible recipients (include Art Director + Storyboard Supervisor)
  const eligibleProfiles = profiles.filter((p) => {
    const role = (p.role || '').toLowerCase();
    const specificRole = (p.specific_role || '').toLowerCase();
    return (
      role === 'super_user' ||
      role === 'art_director' ||
      role === 'storyboard_supervisor' ||
      role === 'hod' ||
      role === 'artist' ||
      specificRole.includes('modeler') ||
      specificRole.includes('modeling') ||
      specificRole.includes('lead') ||
      specificRole.includes('supervisor')
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Routing</CardTitle>
          </div>
          <CardDescription>
            Configure who receives director approval notifications and review notes via chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {NOTIFICATION_TYPES.map((notifType) => (
            <div key={notifType.key} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{notifType.label}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notifType.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(notifType.key)}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {eligibleProfiles.map((profile) => (
                  <label
                    key={profile.id}
                    className="flex items-center gap-3 p-2 rounded-md border hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={(selectedUsers[notifType.key] || []).includes(profile.id)}
                      onCheckedChange={() => toggleUser(notifType.key, profile.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                    {getRoleBadge(profile)}
                  </label>
                ))}
              </div>

              {(selectedUsers[notifType.key] || []).length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {(selectedUsers[notifType.key] || []).length} recipient(s) selected
                  </span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
