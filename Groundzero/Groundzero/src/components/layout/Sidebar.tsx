import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Separator } from '@/components/ui/separator';
import { getNavigationForRole, NavSection, MODELING_ARTIST_NAV, PRODUCTION_ARTIST_NAV } from '@/config/roleNavigation';
import { 
  SCRIPT_NAV, 
  CONCEPT_NAV, 
  STORYBOARD_NAV, 
  EDIT_LINEUP_NAV, 
  ANIMATIC_NAV, 
  TECH_NAV,
  DIRECTOR_PREPROD_NAV,
  PRODUCER_PREPROD_NAV,
  PreprodNavSection
} from '@/config/preprodNavigation';
import { ROLE_LABELS } from '@/types/roles';
import { getDashboardForRole } from '@/types/preprodRoles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Maps dashboard type to navigation
function getNavigationForDashboardType(
  dashboardType: string,
  baseRole: string,
  isAdmin: boolean
): (NavSection | PreprodNavSection)[] | null {
    // Pre-production dashboards
    switch (dashboardType) {
      case 'script_writer':
      case 'script_supervisor':
        return SCRIPT_NAV;
      case 'concept_artist':
      case 'art_director':
        return CONCEPT_NAV;
      case 'storyboard_artist':
      case 'storyboard_supervisor':
        return STORYBOARD_NAV;
      case 'editor':
      case 'editorial_supervisor':
        return EDIT_LINEUP_NAV;
      case 'previz_artist':
        return ANIMATIC_NAV;
      case 'technical_director':
        return TECH_NAV;
      
      // Production dashboards - Modeling/Texturing artists get AI generator access
      case 'modeling_artist':
      case 'texturing_artist':
        return MODELING_ARTIST_NAV;
      
      // Other production artists (consume proxies, don't generate)
      case 'rigging_artist':
      case 'animation_artist':
      case 'lighting_artist':
      case 'vfx_artist':
      case 'render_artist':
        return PRODUCTION_ARTIST_NAV;
      
      case 'production_lead':
        return getNavigationForRole('hod', isAdmin);
      
      // Management dashboards
      case 'director':
        return DIRECTOR_PREPROD_NAV;
      case 'producer':
        return PRODUCER_PREPROD_NAV;
      
      default:
        return null;
    }
}

interface RoleNavSectionProps {
  section: NavSection | PreprodNavSection;
  collapsed: boolean;
  pathname: string;
}

function RoleNavSection({ section, collapsed, pathname }: RoleNavSectionProps) {
  const Icon = section.icon;
  
  return (
    <div className="space-y-1">
      {!collapsed && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider",
          section.color || "text-muted-foreground"
        )}>
          <Icon className="w-3.5 h-3.5" />
          {section.title}
        </div>
      )}
      {section.items.map((item) => {
        const isActive = pathname === item.href;
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <ItemIcon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, profile, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = usePagePermissions();
  const { role, isClient, isLoading: roleLoading } = useProductionRole();

  // Fetch user profile with specific_role and phase
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['sidebar-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('specific_role, phase, role')
        .eq('user_id', user.id)
        .single();
      return data;
    }
  });

  const isLoading = authLoading || adminLoading || roleLoading || profileLoading;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Determine navigation based on specific_role and phase
  let navigation: (NavSection | PreprodNavSection)[] = [];
  
  if (!isLoading) {
    const specificRole = userProfile?.specific_role;
    
    // PRIORITY 1: Use specific_role to determine dashboard and navigation
    if (specificRole) {
      const dashboardType = getDashboardForRole(specificRole);
      const navForDashboard = getNavigationForDashboardType(dashboardType, role, isAdmin);
      if (navForDashboard) {
        navigation = navForDashboard;
      } else {
        // Fallback to standard role-based navigation
        navigation = getNavigationForRole(role, isAdmin);
      }
    } else {
      // PRIORITY 2: Use standard role-based navigation
      navigation = getNavigationForRole(role, isAdmin);
    }
  }

  // Client has special redirect
  if (isClient) {
    // Will be handled by RoleDashboardRouter
  }

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Scenecraft</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "shrink-0 text-muted-foreground hover:text-foreground",
            collapsed && "absolute -right-3 top-5 bg-sidebar border border-sidebar-border rounded-full w-6 h-6"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col h-[calc(100vh-4rem)] p-3 overflow-y-auto">
        <div className="flex-1 space-y-4">
          {isLoading ? (
            <div className="space-y-2 px-3 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            navigation.map((section, index) => (
              <div key={section.title}>
                <RoleNavSection
                  section={section}
                  collapsed={collapsed}
                  pathname={location.pathname}
                />
                {index < navigation.length - 1 && (
                  <Separator className="my-3" />
                )}
              </div>
            ))
          )}
        </div>

        {/* User Info & Sign Out */}
        <div className="border-t border-sidebar-border pt-3 space-y-1 mt-auto">
          {isLoading ? (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
              {!collapsed && (
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-3 bg-muted rounded animate-pulse w-16" />
                </div>
              )}
            </div>
          ) : profile && (
            <div className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2",
              !collapsed && "border-b border-sidebar-border pb-3 mb-2"
            )}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {profile.full_name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.specific_role || (isAdmin ? 'Admin' : ROLE_LABELS[role] || 'Artist')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Profile link */}
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              location.pathname === '/settings'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <User className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Profile</span>}
          </Link>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
