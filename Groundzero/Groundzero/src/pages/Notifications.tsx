import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  RotateCcw,
  Check,
  Trash2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_status: boolean;
  created_at: string;
}

const Notifications = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch real notifications from database
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data as Notification[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.read_status).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rework': return <RotateCcw className="h-5 w-5 text-amber-500" />;
      case 'deadline': return <Clock className="h-5 w-5 text-red-500" />;
      case 'comment': return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return format(date, 'MMM d, yyyy');
  };

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('user_id', profile.id)
        .eq('read_status', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
    },
  });

  const filterNotifications = (tab: string) => {
    if (tab === 'all') return notifications;
    if (tab === 'unread') return notifications.filter(n => !n.read_status);
    return notifications.filter(n => n.type === tab);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your work</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary">
              {unreadCount} unread
            </Badge>
          )}
          <Button 
            variant="outline" 
            onClick={() => markAllAsReadMutation.mutate()} 
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Mark all read
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-1">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approval">Approvals</TabsTrigger>
          <TabsTrigger value="rework">Rework</TabsTrigger>
          <TabsTrigger value="deadline">Deadlines</TabsTrigger>
        </TabsList>

        {['all', 'unread', 'approval', 'rework', 'deadline'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading notifications...</p>
                  </div>
                ) : filterNotifications(tab).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications to show</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterNotifications(tab).map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                          notification.read_status ? 'bg-muted/30' : 'bg-primary/5 border border-primary/20'
                        }`}
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{notification.title}</span>
                            {!notification.read_status && (
                              <Badge variant="default" className="h-5 px-1.5 text-xs">New</Badge>
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          )}
                          <span className="text-xs text-muted-foreground mt-2 block">
                            {formatTimestamp(notification.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read_status && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteMutation.mutate(notification.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Notifications;
