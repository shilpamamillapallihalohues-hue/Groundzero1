import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Bookmark,
  Palette, 
  Image, 
  Film, 
  Video, 
  Layers,
  Box,
  Settings,
  Users,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Library,
  Sparkles,
  Workflow,
  BarChart3,
  Building2,
  Shield,
  Package,
  CheckCircle2,
  Clock,
  User,
  Bell,
  LucideIcon,
  Clapperboard,
  Target,
  ClipboardList,
  DollarSign,
  Calendar,
  FileSearch,
  Server,
  Brain,
  BookOpen,
  Wrench,
  Key,
  MoreHorizontal,
  Eye,
  Lock,
  PlayCircle,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductionRole } from '@/hooks/useProductionRole';
import { ROLE_SIDEBAR_SECTIONS, ProductionRole } from '@/types/roles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface SubMenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  locked?: boolean;
}

interface SubMenuCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  items: SubMenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  icon: LucideIcon;
  items?: SubMenuItem[];
  subCategories?: SubMenuCategory[];
  adminOnly?: boolean;
}

function buildMenuForRole(role: string, isSuperUser: boolean): MenuItem[] {
  if (isSuperUser) return MENU_STRUCTURE;

  if (role === 'director') {
    const directorMenus: MenuItem[] = [
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: LayoutDashboard,
        items: [
          { name: 'Director Hub', href: '/', icon: LayoutDashboard },
        ],
      },
      {
        id: 'pre-production',
        name: 'Pre-Production',
        icon: FileText,
        subCategories: [
          {
            id: 'script',
            name: 'Scripts & Reviews',
            icon: FileText,
            items: [
              { name: 'Script Review', href: '/director/preprod/script-review', icon: FileText },
              { name: 'Scene/Shot Review', href: '/director/scene-shot-review', icon: Clapperboard },
            ],
          },
          {
            id: 'concept',
            name: 'Concept Art',
            icon: Palette,
            items: [
              { name: 'AI Generation', href: '/preprod/concept/ai', icon: Sparkles },
              { name: 'Manual Concepts', href: '/preprod/concept/manual', icon: Image },
              { name: 'Concept Art Gallery', href: '/concept-wall', icon: Layers },
              { name: 'Concept Breakdown', href: '/preprod/concept/assets', icon: Package },
              { name: 'Presentation Review', href: '/director/preprod/presentation-review', icon: FileText },
            ],
          },
          {
            id: 'storyboard',
            name: 'Storyboards',
            icon: Image,
            items: [
              { name: 'Storyboard Dashboard', href: '/preprod/storyboard/dashboard', icon: Image },
            ],
          },
          {
            id: 'animatic',
            name: 'Animatics & Edit',
            icon: Video,
            items: [
              { name: 'Animatic Dashboard', href: '/preprod/animatic/dashboard', icon: Video },
              { name: 'Scene Animatics', href: '/preprod/animatic/scenes', icon: Film },
              { name: 'Edit Dashboard', href: '/preprod/edit-lineup/dashboard', icon: Film },
              { name: 'Shot Timeline', href: '/preprod/edit-lineup/timeline', icon: Clock },
            ],
          },
        ],
      },
      {
        id: 'mindspace',
        name: 'Mindspace',
        icon: Brain,
        items: [
          { name: 'Beat Board', href: '/director/beat-board', icon: Bookmark },
          { name: 'Character Combinations', href: '/director/complete-breakdown', icon: Users },
          { name: '3D Asset Review', href: '/director/preprod/3d-review', icon: Box },
          { name: 'VFX & Mocap Analysis', href: '/director/ai-intelligence', icon: Sparkles },
          { name: 'Creative Context', href: '/director/creative-context', icon: BookOpen },
        ],
      },
      {
        id: 'analysis',
        name: 'Analysis',
        icon: Library,
        items: [
          { name: 'Character Library', href: '/director/characters', icon: User },
          { name: 'Asset Library', href: '/library', icon: Library },
        ],
      },
    ];
    return directorMenus;
  }

  if (role === 'script_supervisor') {
    const scriptSupervisorMenus: MenuItem[] = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard }] },
      { id: 'free-flow', name: 'Free Flow', icon: FileText, items: [{ name: 'Script Editor', href: '/supervisor/script-editor', icon: FileText }, { name: 'Beat Board', href: '/supervisor/beat-board', icon: Bookmark }] },
      { id: 'references', name: 'References', icon: Image, items: [{ name: 'Project References', href: '/director/references', icon: Image }] },
      { id: 'script-breakdown', name: 'Script Breakdown', icon: FileText, items: [{ name: 'Script Breakdown', href: '/supervisor/script-breakdown', icon: FileText }] },
      { id: 'script-analysis', name: 'Script Analysis', icon: Brain, items: [{ name: 'Script Analysis', href: '/supervisor/script-analysis', icon: Brain }] },
      { id: 'mindspace', name: 'Mindspace', icon: Brain, items: [{ name: 'Character Combinations', href: '/director/complete-breakdown', icon: Users }, { name: 'Character Library', href: '/director/characters', icon: User }] },
      { id: 'shots', name: 'Shots', icon: Video, items: [{ name: 'Shot Management', href: '/supervisor/shots', icon: Video }, { name: 'All Shots View', href: '/supervisor/all-shots', icon: Eye }] },
      { id: 'creative-context', name: 'Creative Context', icon: BookOpen, items: [{ name: 'Context Upload', href: '/supervisor/creative-context', icon: BookOpen }] },
      { id: 'projects', name: 'Projects', icon: Film, items: [{ name: 'Projects', href: '/supervisor/projects', icon: Film }] },
    ];
    return scriptSupervisorMenus;
  }

  if (role === 'script_writer') {
    const scriptWriterMenus: MenuItem[] = [
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: LayoutDashboard,
        items: [
          { name: 'Home', href: '/', icon: LayoutDashboard },
          { name: 'Script Management', href: '/script-management', icon: FileText },
        ],
      },
      {
        id: 'pre-production',
        name: 'Script',
        icon: FileText,
        items: [
          { name: 'Script Dashboard', href: '/preprod/script/dashboard', icon: FileText },
          { name: 'Scene Editor', href: '/preprod/script/scenes', icon: Clapperboard },
          { name: 'AI Breakdown', href: '/preprod/script/ai-breakdown', icon: Brain },
          { name: 'Story Analysis', href: '/preprod/script/story-analysis', icon: BarChart3 },
          { name: 'Script Versions', href: '/preprod/script/versions', icon: FileText },
        ],
      },
      {
        id: 'account',
        name: 'Account',
        icon: User,
        items: [
          { name: 'Profile', href: '/profile', icon: User },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/settings', icon: Settings },
        ],
      },
    ];
    return scriptWriterMenus;
  }

  if (role === 'art_director') {
    const artDirectorMenus: MenuItem[] = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, items: [{ name: 'Dashboard', href: '/art-director/dashboard', icon: LayoutDashboard }] },
      { id: 'asset-concepts', name: 'Asset Concepts', icon: Palette, items: [{ name: 'AI Generation', href: '/art-director/concepts/automate', icon: Sparkles }, { name: 'Manual Upload', href: '/art-director/concepts/manual', icon: Image }] },
      { id: 'gallery', name: 'Gallery', icon: Image, items: [{ name: 'Concept Gallery', href: '/art-director/concepts/gallery', icon: Layers }] },
      { id: 'character-tools', name: 'Character Tools', icon: User, items: [{ name: 'Facial Turnaround', href: '/art-director/facial-turnaround', icon: User }] },
      { id: 'mindspace', name: 'Mindspace', icon: Brain, items: [{ name: 'Character Combinations', href: '/director/complete-breakdown', icon: Users }, { name: 'Character Library', href: '/director/characters', icon: User }] },
      { id: 'presentations', name: 'Presentations', icon: FileText, items: [{ name: 'Asset Review PPT', href: '/art-director/presentations', icon: FileText }] },
      { id: 'creative-context', name: 'Creative Context', icon: BookOpen, items: [{ name: 'Lore & Canon', href: '/art-director/creative-context', icon: BookOpen }] },
      { id: 'projects', name: 'Projects', icon: Film, items: [{ name: 'All Projects', href: '/projects', icon: Film }] },
    ];
    return artDirectorMenus;
  }

  return MENU_STRUCTURE;
}

