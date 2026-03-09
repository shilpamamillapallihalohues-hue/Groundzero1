import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface LivePresenceIndicatorProps {
  projectId: string;
  pageKey: string;
  assetId?: string;
}

interface PresenceUser {
  user_id: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
  last_seen_at: string;
}

export function LivePresenceIndicator({ projectId, pageKey, assetId }: LivePresenceIndicatorProps) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Fetch active users on this page
  const { data: presenceUsers } = useQuery({
    queryKey: ["collaboration-presence", projectId, pageKey],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("collaboration_presence")
        .select("*, profile:profiles!collaboration_presence_user_id_fkey(full_name, avatar_url)")
        .eq("project_id", projectId)
        .eq("page_key", pageKey)
        .gte("last_seen_at", fiveMinutesAgo);

      if (error) throw error;
      return data as unknown as PresenceUser[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Update own presence
  const updatePresenceMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase.from("collaboration_presence").upsert(
        {
          user_id: profile.id,
          project_id: projectId,
          page_key: pageKey,
          asset_id: assetId || null,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,project_id,page_key",
        }
      );

      if (error) throw error;
    },
  });

  // Update presence on mount and every 30 seconds
  useEffect(() => {
    updatePresenceMutation.mutate();

    const interval = setInterval(() => {
      updatePresenceMutation.mutate();
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId, pageKey, assetId]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaboration_presence",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["collaboration-presence", projectId, pageKey] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, pageKey, queryClient]);

  const otherUsers = presenceUsers?.filter((p) => p.profile) || [];

  if (otherUsers.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{otherUsers.length} online</span>
        </Badge>

        <div className="flex -space-x-2">
          {otherUsers.slice(0, 5).map((presence, index) => (
            <Tooltip key={presence.user_id}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-green-500">
                  {presence.profile.avatar_url ? (
                    <AvatarImage src={presence.profile.avatar_url} alt={presence.profile.full_name} />
                  ) : null}
                  <AvatarFallback className={getRandomColor(presence.profile.full_name)}>
                    {getInitials(presence.profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{presence.profile.full_name}</p>
                <p className="text-xs text-muted-foreground">Currently viewing</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {otherUsers.length > 5 && (
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="bg-muted text-xs">+{otherUsers.length - 5}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
