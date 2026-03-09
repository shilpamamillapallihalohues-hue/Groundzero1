import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  Palette, 
  Video, 
  Film,
  Shield,
  Settings,
  Users,
  Brain,
  Image,
  Sparkles,
  Layers,
  Eye,
  CheckCircle2,
  User,
  LucideIcon,
  ClipboardList,
  FolderOpen,
  MessageSquare,
  BookOpen,
  FileText as PresentationIcon
} from 'lucide-react';
import { useProductionRole } from '@/hooks/useProductionRole';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  activeMatch?: string[];
}

// Script Supervisor Navigation
const SCRIPT_SUPERVISOR_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/supervisor/dashboard' },
  { icon: FileText, label: 'Free Flow', href: '/supervisor/script-editor', activeMatch: ['/supervisor/script-editor', '/supervisor/beat-board'] },
  { icon: FolderOpen, label: 'Projects', href: '/projects' },
  { icon: Brain, label: 'Analysis', href: '/supervisor/script-analysis' },
  { icon: Video, label: 'Shots', href: '/supervisor/shots' },
];

// Art Director Navigation
const ART_DIRECTOR_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/art-director/dashboard' },
  { icon: Sparkles, label: 'AI Gen', href: '/art-director/concepts/automate' },
  { icon: Image, label: 'Upload', href: '/art-director/concepts/manual' },
  { icon: Layers, label: 'Gallery', href: '/art-director/concepts/gallery' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

// Storyboard Supervisor Navigation
const STORYBOARD_SUPERVISOR_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/storyboard-supervisor/dashboard' },
  { icon: Layers, label: 'Scenes', href: '/storyboard-supervisor/scene-breakdown' },
  { icon: Film, label: 'Shots', href: '/storyboard-supervisor/shots-breakdown' },
  { icon: Image, label: 'Panels', href: '/storyboard-supervisor/panel-view' },
  { icon: Eye, label: 'Director', href: '/storyboard-supervisor/director-inputs' },
];

// Director Navigation - Chats, Free Flow, Concept Reviews, Presentations, Context Reviews
const DIRECTOR_NAV: NavItem[] = [
  { icon: MessageSquare, label: 'Chats', href: '/chat', activeMatch: ['/chat'] },
  { icon: FileText, label: 'Free Flow', href: '/director/script', activeMatch: ['/director/script', '/director/beat-board'] },
  { icon: Palette, label: 'Concepts', href: '/director/preprod/concept-review', activeMatch: ['/director/preprod/concept-review', '/director/review'] },
  { icon: BookOpen, label: 'Context', href: '/director/creative-context', activeMatch: ['/director/creative-context', '/director/context'] },
];

// Super Admin Navigation
const SUPER_ADMIN_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/' },
  { icon: Film, label: 'Projects', href: '/projects' },
  { icon: ClipboardList, label: 'Tasks', href: '/tasks' },
  { icon: Shield, label: 'Admin', href: '/admin' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

// Default Navigation
const DEFAULT_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/' },
  { icon: Film, label: 'Projects', href: '/projects' },
  { icon: ClipboardList, label: 'Tasks', href: '/tasks' },
  { icon: Users, label: 'Team', href: '/team' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

function getNavForRole(role: string | undefined, isSuperUser: boolean): NavItem[] {
  if (isSuperUser) return SUPER_ADMIN_NAV;
  
  // Normalize role string for matching
  const normalizedRole = role?.toLowerCase()?.trim();
  
  switch (normalizedRole) {
    case 'script_supervisor':
    case 'scriptsupervisor':
      return SCRIPT_SUPERVISOR_NAV;
    case 'art_director':
    case 'artdirector':
      return ART_DIRECTOR_NAV;
    case 'storyboard_supervisor':
    case 'storyboardsupervisor':
      return STORYBOARD_SUPERVISOR_NAV;
    case 'director':
      return DIRECTOR_NAV;
    default:
      return DEFAULT_NAV;
  }
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isSuperUser, isLoading, profile } = useProductionRole();
  
  // Debug logging for role issues
  console.log('[MobileBottomNav] role:', role, 'isLoading:', isLoading, 'profile:', profile?.role);
  
  const navItems = getNavForRole(role, isSuperUser);

  const isActive = (item: NavItem) => {
    if (item.activeMatch) {
      return item.activeMatch.some(path => location.pathname.startsWith(path));
    }
    if (item.href === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.href);
  };

  // Show loading skeleton while role is being determined
  if (isLoading) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset">
        <div className="flex items-center justify-around h-16 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 bg-muted animate-pulse rounded-xl" />
              <div className="w-8 h-2 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 group",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                active 
                  ? "bg-primary/10 scale-110" 
                  : "group-hover:bg-secondary group-active:scale-95"
              )}>
                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active && "text-primary")} />
              </div>
              <span className={cn(
                "text-[10px] transition-colors",
                active ? "font-semibold text-primary" : "font-medium group-hover:text-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
