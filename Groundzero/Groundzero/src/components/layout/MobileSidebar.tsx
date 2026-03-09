import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  FileText,
  Palette,
  Image,
  Film,
  Video,
  Layers,
  Box,
  Settings,
  Users,
  LayoutDashboard,
  Library,
  Workflow,
  BarChart3,
  Building2,
  Shield,
  Package,
  Eye,
  CheckCircle2,
  Bell,
  LucideIcon,
  Clapperboard,
  Target,
  ClipboardList,
  Calendar,
  FileSearch,
  Server,
  Brain,
  BookOpen,
  FolderOpen,
  MessageSquare,
  Bookmark,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProductionRole } from '@/hooks/useProductionRole';
import { ROLE_LABELS } from '@/types/roles';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubMenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface MenuItem {
  id: string;
  name: string;
  icon: LucideIcon;
  items: SubMenuItem[];
  adminOnly?: boolean;
}

// Role-specific compact menus
const SCRIPT_SUPERVISOR_MENU: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard }] },
  { id: 'free-flow', name: 'Free Flow', icon: FileText, items: [{ name: 'Script Editor', href: '/supervisor/script-editor', icon: FileText }, { name: 'Beat Board', href: '/supervisor/beat-board', icon: Brain }] },
  { id: 'references', name: 'References', icon: Image, items: [{ name: 'References', href: '/director/references', icon: Image }] },
  { id: 'projects', name: 'Projects', icon: FolderOpen, items: [{ name: 'Projects', href: '/projects', icon: FolderOpen }] },
  { id: 'breakdown', name: 'Script Breakdown', icon: FileText, items: [{ name: 'Script Breakdown', href: '/supervisor/script-breakdown', icon: FileText }] },
  { id: 'analysis', name: 'Script Analysis', icon: Brain, items: [{ name: 'Script Analysis', href: '/supervisor/script-analysis', icon: Brain }] },
  { id: 'shots', name: 'Shots', icon: Video, items: [{ name: 'Shots', href: '/supervisor/shots', icon: Video }] },
];

const STORYBOARD_SUPERVISOR_MENU: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/storyboard-supervisor/dashboard', icon: LayoutDashboard }] },
  { id: 'scenes', name: 'Scene Breakdown', icon: Layers, items: [{ name: 'Scene Breakdown', href: '/storyboard-supervisor/scene-breakdown', icon: Layers }] },
  { id: 'shots', name: 'Shots Breakdown', icon: Film, items: [{ name: 'Shots Breakdown', href: '/storyboard-supervisor/shots-breakdown', icon: Film }] },
  { id: 'panels', name: 'Panel View', icon: Image, items: [{ name: 'Panel View', href: '/storyboard-supervisor/panel-view', icon: Image }] },
  { id: 'director', name: 'Director Inputs', icon: Eye, items: [{ name: 'Director Inputs', href: '/storyboard-supervisor/director-inputs', icon: Eye }] },
];

const ART_DIRECTOR_MENU: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/art-director/dashboard', icon: LayoutDashboard }] },
  { id: 'ai', name: 'AI Generation', icon: Sparkles, items: [{ name: 'AI Generation', href: '/art-director/concepts/automate', icon: Sparkles }] },
  { id: 'manual', name: 'Manual Upload', icon: Image, items: [{ name: 'Manual Upload', href: '/art-director/concepts/manual', icon: Image }] },
  { id: 'gallery', name: 'Gallery', icon: Layers, items: [{ name: 'Gallery', href: '/art-director/concepts/gallery', icon: Layers }] },
  { id: 'creative-context', name: 'Creative Context', icon: BookOpen, items: [{ name: 'Lore & Canon', href: '/art-director/creative-context', icon: BookOpen }] },
  { id: 'projects', name: 'Projects', icon: FolderOpen, items: [{ name: 'Projects', href: '/projects', icon: FolderOpen }] },
];

// Director menu - Full access to generation and review tools
const DIRECTOR_MENU: MenuItem[] = [
  { id: 'chats', name: 'Chats', icon: MessageSquare, items: [{ name: 'Chats', href: '/chat', icon: MessageSquare }] },
  { id: 'scripts', name: 'Scripts & Reviews', icon: FileText, items: [
    { name: 'Script Review', href: '/director/preprod/script-review', icon: FileText },
    { name: 'Scene/Shot Review', href: '/director/scene-shot-review', icon: Clapperboard },
  ]},
  { id: 'concepts', name: 'Concept Art', icon: Palette, items: [
    { name: 'AI Generation', href: '/preprod/concept/ai', icon: Sparkles },
    { name: 'Manual Concepts', href: '/preprod/concept/manual', icon: Image },
    { name: 'Concept Art Gallery', href: '/concept-wall', icon: Layers },
    { name: 'Concept Breakdown', href: '/preprod/concept/assets', icon: Package },
    { name: 'Presentation Review', href: '/director/preprod/presentation-review', icon: FileText },
  ]},
  { id: 'storyboards', name: 'Storyboards', icon: Image, items: [
    { name: 'Storyboard Dashboard', href: '/preprod/storyboard/dashboard', icon: Image },
  ]},
  { id: 'animatics', name: 'Animatics & Edit', icon: Video, items: [
    { name: 'Animatic Dashboard', href: '/preprod/animatic/dashboard', icon: Video },
    { name: 'Scene Animatics', href: '/preprod/animatic/scenes', icon: Film },
    { name: 'Edit Dashboard', href: '/preprod/edit-lineup/dashboard', icon: Film },
    { name: 'Shot Timeline', href: '/preprod/edit-lineup/timeline', icon: Clock },
  ]},
  { id: 'mindspace', name: 'Mindspace', icon: Brain, items: [
    { name: 'Beat Board', href: '/director/beat-board', icon: Bookmark },
    { name: 'Character Combinations', href: '/director/complete-breakdown', icon: Users },
    { name: 'VFX & Mocap Analysis', href: '/director/ai-intelligence', icon: Sparkles },
    { name: '3D Asset Review', href: '/director/preprod/3d-review', icon: Box },
    { name: 'Creative Context', href: '/director/creative-context', icon: BookOpen },
  ]},
];

