import { 
  Film, 
  FileText, 
  Layers, 
  Image, 
  Users, 
  Settings, 
  LayoutDashboard,
  Palette,
  Clapperboard,
  Sparkles,
  FolderKanban,
  User,
  Search,
  Workflow,
  Brain,
  GitBranch,
  Shield,
  BarChart3,
  Key,
  PlayCircle,
  CheckCircle2,
  Building2,
  MessageSquare,
  Library,
  Wrench,
  Clock,
  AlertCircle,
  Target,
  ListChecks,
  Package,
  Video,
  History,
  Eye,
  Server,
  Activity,
  FileWarning,
  Monitor,
  HardDrive,
  Cpu,
  Bell,
  DollarSign,
  Calendar,
  FileSearch,
  ClipboardList,
  LucideIcon
} from 'lucide-react';
import { ProductionRole } from '@/types/roles';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  key: string;
}

export interface NavSection {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  color?: string;
}

// ==========================================
// ARTIST NAVIGATION (Role-specific routes)
// ==========================================
export const ARTIST_NAV: NavSection[] = [
  {
    title: 'My Workspace',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'My Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'My Tasks', href: '/artist/tasks', icon: FolderKanban, key: 'my-tasks' },
      { name: 'My Assets', href: '/artist/assets', icon: Package, key: 'my-assets' },
      { name: 'My Shots', href: '/artist/shots', icon: Video, key: 'my-shots' },
    ]
  },
  {
    title: 'Feedback',
    icon: MessageSquare,
    color: 'text-amber-500',
    items: [
      { name: 'Feedback', href: '/artist/feedback', icon: MessageSquare, key: 'feedback' },
    ]
  },
  {
    title: 'Resources',
    icon: Library,
    color: 'text-green-500',
    items: [
      { name: 'References', href: '/references', icon: Search, key: 'references' },
      { name: 'Library', href: '/library', icon: Library, key: 'library' },
    ]
  },
  {
    title: 'Tools',
    icon: Wrench,
    color: 'text-purple-500',
    items: [
      { name: 'External Tools', href: '/external-tools', icon: Key, key: 'external-tools' },
      { name: 'Tool Config', href: '/tool-configuration', icon: Settings, key: 'tool-config' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// MODELING ARTIST NAVIGATION (with 3D AI Tools)
// ==========================================
export const MODELING_ARTIST_NAV: NavSection[] = [
  {
    title: 'My Workspace',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'My Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'My Tasks', href: '/artist/tasks', icon: FolderKanban, key: 'my-tasks' },
      { name: 'My Assets', href: '/artist/assets', icon: Package, key: 'my-assets' },
      { name: 'My Shots', href: '/artist/shots', icon: Video, key: 'my-shots' },
    ]
  },
  {
    title: '3D Generation',
    icon: Layers,
    color: 'text-purple-500',
    items: [
      { name: '3D Model Generator', href: '/model-generator', icon: Layers, key: '3d-generator' },
    ]
  },
  {
    title: 'Feedback',
    icon: MessageSquare,
    color: 'text-amber-500',
    items: [
      { name: 'Feedback', href: '/artist/feedback', icon: MessageSquare, key: 'feedback' },
    ]
  },
  {
    title: 'Resources',
    icon: Library,
    color: 'text-green-500',
    items: [
      { name: 'References', href: '/references', icon: Search, key: 'references' },
      { name: 'Library', href: '/library', icon: Library, key: 'library' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// PRODUCTION ARTIST NAVIGATION (Animation, Lighting, VFX, Render)
// ==========================================
export const PRODUCTION_ARTIST_NAV: NavSection[] = [
  {
    title: 'My Workspace',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'My Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'My Tasks', href: '/artist/tasks', icon: FolderKanban, key: 'my-tasks' },
      { name: 'My Assets', href: '/artist/assets', icon: Package, key: 'my-assets' },
      { name: 'My Shots', href: '/artist/shots', icon: Video, key: 'my-shots' },
    ]
  },
  {
    title: 'Resources',
    icon: Library,
    color: 'text-green-500',
    items: [
      { name: 'References', href: '/references', icon: Search, key: 'references' },
      { name: 'Library', href: '/library', icon: Library, key: 'library' },
      { name: '3D Proxies', href: '/pipeline', icon: Layers, key: '3d-proxies' },
    ]
  },
  {
    title: 'Feedback',
    icon: MessageSquare,
    color: 'text-amber-500',
    items: [
      { name: 'Feedback', href: '/artist/feedback', icon: MessageSquare, key: 'feedback' },
    ]
  },
  {
    title: 'Tools',
    icon: Wrench,
    color: 'text-purple-500',
    items: [
      { name: 'External Tools', href: '/external-tools', icon: Key, key: 'external-tools' },
      { name: 'Tool Config', href: '/tool-configuration', icon: Settings, key: 'tool-config' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// HOD / DEPARTMENT LEAD NAVIGATION
// ==========================================
export const HOD_NAV: NavSection[] = [
  {
    title: 'Department',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Department Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'Department Assets', href: '/hod/assets', icon: Package, key: 'dept-assets' },
      { name: 'Department Shots', href: '/hod/shots', icon: Video, key: 'dept-shots' },
      { name: 'Tasks', href: '/hod/tasks', icon: FolderKanban, key: 'tasks' },
    ]
  },
  {
    title: 'Approvals',
    icon: CheckCircle2,
    color: 'text-amber-500',
    items: [
      { name: 'Internal Approvals', href: '/hod/approvals', icon: CheckCircle2, key: 'internal-approvals' },
    ]
  },
  {
    title: 'Team',
    icon: Users,
    color: 'text-green-500',
    items: [
      { name: 'Artists', href: '/hod/artists', icon: Users, key: 'artists' },
      { name: 'Department Progress', href: '/hod/progress', icon: BarChart3, key: 'dept-progress' },
    ]
  },
  {
    title: 'Resources',
    icon: Library,
    color: 'text-purple-500',
    items: [
      { name: 'Library', href: '/library', icon: Library, key: 'library' },
      { name: 'References', href: '/references', icon: Search, key: 'references' },
    ]
  },
  {
    title: 'Tools',
    icon: Wrench,
    color: 'text-cyan-500',
    items: [
      { name: 'Tool Config', href: '/tool-configuration', icon: Settings, key: 'tool-config' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// DIRECTOR NAVIGATION (Simplified & Locked)
// ==========================================
export const DIRECTOR_NAV: NavSection[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Director Hub', href: '/', icon: LayoutDashboard, key: 'dashboard' },
    ]
  },
  {
    title: 'Pre-Production',
    icon: FileText,
    color: 'text-amber-500',
    items: [
      { name: 'Script Review', href: '/director/preprod/script-review', icon: FileText, key: 'script-review' },
      { name: 'Concept Review', href: '/director/preprod/concept-review', icon: Palette, key: 'concept-review' },
    ]
  },
  {
    title: 'Resources',
    icon: Library,
    color: 'text-cyan-500',
    items: [
      { name: 'Asset Library', href: '/library', icon: Library, key: 'library' },
    ]
  },
];

// Director locked menu items (shown but disabled)
export const DIRECTOR_LOCKED_ITEMS = [
  { name: 'Storyboard Review', href: '/director/preprod/storyboard-review', icon: Clapperboard, key: 'storyboard-review' },
  { name: 'Animatic Review', href: '/director/preprod/animatic-review', icon: PlayCircle, key: 'animatic-review' },
  { name: 'Tech Review', href: '/director/preprod/tech-review', icon: Wrench, key: 'tech-review' },
  { name: 'Asset Reviews', href: '/director/asset-reviews', icon: Package, key: 'asset-reviews' },
];

// ==========================================
// PRODUCTION MANAGER NAVIGATION
// ==========================================
export const PRODUCTION_MANAGER_NAV: NavSection[] = [
  {
    title: 'Production',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Production Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'Projects', href: '/pm/projects', icon: Film, key: 'projects' },
      { name: 'Project Status', href: '/project-status', icon: Target, key: 'project-status' },
    ]
  },
  {
    title: 'Work Tracking',
    icon: ClipboardList,
    color: 'text-cyan-500',
    items: [
      { name: 'Daily Work Reports', href: '/work-tracking', icon: ClipboardList, key: 'work-tracking' },
      { name: 'Tasks', href: '/tasks', icon: FolderKanban, key: 'tasks' },
    ]
  },
  {
    title: 'Management',
    icon: Building2,
    color: 'text-amber-500',
    items: [
      { name: 'Departments', href: '/pm/departments', icon: Building2, key: 'departments' },
      { name: 'Assets', href: '/pm/assets', icon: Package, key: 'assets' },
      { name: 'Shots', href: '/pm/shots', icon: Video, key: 'shots' },
    ]
  },
  {
    title: 'Planning',
    icon: Clock,
    color: 'text-green-500',
    items: [
      { name: 'Timeline', href: '/pm/timeline', icon: Calendar, key: 'timeline' },
    ]
  },
  {
    title: 'Team',
    icon: Users,
    color: 'text-purple-500',
    items: [
      { name: 'Assignments', href: '/pm/assignments', icon: Users, key: 'assignments' },
      { name: 'Escalations', href: '/pm/escalations', icon: AlertCircle, key: 'escalations' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// PRODUCER NAVIGATION
// ==========================================
export const PRODUCER_NAV: NavSection[] = [
  {
    title: 'Executive',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Executive Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'Projects', href: '/producer/projects', icon: Film, key: 'projects' },
    ]
  },
  {
    title: 'Reports',
    icon: BarChart3,
    color: 'text-amber-500',
    items: [
      { name: 'Reports', href: '/producer/reports', icon: BarChart3, key: 'reports' },
      { name: 'Project Status', href: '/producer/project-status', icon: Target, key: 'project-status' },
      { name: 'Audit Logs', href: '/producer/audit-logs', icon: FileSearch, key: 'audit-logs' },
    ]
  },
  {
    title: 'Planning',
    icon: Clock,
    color: 'text-green-500',
    items: [
      { name: 'Timeline', href: '/producer/timeline', icon: Calendar, key: 'timeline' },
      { name: 'Script Management', href: '/producer/script', icon: FileText, key: 'script-management' },
    ]
  },
  {
    title: 'Vendors',
    icon: Building2,
    color: 'text-purple-500',
    items: [
      { name: 'Vendors', href: '/producer/vendors', icon: Building2, key: 'vendors' },
      { name: 'SLA & Penalties', href: '/producer/sla', icon: DollarSign, key: 'sla-penalties' },
    ]
  },
  {
    title: 'Organization',
    icon: Users,
    color: 'text-cyan-500',
    items: [
      { name: 'Team', href: '/producer/team', icon: Users, key: 'team' },
      { name: 'Departments', href: '/producer/departments', icon: Building2, key: 'departments' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// CLIENT NAVIGATION
// ==========================================
export const CLIENT_NAV: NavSection[] = [
  {
    title: 'Review',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Client Dashboard', href: '/client', icon: LayoutDashboard, key: 'client-dashboard' },
    ]
  },
  {
    title: 'Reviews',
    icon: Eye,
    color: 'text-amber-500',
    items: [
      { name: 'Scenes', href: '/client/scenes', icon: Clapperboard, key: 'scenes' },
      { name: 'Assets', href: '/client/assets', icon: Package, key: 'assets' },
    ]
  },
  {
    title: 'Approvals',
    icon: CheckCircle2,
    color: 'text-green-500',
    items: [
      { name: 'Approvals', href: '/client/approvals', icon: CheckCircle2, key: 'approvals' },
      { name: 'Approval History', href: '/client/history', icon: History, key: 'approval-history' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// SUPER USER NAVIGATION (FULL ACCESS)
// ==========================================
export const SUPER_USER_NAV: NavSection[] = [
  {
    title: 'System',
    icon: Shield,
    color: 'text-red-500',
    items: [
      { name: 'System Dashboard', href: '/system-dashboard', icon: LayoutDashboard, key: 'system-dashboard' },
      { name: 'System Settings', href: '/system-settings', icon: Settings, key: 'system-settings' },
      { name: 'Audit Logs', href: '/audit-logs', icon: FileSearch, key: 'audit-logs' },
    ]
  },
  {
    title: 'Projects',
    icon: Film,
    color: 'text-blue-500',
    items: [
      { name: 'Projects', href: '/projects', icon: Film, key: 'projects' },
      { name: 'Project Status', href: '/project-status', icon: Target, key: 'project-status' },
    ]
  },
  {
    title: 'Organization',
    icon: Building2,
    color: 'text-amber-500',
    items: [
      { name: 'Departments', href: '/departments', icon: Building2, key: 'departments' },
      { name: 'Team', href: '/team', icon: Users, key: 'team' },
    ]
  },
  {
    title: 'Pre-Production',
    icon: FileText,
    color: 'text-cyan-500',
    items: [
      { name: 'Script Management', href: '/script-management', icon: FileText, key: 'script-management' },
      { name: 'Story Analysis', href: '/preprod/script/story-analysis', icon: Target, key: 'story-analysis' },
      { name: 'Story Frameworks', href: '/preprod/script/story-frameworks', icon: Library, key: 'story-frameworks' },
      { name: 'Continuity Assist', href: '/preprod/script/continuity-assist', icon: ListChecks, key: 'continuity-assist' },
      { name: 'Scene Breakdown', href: '/breakdown', icon: Clapperboard, key: 'breakdown' },
      { name: 'Scenes', href: '/scenes', icon: Clapperboard, key: 'scenes' },
      { name: 'Concept Art', href: '/concept-art', icon: Palette, key: 'concept-art' },
      { name: 'Concept Wall', href: '/concept-wall', icon: Layers, key: 'concept-wall' },
      { name: 'Storyboards', href: '/storyboards', icon: Image, key: 'storyboards' },
      { name: 'Characters', href: '/characters', icon: User, key: 'characters' },
      { name: 'References', href: '/references', icon: Search, key: 'references' },
    ]
  },
  {
    title: 'Production',
    icon: PlayCircle,
    color: 'text-amber-500',
    items: [
      { name: 'Pipeline', href: '/pipeline', icon: Workflow, key: 'pipeline' },
      { name: 'Tasks', href: '/tasks', icon: FolderKanban, key: 'tasks' },
      { name: 'Approvals', href: '/approvals', icon: CheckCircle2, key: 'approvals' },
      { name: 'Timeline', href: '/timeline', icon: Calendar, key: 'timeline' },
    ]
  },
  {
    title: 'Assets',
    icon: Package,
    color: 'text-green-500',
    items: [
      { name: 'Library Assets', href: '/library', icon: Library, key: 'library' },
    ]
  },
  {
    title: 'Management',
    icon: BarChart3,
    color: 'text-emerald-500',
    items: [
      { name: 'Reports', href: '/department-reports', icon: BarChart3, key: 'department-reports' },
      { name: 'Vendors', href: '/vendors', icon: Building2, key: 'vendors' },
      { name: 'SLA & Penalties', href: '/sla-penalties', icon: DollarSign, key: 'sla-penalties' },
    ]
  },
  {
    title: 'Virtual Production',
    icon: Monitor,
    color: 'text-teal-500',
    items: [
      { name: 'VFX & Mocap Analysis', href: '/admin/vfx-analysis', icon: Sparkles, key: 'vfx-analysis' },
      { name: 'Location Intelligence', href: '/vp/location-intelligence', icon: Target, key: 'location-intelligence' },
    ]
  },
  {
    title: 'Internal Support',
    icon: Server,
    color: 'text-orange-500',
    items: [
      { name: 'QC Workspace', href: '/qc-workspace', icon: ListChecks, key: 'qc-workspace' },
      { name: 'Pipeline Monitoring', href: '/pipeline-monitoring', icon: Activity, key: 'pipeline-monitoring' },
      { name: 'Render Management', href: '/render-management', icon: Monitor, key: 'render-management' },
    ]
  },
  {
    title: 'AI & Tools',
    icon: Brain,
    color: 'text-purple-500',
    items: [
      { name: 'AI Workflows', href: '/ai-workflows', icon: GitBranch, key: 'ai-workflows' },
      { name: 'AI Settings', href: '/ai-settings', icon: Brain, key: 'ai-settings' },
      { name: 'ComfyUI Studio', href: '/comfyui-studio', icon: Sparkles, key: 'comfyui-studio' },
      { name: 'External Tools', href: '/external-tools', icon: Key, key: 'external-tools' },
      { name: 'Tool Config', href: '/tool-configuration', icon: Wrench, key: 'tool-config' },
    ]
  },
  {
    title: 'Admin',
    icon: Shield,
    color: 'text-red-500',
    items: [
      { name: 'Admin Panel', href: '/admin', icon: Shield, key: 'admin' },
      { name: 'Infrastructure', href: '/admin/infrastructure', icon: Server, key: 'infrastructure' },
      { name: 'Settings', href: '/settings', icon: Settings, key: 'settings' },
    ]
  },
];

// ==========================================
// VENDOR NAVIGATION
// ==========================================
export const VENDOR_NAV: NavSection[] = [
  {
    title: 'My Work',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, key: 'dashboard' },
      { name: 'Assigned Work', href: '/vendor/tasks', icon: FolderKanban, key: 'assigned-work' },
      { name: 'My Deliverables', href: '/vendor/deliverables', icon: Package, key: 'deliverables' },
    ]
  },
  {
    title: 'Feedback',
    icon: MessageSquare,
    color: 'text-amber-500',
    items: [
      { name: 'Feedback', href: '/vendor/feedback', icon: MessageSquare, key: 'feedback' },
    ]
  },
  {
    title: 'Resources',
    icon: Library,
    color: 'text-green-500',
    items: [
      { name: 'References', href: '/references', icon: Search, key: 'references' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// INTERNAL SUPPORT NAVIGATION (QC, Pipeline TD, Render)
// ==========================================
export const QC_NAV: NavSection[] = [
  {
    title: 'QC',
    icon: ListChecks,
    color: 'text-blue-500',
    items: [
      { name: 'QC Workspace', href: '/qc-workspace', icon: LayoutDashboard, key: 'qc-workspace' },
      { name: 'Assets for QC', href: '/qc/assets', icon: Package, key: 'qc-assets' },
      { name: 'Shots for QC', href: '/qc/shots', icon: Video, key: 'qc-shots' },
    ]
  },
  {
    title: 'Checklists',
    icon: ListChecks,
    color: 'text-amber-500',
    items: [
      { name: 'QC Checklists', href: '/qc/checklists', icon: ListChecks, key: 'qc-checklists' },
      { name: 'Notes', href: '/qc/notes', icon: FileText, key: 'qc-notes' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

export const PIPELINE_TD_NAV: NavSection[] = [
  {
    title: 'Pipeline',
    icon: Server,
    color: 'text-blue-500',
    items: [
      { name: 'Pipeline Monitoring', href: '/pipeline-monitoring', icon: LayoutDashboard, key: 'pipeline-monitoring' },
      { name: 'Pipeline Errors', href: '/td/errors', icon: AlertCircle, key: 'pipeline-errors' },
    ]
  },
  {
    title: 'Monitoring',
    icon: Activity,
    color: 'text-amber-500',
    items: [
      { name: 'AI Warnings', href: '/td/ai-warnings', icon: FileWarning, key: 'ai-warnings' },
      { name: 'Logs', href: '/td/logs', icon: FileText, key: 'logs' },
    ]
  },
  {
    title: 'Tools',
    icon: Wrench,
    color: 'text-green-500',
    items: [
      { name: 'Tool Config', href: '/tool-configuration', icon: Settings, key: 'tool-config' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

export const RENDER_WRANGLER_NAV: NavSection[] = [
  {
    title: 'Render',
    icon: Monitor,
    color: 'text-blue-500',
    items: [
      { name: 'Render Management', href: '/render-management', icon: LayoutDashboard, key: 'render-management' },
      { name: 'Render Queue', href: '/render/queue', icon: Cpu, key: 'render-queue' },
    ]
  },
  {
    title: 'Status',
    icon: HardDrive,
    color: 'text-amber-500',
    items: [
      { name: 'Failed Renders', href: '/render/failed', icon: AlertCircle, key: 'failed-renders' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];

// ==========================================
// GET NAVIGATION FOR ROLE
// ==========================================
export function getNavigationForRole(role: ProductionRole, isAdmin: boolean = false): NavSection[] {
  // Admin always gets super user nav
  if (isAdmin) {
    return SUPER_USER_NAV;
  }

  switch (role) {
    case 'super_user':
      return SUPER_USER_NAV;
    case 'producer':
      return PRODUCER_NAV;
    case 'director':
      return DIRECTOR_NAV;
    case 'production_manager':
      return PRODUCTION_MANAGER_NAV;
    case 'hod':
    case 'department_head':
      return HOD_NAV;
    case 'vendor':
      return VENDOR_NAV;
    case 'client':
      return CLIENT_NAV;
    case 'artist':
    default:
      return ARTIST_NAV;
  }
}

// ==========================================
// STORYBOARD SUPERVISOR NAVIGATION
// ==========================================
export const STORYBOARD_SUPERVISOR_NAV: NavSection[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    items: [
      { name: 'Dashboard', href: '/storyboard-supervisor/dashboard', icon: LayoutDashboard, key: 'dashboard' },
    ]
  },
  {
    title: 'Storyboards',
    icon: Image,
    color: 'text-amber-500',
    items: [
      { name: 'Scene Breakdown', href: '/storyboard-supervisor/scene-breakdown', icon: Clapperboard, key: 'scene-breakdown' },
      { name: 'Shots Breakdown', href: '/storyboard-supervisor/shots-breakdown', icon: Sparkles, key: 'shots-breakdown' },
      { name: 'Panel View', href: '/storyboard-supervisor/panel-view', icon: Eye, key: 'panel-view' },
    ]
  },
  {
    title: 'Review',
    icon: MessageSquare,
    color: 'text-purple-500',
    items: [
      { name: 'Director Inputs', href: '/storyboard-supervisor/director-inputs', icon: MessageSquare, key: 'director-inputs' },
    ]
  },
  {
    title: 'Account',
    icon: User,
    color: 'text-muted-foreground',
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile' },
      { name: 'Notifications', href: '/notifications', icon: Bell, key: 'notifications' },
    ]
  },
];
