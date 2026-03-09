import { 
  FileText, 
  Layers, 
  Image, 
  Settings, 
  LayoutDashboard,
  Palette,
  Clapperboard,
  Sparkles,
  User,
  Workflow,
  Brain,
  Shield,
  CheckCircle2,
  MessageSquare,
  Clock,
  Target,
  ListChecks,
  Package,
  Video,
  History,
  Eye,
  Server,
  Activity,
  Monitor,
  Cpu,
  Bell,
  Upload,
  Lock,
  Play,
  Volume2,
  Film,
  Scissors,
  Calendar,
  GitBranch,
  LucideIcon
} from 'lucide-react';
import { PreProdRole } from '@/types/preprodRoles';

export interface PreprodNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  key: string;
}

export interface PreprodNavSection {
  title: string;
  icon: LucideIcon;
  items: PreprodNavItem[];
  color?: string;
}

// ==========================================
// SCRIPT DEPARTMENT NAVIGATION
// ==========================================
export const SCRIPT_NAV: PreprodNavSection[] = [
  {
    title: 'Script',
    icon: FileText,
    color: 'text-blue-500',
    items: [
      { name: 'Script Dashboard', href: '/preprod/script/dashboard', icon: LayoutDashboard, key: 'script-dashboard' },
      { name: 'Upload & Versions', href: '/preprod/script/versions', icon: Upload, key: 'script-versions' },
      { name: 'AI Breakdown', href: '/preprod/script/ai-breakdown', icon: Brain, key: 'ai-breakdown' },
      { name: 'Scene Editor', href: '/preprod/script/scenes', icon: Clapperboard, key: 'scene-editor' },
      { name: 'Story Analysis', href: '/preprod/script/story-analysis', icon: Target, key: 'story-analysis' },
      { name: 'Story Frameworks', href: '/preprod/script/story-frameworks', icon: Workflow, key: 'story-frameworks' },
      { name: 'Continuity Assist', href: '/preprod/script/continuity-assist', icon: ListChecks, key: 'continuity-assist' },
      { name: 'Script Lock', href: '/preprod/script/lock', icon: Lock, key: 'script-lock' },
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
// CONCEPT ARTS NAVIGATION
// ==========================================
export const CONCEPT_NAV: PreprodNavSection[] = [
  {
    title: 'Concept Arts',
    icon: Palette,
    color: 'text-purple-500',
    items: [
      { name: 'AI Generation', href: '/preprod/concept/ai', icon: Sparkles, key: 'ai-concepts' },
      { name: 'Manual Upload', href: '/preprod/concept/manual', icon: Upload, key: 'manual-concepts' },
      { name: 'Concept Breakdown', href: '/preprod/concept/assets', icon: Package, key: 'concept-breakdown' },
      { name: 'Concept Wall', href: '/concept-wall', icon: Layers, key: 'concept-wall' },
      { name: 'Reviews', href: '/preprod/concept/reviews', icon: CheckCircle2, key: 'concept-reviews' },
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
// STORYBOARD NAVIGATION
// ==========================================
export const STORYBOARD_NAV: PreprodNavSection[] = [
  {
    title: 'Storyboard',
    icon: Image,
    color: 'text-amber-500',
    items: [
      { name: 'Storyboard Dashboard', href: '/preprod/storyboard/dashboard', icon: LayoutDashboard, key: 'storyboard-dashboard' },
      { name: 'Shot Lock', href: '/preprod/storyboard/lock', icon: Lock, key: 'shot-lock' },
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
// EDIT LINEUP NAVIGATION
// ==========================================
export const EDIT_LINEUP_NAV: PreprodNavSection[] = [
  {
    title: 'Edit Lineup',
    icon: Scissors,
    color: 'text-green-500',
    items: [
      { name: 'Edit Dashboard', href: '/preprod/edit-lineup/dashboard', icon: LayoutDashboard, key: 'edit-dashboard' },
      { name: 'Shot Timeline', href: '/preprod/edit-lineup/timeline', icon: Film, key: 'shot-timeline' },
      { name: 'Edit Approval', href: '/preprod/edit-lineup/approval', icon: CheckCircle2, key: 'edit-approval' },
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
// ANIMATIC / PREVIZ NAVIGATION
// ==========================================
export const ANIMATIC_NAV: PreprodNavSection[] = [
  {
    title: 'Animatic / Previz',
    icon: Play,
    color: 'text-cyan-500',
    items: [
      { name: 'Animatic Dashboard', href: '/preprod/animatic/dashboard', icon: LayoutDashboard, key: 'animatic-dashboard' },
      { name: 'AI Previz', href: '/preprod/animatic/ai', icon: Brain, key: 'ai-previz' },
      { name: 'Scene Animatics', href: '/preprod/animatic/scenes', icon: Clapperboard, key: 'scene-animatics' },
      { name: 'Sound & Dialogue', href: '/preprod/animatic/sound', icon: Volume2, key: 'sound-dialogue' },
      { name: 'Animatic Review', href: '/preprod/animatic/reviews', icon: CheckCircle2, key: 'animatic-reviews' },
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
// TECHNICAL PLANNING NAVIGATION
// ==========================================
export const TECH_NAV: PreprodNavSection[] = [
  {
    title: 'Technical Planning',
    icon: Server,
    color: 'text-red-500',
    items: [
      { name: 'Tech Dashboard', href: '/preprod/tech/dashboard', icon: LayoutDashboard, key: 'tech-dashboard' },
      { name: 'Pipeline Definition', href: '/preprod/tech/pipeline', icon: GitBranch, key: 'pipeline-definition' },
      { name: 'FX & Mocap', href: '/preprod/tech/fx-mocap', icon: Activity, key: 'fx-mocap' },
      { name: 'Render Estimates', href: '/preprod/tech/render-estimates', icon: Cpu, key: 'render-estimates' },
      { name: 'Final Approval', href: '/preprod/tech/approval', icon: Lock, key: 'final-approval' },
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
// DIRECTOR PREPROD REVIEW NAVIGATION
// ==========================================
export const DIRECTOR_PREPROD_NAV: PreprodNavSection[] = [
  {
    title: 'Pre-Production Review',
    icon: Eye,
    color: 'text-blue-500',
    items: [
      { name: 'PreProd Dashboard', href: '/director/preprod/dashboard', icon: LayoutDashboard, key: 'preprod-dashboard' },
      { name: 'Script Review', href: '/director/preprod/script-review', icon: FileText, key: 'script-review' },
      { name: 'Concept Review', href: '/director/preprod/concept-review', icon: Palette, key: 'concept-review' },
      { name: 'Storyboard Review', href: '/director/preprod/storyboard-review', icon: Image, key: 'storyboard-review' },
      { name: 'Edit Lineup Review', href: '/director/preprod/edit-lineup-review', icon: Scissors, key: 'edit-lineup-review' },
      { name: 'Animatic Review', href: '/director/preprod/animatic-review', icon: Play, key: 'animatic-review' },
      { name: 'Tech Review', href: '/director/preprod/tech-review', icon: Server, key: 'tech-review' },
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
// PRODUCER PREPROD OVERVIEW NAVIGATION
// ==========================================
export const PRODUCER_PREPROD_NAV: PreprodNavSection[] = [
  {
    title: 'Pre-Production Control',
    icon: Shield,
    color: 'text-red-500',
    items: [
      { name: 'PreProd Overview', href: '/producer/preprod/overview', icon: LayoutDashboard, key: 'preprod-overview' },
      { name: 'Stage Locks', href: '/producer/preprod/locks', icon: Lock, key: 'stage-locks' },
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
// SUPER USER PREPROD NAVIGATION (ALL ACCESS)
// ==========================================
export const SUPER_USER_PREPROD_NAV: PreprodNavSection[] = [
  {
    title: 'Script Department',
    icon: FileText,
    color: 'text-blue-500',
    items: [
      { name: 'Script Dashboard', href: '/preprod/script/dashboard', icon: LayoutDashboard, key: 'script-dashboard' },
      { name: 'Upload & Versions', href: '/preprod/script/versions', icon: Upload, key: 'script-versions' },
      { name: 'AI Breakdown', href: '/preprod/script/ai-breakdown', icon: Brain, key: 'ai-breakdown' },
      { name: 'Scene Editor', href: '/preprod/script/scenes', icon: Clapperboard, key: 'scene-editor' },
      { name: 'Story Analysis', href: '/preprod/script/story-analysis', icon: Target, key: 'story-analysis' },
      { name: 'Continuity Assist', href: '/preprod/script/continuity-assist', icon: ListChecks, key: 'continuity-assist' },
      { name: 'Script Lock', href: '/preprod/script/lock', icon: Lock, key: 'script-lock' },
    ]
  },
  {
    title: 'Concept Arts',
    icon: Palette,
    color: 'text-purple-500',
    items: [
      { name: 'AI Generation', href: '/preprod/concept/ai', icon: Sparkles, key: 'ai-concepts' },
      { name: 'Manual Upload', href: '/preprod/concept/manual', icon: Upload, key: 'manual-concepts' },
      { name: 'Concept Breakdown', href: '/preprod/concept/assets', icon: Package, key: 'concept-breakdown' },
      { name: 'Concept Wall', href: '/concept-wall', icon: Layers, key: 'concept-wall' },
      { name: 'Reviews', href: '/preprod/concept/reviews', icon: CheckCircle2, key: 'concept-reviews' },
    ]
  },
  {
    title: 'Storyboard',
    icon: Image,
    color: 'text-amber-500',
    items: [
      { name: 'Storyboard Dashboard', href: '/preprod/storyboard/dashboard', icon: LayoutDashboard, key: 'storyboard-dashboard' },
      { name: 'Shot Lock', href: '/preprod/storyboard/lock', icon: Lock, key: 'shot-lock' },
    ]
  },
  {
    title: 'Edit Lineup',
    icon: Scissors,
    color: 'text-green-500',
    items: [
      { name: 'Edit Dashboard', href: '/preprod/edit-lineup/dashboard', icon: LayoutDashboard, key: 'edit-dashboard' },
      { name: 'Shot Timeline', href: '/preprod/edit-lineup/timeline', icon: Film, key: 'shot-timeline' },
      { name: 'Edit Approval', href: '/preprod/edit-lineup/approval', icon: CheckCircle2, key: 'edit-approval' },
    ]
  },
  {
    title: 'Animatic / Previz',
    icon: Play,
    color: 'text-cyan-500',
    items: [
      { name: 'Animatic Dashboard', href: '/preprod/animatic/dashboard', icon: LayoutDashboard, key: 'animatic-dashboard' },
      { name: 'AI Previz', href: '/preprod/animatic/ai', icon: Brain, key: 'ai-previz' },
      { name: 'Scene Animatics', href: '/preprod/animatic/scenes', icon: Clapperboard, key: 'scene-animatics' },
      { name: 'Sound & Dialogue', href: '/preprod/animatic/sound', icon: Volume2, key: 'sound-dialogue' },
      { name: 'Animatic Review', href: '/preprod/animatic/reviews', icon: CheckCircle2, key: 'animatic-reviews' },
    ]
  },
  {
    title: 'Technical Planning',
    icon: Server,
    color: 'text-red-500',
    items: [
      { name: 'Tech Dashboard', href: '/preprod/tech/dashboard', icon: LayoutDashboard, key: 'tech-dashboard' },
      { name: 'Pipeline Definition', href: '/preprod/tech/pipeline', icon: GitBranch, key: 'pipeline-definition' },
      { name: 'FX & Mocap', href: '/preprod/tech/fx-mocap', icon: Activity, key: 'fx-mocap' },
      { name: 'Render Estimates', href: '/preprod/tech/render-estimates', icon: Cpu, key: 'render-estimates' },
      { name: 'Final Approval', href: '/preprod/tech/approval', icon: Lock, key: 'final-approval' },
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
// GET PREPROD NAVIGATION FOR ROLE
// ==========================================
export function getPreprodNavigationForRole(role: PreProdRole): PreprodNavSection[] {
  switch (role) {
    case 'super_user':
      return SUPER_USER_PREPROD_NAV;
    case 'producer':
      return PRODUCER_PREPROD_NAV;
    case 'director':
      return DIRECTOR_PREPROD_NAV;
    case 'script_writer':
    case 'script_editor':
      return SCRIPT_NAV;
    case 'art_director':
    case 'concept_artist':
      return CONCEPT_NAV;
    case 'storyboard_artist':
      return STORYBOARD_NAV;
    case 'editor':
      return EDIT_LINEUP_NAV;
    case 'previz_artist':
      return ANIMATIC_NAV;
    case 'technical_director':
    case 'pipeline_td':
      return TECH_NAV;
    default:
      return SCRIPT_NAV;
  }
}