const DEFAULT_MENU: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }] },
  { id: 'projects', name: 'Projects', icon: Film, items: [
    { name: 'All Projects', href: '/projects', icon: Film },
    { name: 'Tasks', href: '/tasks', icon: ClipboardList },
    { name: 'Timeline', href: '/timeline', icon: Calendar },
  ]},
  { id: 'preprod', name: 'Pre-Production', icon: FileText, items: [
    { name: 'Script', href: '/preprod/script/dashboard', icon: FileText },
    { name: 'Concept Art', href: '/preprod/concept/dashboard', icon: Palette },
    { name: 'Storyboards', href: '/preprod/storyboard/dashboard', icon: Image },
  ]},
  { id: 'production', name: 'Production', icon: Clapperboard, items: [
    { name: 'Pipeline', href: '/pipeline', icon: Workflow },
    { name: 'Scenes', href: '/scenes', icon: Clapperboard },
    { name: 'Library', href: '/library', icon: Library },
  ]},
  { id: 'team', name: 'Team', icon: Users, items: [
    { name: 'Members', href: '/team', icon: Users },
    { name: 'Departments', href: '/departments', icon: Building2 },
  ]},
  { id: 'admin', name: 'Admin', icon: Shield, adminOnly: true, items: [
    { name: 'System', href: '/system-dashboard', icon: BarChart3 },
    { name: 'Admin Panel', href: '/admin', icon: Shield },
    { name: 'Infrastructure', href: '/admin/infrastructure', icon: Server },
    { name: 'Audit Logs', href: '/audit-logs', icon: FileSearch },
  ]},
];

function getMenuForRole(role: string | undefined, isAdmin: boolean): MenuItem[] {
  if (isAdmin) return DEFAULT_MENU;
  
  switch (role) {
    case 'script_supervisor':
      return SCRIPT_SUPERVISOR_MENU;
    case 'storyboard_supervisor':
      return STORYBOARD_SUPERVISOR_MENU;
    case 'art_director':
      return ART_DIRECTOR_MENU;
    case 'director':
      return DIRECTOR_MENU;
    default:
      return DEFAULT_MENU;
  }
}

function MobileMenuItem({ 
  menu, 
  pathname, 
  onNavigate 
}: { 
  menu: MenuItem; 
  pathname: string; 
  onNavigate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = menu.icon;
  const isActive = menu.items.some(item => pathname === item.href || pathname.startsWith(item.href));
  const isSingleItem = menu.items.length === 1;

  // Single item - direct link
  if (isSingleItem) {
    const item = menu.items[0];
    return (
      <Link
        to={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{menu.name}</span>
        {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
      </Link>
    );
  }

  // Multi-item - collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center justify-between px-3 py-2 rounded text-sm transition-colors",
          isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}>
          <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 shrink-0" />
            <span>{menu.name}</span>
          </div>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-7 mt-1 space-y-0.5">
          {menu.items.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors",
                  isItemActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <ItemIcon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { role, isSuperUser, isLoading } = useProductionRole();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    onOpenChange(false);
  };

  const handleNavigate = () => {
    onOpenChange(false);
  };

  const roleBasedMenus = getMenuForRole(role, isSuperUser);
  const availableMenus = roleBasedMenus.filter(menu => {
    if (menu.adminOnly && !isSuperUser) return false;
    return true;
  });

  // Show loading state while role is being determined
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 p-0 bg-[hsl(var(--sidebar-background))] border-r-sidebar-border">
          <SheetHeader className="h-11 px-4 flex flex-row items-center border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-muted animate-pulse" />
              <SheetTitle className="text-sm font-semibold text-foreground">SceneCraft</SheetTitle>
            </div>
          </SheetHeader>
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 bg-[hsl(var(--sidebar-background))] border-r-sidebar-border">
        <SheetHeader className="h-11 px-4 flex flex-row items-center border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2" onClick={handleNavigate}>
            <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <SheetTitle className="text-sm font-semibold text-foreground">SceneCraft</SheetTitle>
          </Link>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-7.5rem)]">
          <nav className="p-3 space-y-1">
            {availableMenus.map((menu) => (
              <MobileMenuItem
                key={menu.id}
                menu={menu}
                pathname={location.pathname}
                onNavigate={handleNavigate}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border bg-[hsl(var(--sidebar-background))] p-3">
          {profile && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                {profile.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ROLE_LABELS[role] || 'Team Member'}
                </p>
              </div>
            </div>
          )}

          <Separator className="bg-sidebar-border mb-3" />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => { navigate('/settings'); handleNavigate(); }}
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Settings
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-destructive border-sidebar-border hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