const MENU_STRUCTURE: MenuItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { name: 'Home', href: '/', icon: LayoutDashboard },
      { name: 'Project Status', href: '/project-status', icon: Target },
      { name: 'Work Tracking', href: '/work-tracking', icon: ClipboardList },
    ],
  },
  {
    id: 'pre-production',
    name: 'Pre-Production',
    icon: FileText,
    subCategories: [
      {
        id: 'script',
        name: 'Script Management',
        icon: FileText,
        items: [
          { name: 'Script Dashboard', href: '/preprod/script/dashboard', icon: FileText },
          { name: 'Scene Editor', href: '/preprod/script/scenes', icon: Clapperboard },
          { name: 'AI Breakdown', href: '/preprod/script/ai-breakdown', icon: Brain },
          { name: 'Story Analysis', href: '/preprod/script/story-analysis', icon: BarChart3 },
          { name: 'Story Frameworks', href: '/preprod/script/story-frameworks', icon: Layers },
          { name: 'Script Versions', href: '/preprod/script/versions', icon: FileText },
          { name: 'Script Lock', href: '/preprod/script/lock', icon: Shield },
        ],
      },
      {
        id: 'concept',
        name: 'Concept Arts',
        icon: Palette,
        items: [
          { name: 'AI Generation', href: '/preprod/concept/ai', icon: Sparkles },
          { name: 'Concept Breakdown', href: '/preprod/concept/assets', icon: Package },
          { name: 'Manual Upload', href: '/preprod/concept/manual', icon: Image },
          { name: 'Concept Reviews', href: '/preprod/concept/reviews', icon: CheckCircle2 },
          { name: 'Concept Wall', href: '/concept-wall', icon: Layers },
          { name: 'Characters', href: '/characters', icon: User },
        ],
      },
      {
        id: 'storyboard',
        name: 'Storyboards',
        icon: Image,
        items: [
          { name: 'Storyboard Dashboard', href: '/preprod/storyboard/dashboard', icon: Image },
          { name: 'Shot Lock', href: '/preprod/storyboard/lock', icon: Shield },
        ],
      },
      {
        id: 'animatic',
        name: 'Animatic & Edit',
        icon: Video,
        items: [
          { name: 'Animatic Dashboard', href: '/preprod/animatic/dashboard', icon: Video },
          { name: 'Scene Animatics', href: '/preprod/animatic/scenes', icon: Film },
          { name: 'AI Previz', href: '/preprod/animatic/ai', icon: Sparkles },
          { name: 'Sound & Dialogue', href: '/preprod/animatic/sound', icon: Video },
          { name: 'Edit Dashboard', href: '/preprod/edit-lineup/dashboard', icon: Film },
          { name: 'Shot Timeline', href: '/preprod/edit-lineup/timeline', icon: Clock },
        ],
      },
      {
        id: 'technical',
        name: 'Technical',
        icon: Settings,
        items: [
          { name: 'Tech Dashboard', href: '/preprod/tech/dashboard', icon: Settings },
          { name: 'Pipeline Definition', href: '/preprod/tech/pipeline', icon: Workflow },
          { name: 'Render Estimates', href: '/preprod/tech/render-estimates', icon: Server },
          { name: 'FX & Mocap', href: '/preprod/tech/fx-mocap', icon: Sparkles },
        ],
      },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    icon: Clapperboard,
    items: [
      { name: 'Pipeline Dashboard', href: '/pipeline', icon: Workflow },
      { name: 'Scenes', href: '/scenes', icon: Clapperboard },
      { name: 'Approvals', href: '/approvals', icon: CheckCircle2 },
      { name: 'Library', href: '/library', icon: Library },
      { name: 'References', href: '/references', icon: Library },
      { name: '3D Generator', href: '/model-generator', icon: Layers },
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: Film,
    items: [
      { name: 'All Projects', href: '/projects', icon: Film },
      { name: 'Tasks', href: '/tasks', icon: ClipboardList },
      { name: 'Timeline', href: '/timeline', icon: Calendar },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    icon: Users,
    items: [
      { name: 'Team Members', href: '/team', icon: Users },
      { name: 'Departments', href: '/departments', icon: Building2 },
      { name: 'Vendors', href: '/vendors', icon: Building2 },
    ],
  },
  {
    id: 'virtual-production',
    name: 'Virtual Production',
    icon: Film,
    items: [
      { name: 'VP Dashboard', href: '/vp/dashboard', icon: LayoutDashboard },
      { name: 'Location Intelligence', href: '/vp/location-intelligence', icon: Target },
      { name: 'Camera Scouting', href: '/vp/camera-scouting', icon: Video },
    ],
  },
  {
    id: 'ai-tools',
    name: 'AI Tools',
    icon: Brain,
    items: [
      { name: 'AI Settings', href: '/ai-settings', icon: Settings },
      { name: 'AI Workflows', href: '/ai-workflows', icon: Workflow },
      { name: 'ComfyUI Studio', href: '/comfyui-studio', icon: Sparkles },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: Shield,
    adminOnly: true,
    items: [
      { name: 'System Dashboard', href: '/system-dashboard', icon: BarChart3 },
      { name: 'Admin Panel', href: '/admin', icon: Shield },
      { name: 'Infrastructure', href: '/admin/infrastructure', icon: Server },
      { name: 'VFX Overview', href: '/admin/vfx-overview', icon: Sparkles },
      { name: 'System Settings', href: '/system-settings', icon: Settings },
      { name: 'Audit Logs', href: '/audit-logs', icon: FileSearch },
      { name: 'SLA Penalties', href: '/sla-penalties', icon: DollarSign },
    ],
  },
  {
    id: 'tools',
    name: 'Tools',
    icon: Wrench,
    items: [
      { name: 'External Tools', href: '/external-tools', icon: Key },
      { name: 'Tool Config', href: '/tool-configuration', icon: Settings },
    ],
  },
  {
    id: 'account',
    name: 'Account',
    icon: User,
    items: [
      { name: 'Profile', href: '/profile', icon: User },
      { name: 'Notifications', href: '/notifications', icon: Bell },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const DEFAULT_VISIBLE_MENUS = ['dashboard', 'pre-production', 'production', 'projects', 'team'];
const STORAGE_KEY = 'groundzero-visible-menus';

// GitHub-style nested submenu
function NestedSubMenu({ category, onClose }: { category: SubMenuCategory; onClose: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const Icon = category.icon;
  const isActive = category.items.some(item => location.pathname === item.href);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 text-sm transition-colors cursor-pointer",
          isActive || isHovered
            ? "text-foreground bg-muted"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span>{category.name}</span>
        </div>
        <ChevronRight className="w-3 h-3" />
      </div>

      <div
        className={cn(
          "absolute left-full top-0 ml-0.5 min-w-[200px] py-1 bg-popover border border-border rounded-lg shadow-lg z-50 transition-all duration-100",
          isHovered ? "opacity-100 visible" : "opacity-0 invisible"
        )}
      >
        {category.items.map((item) => {
          const ItemIcon = item.icon;
          const isItemActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                isItemActive
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={onClose}
            >
              <ItemIcon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// GitHub-style menu dropdown
function MenuDropdown({ menu, isActive }: { menu: MenuItem; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const Icon = menu.icon;
  const hasSubCategories = menu.subCategories && menu.subCategories.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors relative",
          isActive || isOpen
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{menu.name}</span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isOpen && "rotate-180"
        )} />
        {/* Active underline indicator - Orange style */}
        {isActive && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--warning))] rounded-full" />
        )}
      </button>

      <div
        className={cn(
          "absolute top-full left-0 mt-0 min-w-[220px] py-1 bg-popover border border-border rounded-lg shadow-lg z-50 transition-all duration-100",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
      >
        {hasSubCategories ? (
          menu.subCategories!.map((category) => (
            <NestedSubMenu 
              key={category.id} 
              category={category} 
              onClose={() => setIsOpen(false)}
            />
          ))
        ) : (
          menu.items?.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive = location.pathname === item.href;
            const isLocked = (item as SubMenuItem).locked;
            
            if (isLocked) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-muted-foreground/50 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <Lock className="w-3 h-3" />
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                  isItemActive
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => setIsOpen(false)}
              >
                <ItemIcon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DesktopTopMenu() {
  const location = useLocation();
  const { role, isSuperUser, isLoading } = useProductionRole();

  // Clear localStorage when role changes to prevent stale menu state
  const previousRoleRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!isLoading && role && previousRoleRef.current && previousRoleRef.current !== role) {
      // Role changed - clear cached menu preferences
      localStorage.removeItem(STORAGE_KEY);
      console.log('Role changed from', previousRoleRef.current, 'to', role, '- clearing menu cache');
    }
    if (!isLoading && role) {
      previousRoleRef.current = role;
    }
  }, [role, isLoading]);

  const roleMenuStructure = useMemo(() => buildMenuForRole(role, isSuperUser), [role, isSuperUser]);
  
  const allowedSections = ROLE_SIDEBAR_SECTIONS[role as ProductionRole] || ['dashboard'];
  const hasFullAccess = isSuperUser || allowedSections.includes('all');
  
  const menuToSectionMap: Record<string, string[]> = {
    'dashboard': ['dashboard', 'all'],
    'pre-production': ['pre-production', 'all'],
    'production': ['production', 'all'],
    'projects': ['projects', 'all'],
    'team': ['team', 'all'],
    'ai-tools': ['ai-tools', 'all'],
    'admin': ['admin', 'all'],
    'tools': ['tools', 'all', 'work-tracking'],
    'account': ['account', 'all', 'dashboard', 'my-tasks', 'work-tracking', 'client-dashboard', 'reviews'],
  };
  
  const isCustomRoleMenu = ['script_supervisor', 'director', 'script_writer', 'art_director'].includes(role);

  const [visibleMenuIds, setVisibleMenuIds] = useState<string[]>(() => {
    // For locked-menu roles, always show all menus - no localStorage
    if (['script_supervisor', 'director', 'script_writer', 'art_director'].includes(role)) {
      return [];
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load menu preferences:', e);
    }
    return DEFAULT_VISIBLE_MENUS;
  });

  const handleToggleMenu = (menuId: string) => {
    if (isCustomRoleMenu) return; // Don't allow toggling for locked roles
    setVisibleMenuIds(prev => {
      const newValue = prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
      return newValue;
    });
  };

  const isMenuActive = (menu: MenuItem): boolean => {
    if (menu.items) {
      const hasExactMatch = menu.items.some(item => location.pathname === item.href);
      if (hasExactMatch) return true;
      return menu.items.some(item => {
        if (item.href === '/') return location.pathname === '/';
        return location.pathname.startsWith(item.href);
      });
    }
    if (menu.subCategories) {
      return menu.subCategories.some(cat => 
        cat.items.some(item => {
          if (item.href === '/') return location.pathname === '/';
          return location.pathname === item.href || location.pathname.startsWith(item.href);
        })
      );
    }
    return false;
  };

  const availableMenus = roleMenuStructure.filter(menu => {
    if (menu.adminOnly && !isSuperUser) return false;
    if (isCustomRoleMenu) return true;
    if (hasFullAccess) return true;
    const menuSections = menuToSectionMap[menu.id] || [];
    return menuSections.some(section => allowedSections.includes(section));
  });

  // For locked-menu roles, show all available menus deterministically
  // For other roles, use localStorage preferences with pruning
  const displayedMenus = isCustomRoleMenu 
    ? availableMenus 
    : (() => {
        const allowedIds = new Set(availableMenus.map(m => m.id));
        const validIds = visibleMenuIds.filter(id => allowedIds.has(id));
        const effectiveIds = validIds.length > 0 ? validIds : availableMenus.map(m => m.id);
        return availableMenus.filter(menu => effectiveIds.includes(menu.id));
      })();

  const hiddenMenus = availableMenus.filter(menu => !displayedMenus.includes(menu));

  const isLockedMenuRole = role === 'script_supervisor' || role === 'art_director' || role === 'director';

  // Show loading skeleton while profile is loading to prevent showing wrong menu
  if (isLoading) {
    return (
      <nav className="flex items-center border-b border-border h-10">
        <div className="flex gap-4 px-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 w-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </nav>
    );
  }

  // GitHub-style locked menu for specific roles - with underline indicator
  if (isLockedMenuRole) {
    return (
      <nav className="flex items-center border-b border-border">
        {availableMenus.map((menu) => {
          const Icon = menu.icon;
          const hasSingleItem = menu.items?.length === 1;
          const href = menu.items?.[0]?.href || '/';
          
          // Check if this specific menu is active (not overlapping with others)
          const isActive = menu.items?.some(item => {
            // For dashboard/root, only match exact path
            if (item.href === '/') return location.pathname === '/';
            // For other paths, check if current path starts with this href
            return location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          }) || false;
          
          // Single item menus get direct links
          if (hasSingleItem) {
            return (
              <Link
                key={menu.id}
                to={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{menu.name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--warning))] rounded-full" />
                )}
              </Link>
            );
          }
          
          // Multi-item menus get dropdown
          return (
            <MenuDropdown 
              key={menu.id} 
              menu={menu} 
              isActive={isActive || false}
            />
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex items-center border-b border-border">
      {displayedMenus.map((menu) => {
        const isActive = isMenuActive(menu);
        return (
          <MenuDropdown 
            key={menu.id} 
            menu={menu} 
            isActive={isActive}
          />
        );
      })}
      
      {/* Menu Configuration */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 ml-1 hover:bg-muted rounded-md"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-lg">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Customize Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableMenus.map((menu) => {
            const Icon = menu.icon;
            return (
              <DropdownMenuCheckboxItem
                key={menu.id}
                checked={visibleMenuIds.includes(menu.id)}
                onCheckedChange={() => handleToggleMenu(menu.id)}
                className="text-sm"
              >
                <Icon className="w-4 h-4 mr-2" />
                {menu.name}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {hiddenMenus.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              More
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-lg">
            {hiddenMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = isMenuActive(menu);
              return (
                <DropdownMenu key={menu.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "text-foreground bg-muted"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{menu.name}</span>
                      </div>
                      <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" className="w-52 rounded-lg">
                    {menu.subCategories ? (
                      menu.subCategories.map((cat) => (
                        <div key={cat.id}>
                          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                            {cat.name}
                          </div>
                          {cat.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isItemActive = location.pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                                  isItemActive
                                    ? "text-foreground bg-muted"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                              >
                                <ItemIcon className="w-4 h-4" />
                                <span>{item.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      menu.items?.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                              isItemActive
                                ? "text-foreground bg-muted"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <ItemIcon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
