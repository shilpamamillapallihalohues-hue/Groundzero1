// Production Pipeline Roles
export type ProductionRole = 
  | 'super_user'
  | 'producer'
  | 'director'
  | 'production_manager'
  | 'hod'
  | 'department_head'
  | 'artist'
  | 'vendor'
  | 'client'
  // Pre-production specific roles
  | 'script_writer'
  | 'script_supervisor'
  | 'art_director'
  | 'concept_artist'
  | 'storyboard_artist'
  // Production specific roles  
  | 'modeling_artist'
  | 'texturing_artist'
  | 'rigging_artist'
  | 'animation_artist'
  | 'lighting_artist'
  | 'vfx_artist'
  | 'render_artist';

export const ROLE_LABELS: Record<ProductionRole, string> = {
  super_user: 'Super User',
  producer: 'Producer',
  director: 'Director',
  production_manager: 'Production Manager',
  hod: 'HOD / Lead',
  department_head: 'Department Head',
  artist: 'Artist',
  vendor: 'Vendor',
  client: 'Client',
  // Pre-production roles
  script_writer: 'Script Writer',
  script_supervisor: 'Script Supervisor',
  art_director: 'Art Director',
  concept_artist: 'Concept Artist',
  storyboard_artist: 'Storyboard Artist',
  // Production roles
  modeling_artist: 'Modeling Artist',
  texturing_artist: 'Texturing Artist',
  rigging_artist: 'Rigging Artist',
  animation_artist: 'Animation Artist',
  lighting_artist: 'Lighting Artist',
  vfx_artist: 'VFX Artist',
  render_artist: 'Render Artist',
};

export const ROLE_DESCRIPTIONS: Record<ProductionRole, string> = {
  super_user: 'Full override, reopen locks, system control',
  producer: 'Schedule, budget, final locks',
  director: 'Final creative approvals',
  production_manager: 'Assignments, tracking, coordination',
  hod: 'Internal approvals for department',
  department_head: 'Internal approvals for department',
  artist: 'Work & upload only',
  vendor: 'Work & upload only',
  client: 'Review & approve only',
  // Pre-production roles
  script_writer: 'Write and edit scripts',
  script_supervisor: 'Supervise script continuity',
  art_director: 'Oversee visual style and concepts',
  concept_artist: 'Create concept artwork',
  storyboard_artist: 'Create storyboards',
  // Production roles
  modeling_artist: '3D modeling tasks',
  texturing_artist: 'Texturing and materials',
  rigging_artist: 'Character rigging',
  animation_artist: 'Character animation',
  lighting_artist: 'Scene lighting',
  vfx_artist: 'Visual effects',
  render_artist: 'Rendering and output',
};

// Base artist capabilities (shared)
const artistCapabilities = {
  canApprove: false,
  canAssign: false,
  canUpload: true,
  canViewBudget: false,
  canOverride: false,
  canManageTeam: false,
  accessLevel: 'assigned' as const,
};

// Role capabilities
export const ROLE_CAPABILITIES: Record<ProductionRole, {
  canApprove: boolean;
  canAssign: boolean;
  canUpload: boolean;
  canViewBudget: boolean;
  canOverride: boolean;
  canManageTeam: boolean;
  accessLevel: 'full' | 'department' | 'assigned' | 'review';
}> = {
  super_user: {
    canApprove: true,
    canAssign: true,
    canUpload: true,
    canViewBudget: true,
    canOverride: true,
    canManageTeam: true,
    accessLevel: 'full',
  },
  producer: {
    canApprove: true,
    canAssign: true,
    canUpload: true,
    canViewBudget: true,
    canOverride: false,
    canManageTeam: true,
    accessLevel: 'full',
  },
  director: {
    canApprove: true,
    canAssign: false,
    canUpload: true,
    canViewBudget: false,
    canOverride: false,
    canManageTeam: false,
    accessLevel: 'full',
  },
  production_manager: {
    canApprove: false,
    canAssign: true,
    canUpload: true,
    canViewBudget: true,
    canOverride: false,
    canManageTeam: true,
    accessLevel: 'full',
  },
  hod: {
    canApprove: true,
    canAssign: true,
    canUpload: true,
    canViewBudget: false,
    canOverride: false,
    canManageTeam: false,
    accessLevel: 'department',
  },
  department_head: {
    canApprove: true,
    canAssign: true,
    canUpload: true,
    canViewBudget: false,
    canOverride: false,
    canManageTeam: false,
    accessLevel: 'department',
  },
  artist: artistCapabilities,
  vendor: artistCapabilities,
  client: {
    canApprove: true,
    canAssign: false,
    canUpload: false,
    canViewBudget: false,
    canOverride: false,
    canManageTeam: false,
    accessLevel: 'review',
  },
  // Pre-production roles
  script_writer: { ...artistCapabilities, accessLevel: 'assigned' },
  script_supervisor: { ...artistCapabilities, canApprove: true, accessLevel: 'department' },
  art_director: { ...artistCapabilities, canApprove: true, canAssign: true, accessLevel: 'department' },
  concept_artist: artistCapabilities,
  storyboard_artist: artistCapabilities,
  // Production roles
  modeling_artist: artistCapabilities,
  texturing_artist: artistCapabilities,
  rigging_artist: artistCapabilities,
  animation_artist: artistCapabilities,
  lighting_artist: artistCapabilities,
  vfx_artist: artistCapabilities,
  render_artist: artistCapabilities,
};

// Sidebar sections visible per role
// Maps to menu IDs in DesktopTopMenu: dashboard, pre-production, production, projects, team, ai-tools, admin, tools, account
export const ROLE_SIDEBAR_SECTIONS: Record<ProductionRole, string[]> = {
  super_user: ['all'],
  producer: ['dashboard', 'projects', 'pre-production', 'production', 'team', 'admin', 'ai-tools', 'tools', 'account'],
  director: ['dashboard', 'projects', 'pre-production', 'production', 'ai-tools', 'account'],
  production_manager: ['dashboard', 'projects', 'pre-production', 'production', 'team', 'tools', 'account'],
  hod: ['dashboard', 'projects', 'pre-production', 'production', 'team', 'account'],
  department_head: ['dashboard', 'projects', 'pre-production', 'production', 'team', 'account'],
  artist: ['dashboard', 'production', 'tools', 'account'],
  vendor: ['dashboard', 'production', 'tools', 'account'],
  client: ['dashboard', 'account'],
  // Pre-production roles - focus on pre-production menus
  script_writer: ['dashboard', 'pre-production', 'tools', 'account'],
  script_supervisor: ['dashboard', 'pre-production', 'production', 'tools', 'account'],
  art_director: ['dashboard', 'pre-production', 'production', 'team', 'ai-tools', 'account'],
  concept_artist: ['dashboard', 'pre-production', 'ai-tools', 'tools', 'account'],
  storyboard_artist: ['dashboard', 'pre-production', 'ai-tools', 'tools', 'account'],
  // Production roles - focus on production menus
  modeling_artist: ['dashboard', 'production', 'ai-tools', 'tools', 'account'],
  texturing_artist: ['dashboard', 'production', 'tools', 'account'],
  rigging_artist: ['dashboard', 'production', 'tools', 'account'],
  animation_artist: ['dashboard', 'production', 'tools', 'account'],
  lighting_artist: ['dashboard', 'production', 'tools', 'account'],
  vfx_artist: ['dashboard', 'production', 'ai-tools', 'tools', 'account'],
  render_artist: ['dashboard', 'production', 'tools', 'account'],
};
