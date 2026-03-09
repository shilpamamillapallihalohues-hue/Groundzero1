// Phase-specific roles for team member creation

export type ProductionPhase = 'pre_production' | 'production' | 'post_production' | 'management';

// Pre-Production specific roles (separate from production pipeline roles)
export type PreProdRole =
  | 'super_user'
  | 'producer'
  | 'director'
  | 'script_writer'
  | 'script_editor'
  | 'art_director'
  | 'concept_artist'
  | 'storyboard_artist'
  | 'editor'
  | 'previz_artist'
  | 'technical_director'
  | 'pipeline_td';

export const PREPROD_ROLE_LABELS: Record<PreProdRole, string> = {
  super_user: 'Super User',
  producer: 'Producer',
  director: 'Director',
  script_writer: 'Script Writer',
  script_editor: 'Script Editor',
  art_director: 'Art Director',
  concept_artist: 'Concept Artist',
  storyboard_artist: 'Storyboard Artist',
  editor: 'Editor',
  previz_artist: 'Previz Artist',
  technical_director: 'Technical Director',
  pipeline_td: 'Pipeline TD',
};

export const PREPROD_ROLE_DEPARTMENT: Record<PreProdRole, string | null> = {
  super_user: null, // Full access
  producer: null, // Full access
  director: null, // Review access to all
  script_writer: 'script',
  script_editor: 'script',
  art_director: 'concept',
  concept_artist: 'concept',
  storyboard_artist: 'storyboard',
  editor: 'edit_lineup',
  previz_artist: 'animatic',
  technical_director: 'tech',
  pipeline_td: 'tech',
};

// Pre-Production departments
export type PreProdDepartment = 
  | 'script'
  | 'concept'
  | 'storyboard'
  | 'edit_lineup'
  | 'animatic'
  | 'tech';

export const PREPROD_DEPARTMENT_LABELS: Record<PreProdDepartment, string> = {
  script: 'Script',
  concept: 'Concept Arts',
  storyboard: 'Storyboard',
  edit_lineup: 'Edit Lineup',
  animatic: 'Animatic / Previz',
  tech: 'Technical Planning',
};

// Capabilities per role
export const PREPROD_ROLE_CAPABILITIES: Record<PreProdRole, {
  canEdit: boolean;
  canApprove: boolean;
  canLock: boolean;
  canViewAll: boolean;
  department: PreProdDepartment | 'all' | 'review';
}> = {
  super_user: {
    canEdit: true,
    canApprove: true,
    canLock: true,
    canViewAll: true,
    department: 'all',
  },
  producer: {
    canEdit: false,
    canApprove: true,
    canLock: true,
    canViewAll: true,
    department: 'all',
  },
  director: {
    canEdit: false,
    canApprove: true,
    canLock: false,
    canViewAll: true,
    department: 'review',
  },
  script_writer: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'script',
  },
  script_editor: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'script',
  },
  art_director: {
    canEdit: true,
    canApprove: true,
    canLock: false,
    canViewAll: false,
    department: 'concept',
  },
  concept_artist: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'concept',
  },
  storyboard_artist: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'storyboard',
  },
  editor: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'edit_lineup',
  },
  previz_artist: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'animatic',
  },
  technical_director: {
    canEdit: true,
    canApprove: true,
    canLock: false,
    canViewAll: false,
    department: 'tech',
  },
  pipeline_td: {
    canEdit: true,
    canApprove: false,
    canLock: false,
    canViewAll: false,
    department: 'tech',
  },
};

// ============================================
// PHASE-SPECIFIC ROLE DEFINITIONS
// ============================================

interface RoleDefinition {
  value: string;
  label: string;
  dashboard: string; // Maps to ProductionRole for routing
}

interface DepartmentRoles {
  label: string;
  roles: RoleDefinition[];
}

// Pre-Production Department Roles
// NOTE: 'value' is stored in profiles.specific_role for routing
export const PRE_PRODUCTION_ROLES: Record<string, DepartmentRoles> = {
  script: {
    label: 'Script Department',
    roles: [
      { value: 'Story Writer', label: 'Story Writer', dashboard: 'script_writer' },
      { value: 'Screenplay Writer', label: 'Screenplay Writer', dashboard: 'script_writer' },
      { value: 'Script Editor', label: 'Script Editor', dashboard: 'script_writer' },
      { value: 'Dialogue Writer', label: 'Dialogue Writer', dashboard: 'script_writer' },
      { value: 'Script Supervisor', label: 'Script Supervisor', dashboard: 'script_supervisor' },
      { value: 'Continuity Supervisor', label: 'Continuity Supervisor', dashboard: 'script_supervisor' },
    ],
  },
  concept_arts: {
    label: 'Concept Arts Department',
    roles: [
      { value: 'Concept Artist', label: 'Concept Artist', dashboard: 'concept_artist' },
      { value: 'Environment Concept Artist', label: 'Environment Concept Artist', dashboard: 'concept_artist' },
      { value: 'Character Concept Artist', label: 'Character Concept Artist', dashboard: 'concept_artist' },
      { value: 'Creature Designer', label: 'Creature Designer', dashboard: 'concept_artist' },
      { value: 'Prop Concept Artist', label: 'Prop Concept Artist', dashboard: 'concept_artist' },
      { value: 'Vehicle Concept Artist', label: 'Vehicle Concept Artist', dashboard: 'concept_artist' },
      { value: 'FX Concept Artist', label: 'FX Concept Artist', dashboard: 'concept_artist' },
      { value: 'Matte Painter', label: 'Matte Painter', dashboard: 'concept_artist' },
      { value: 'Art Director', label: 'Art Director (HOD)', dashboard: 'art_director' },
      { value: 'Concept Art Vendor', label: 'Concept Art Vendor/Freelancer', dashboard: 'vendor' },
    ],
  },
  storyboard: {
    label: 'Storyboard Department',
    roles: [
      { value: 'Storyboard Artist', label: 'Storyboard Artist', dashboard: 'storyboard_artist' },
      { value: 'Senior Storyboard Artist', label: 'Senior Storyboard Artist', dashboard: 'storyboard_artist' },
      { value: 'Storyboard Supervisor', label: 'Storyboard Supervisor', dashboard: 'storyboard_supervisor' },
      { value: 'Visual Storyteller', label: 'Visual Storyteller', dashboard: 'storyboard_artist' },
      { value: 'Cinematography Consultant', label: 'Cinematography Consultant', dashboard: 'storyboard_artist' },
    ],
  },
  edit_lineup: {
    label: 'Edit Lineup Department',
    roles: [
      { value: 'Editor', label: 'Editor', dashboard: 'editor' },
      { value: 'Assistant Editor', label: 'Assistant Editor', dashboard: 'editor' },
      { value: 'Editorial Supervisor', label: 'Editorial Supervisor', dashboard: 'editorial_supervisor' },
    ],
  },
  animatic_previz: {
    label: 'Animatic / Previz Department',
    roles: [
      { value: 'Previz Artist', label: 'Previz Artist', dashboard: 'previz_artist' },
      { value: 'Animatic Artist', label: 'Animatic Artist', dashboard: 'previz_artist' },
      { value: 'Layout Artist', label: 'Layout Artist', dashboard: 'previz_artist' },
      { value: 'Camera Previz Artist', label: 'Camera Previz Artist', dashboard: 'previz_artist' },
      { value: 'Previz Technical Artist', label: 'Previz Technical Artist', dashboard: 'previz_artist' },
    ],
  },
  technical_planning: {
    label: 'Technical Planning / Pipeline',
    roles: [
      { value: 'Technical Director', label: 'Technical Director (TD)', dashboard: 'technical_director' },
      { value: 'Pipeline TD', label: 'Pipeline TD', dashboard: 'technical_director' },
      { value: 'VFX Supervisor', label: 'VFX Supervisor', dashboard: 'technical_director' },
      { value: 'R&D Engineer', label: 'R&D Engineer', dashboard: 'technical_director' },
      { value: 'Simulation Consultant', label: 'Simulation Consultant', dashboard: 'technical_director' },
      { value: 'Motion Capture Specialist', label: 'Motion Capture Specialist', dashboard: 'technical_director' },
    ],
  },
  support: {
    label: 'Support Roles',
    roles: [
      { value: 'Research Assistant', label: 'Research Assistant', dashboard: 'script_writer' },
      { value: 'Reference Curator', label: 'Reference Curator', dashboard: 'concept_artist' },
      { value: 'AI Prompt Supervisor', label: 'AI Prompt Supervisor', dashboard: 'concept_artist' },
      { value: 'Creative Coordinator', label: 'Creative Coordinator', dashboard: 'concept_artist' },
    ],
  },
};

// Production Department Roles
export const PRODUCTION_ROLES: Record<string, DepartmentRoles> = {
  modeling: {
    label: 'Modeling Department',
    roles: [
      { value: 'Modeler', label: 'Modeler', dashboard: 'modeling_artist' },
      { value: 'Character Modeler', label: 'Character Modeler', dashboard: 'modeling_artist' },
      { value: 'Environment Modeler', label: 'Environment Modeler', dashboard: 'modeling_artist' },
      { value: 'Prop Modeler', label: 'Prop Modeler', dashboard: 'modeling_artist' },
      { value: 'Hard Surface Modeler', label: 'Hard Surface Modeler', dashboard: 'modeling_artist' },
      { value: 'Modeling Lead', label: 'Modeling Lead', dashboard: 'production_lead' },
    ],
  },
  texturing: {
    label: 'Texturing Department',
    roles: [
      { value: 'Texture Artist', label: 'Texture Artist', dashboard: 'texturing_artist' },
      { value: 'LookDev Artist', label: 'LookDev Artist', dashboard: 'texturing_artist' },
      { value: 'Shader Artist', label: 'Shader Artist', dashboard: 'texturing_artist' },
      { value: 'Texturing Lead', label: 'Texturing Lead', dashboard: 'production_lead' },
    ],
  },
  rigging: {
    label: 'Rigging Department',
    roles: [
      { value: 'Rigger', label: 'Rigger', dashboard: 'rigging_artist' },
      { value: 'Character Rigger', label: 'Character Rigger', dashboard: 'rigging_artist' },
      { value: 'Creature Rigger', label: 'Creature Rigger', dashboard: 'rigging_artist' },
      { value: 'Rigging TD', label: 'Rigging TD', dashboard: 'rigging_artist' },
      { value: 'Rigging Lead', label: 'Rigging Lead', dashboard: 'production_lead' },
    ],
  },
  animation: {
    label: 'Animation Department',
    roles: [
      { value: 'Animator', label: 'Animator', dashboard: 'animation_artist' },
      { value: 'Character Animator', label: 'Character Animator', dashboard: 'animation_artist' },
      { value: 'Creature Animator', label: 'Creature Animator', dashboard: 'animation_artist' },
      { value: 'Facial Animator', label: 'Facial Animator', dashboard: 'animation_artist' },
      { value: 'Mocap Cleanup Artist', label: 'Mocap Cleanup Artist', dashboard: 'animation_artist' },
      { value: 'Animation Lead', label: 'Animation Lead', dashboard: 'production_lead' },
    ],
  },
  lighting: {
    label: 'Lighting Department',
    roles: [
      { value: 'Lighting Artist', label: 'Lighting Artist', dashboard: 'lighting_artist' },
      { value: 'Lighting TD', label: 'Lighting TD', dashboard: 'lighting_artist' },
      { value: 'Lighting Lead', label: 'Lighting Lead', dashboard: 'production_lead' },
    ],
  },
  vfx: {
    label: 'VFX / FX Department',
    roles: [
      { value: 'FX Artist', label: 'FX Artist', dashboard: 'vfx_artist' },
      { value: 'Simulation Artist', label: 'Simulation Artist', dashboard: 'vfx_artist' },
      { value: 'Pyro Artist', label: 'Pyro Artist', dashboard: 'vfx_artist' },
      { value: 'Cloth Sim Artist', label: 'Cloth Sim Artist', dashboard: 'vfx_artist' },
      { value: 'Hair/Groom Artist', label: 'Hair/Groom Artist', dashboard: 'vfx_artist' },
      { value: 'VFX Lead', label: 'VFX Lead', dashboard: 'production_lead' },
    ],
  },
  rendering: {
    label: 'Rendering Department',
    roles: [
      { value: 'Render Wrangler', label: 'Render Wrangler', dashboard: 'render_artist' },
      { value: 'Render TD', label: 'Render TD', dashboard: 'render_artist' },
      { value: 'Render Lead', label: 'Render Lead', dashboard: 'production_lead' },
    ],
  },
};

// Post-Production Department Roles
export const POST_PRODUCTION_ROLES: Record<string, DepartmentRoles> = {
  compositing: {
    label: 'Compositing Department',
    roles: [
      { value: 'compositor', label: 'Compositor', dashboard: 'artist' },
      { value: 'senior_compositor', label: 'Senior Compositor', dashboard: 'artist' },
      { value: 'roto_artist', label: 'Roto Artist', dashboard: 'artist' },
      { value: 'paint_artist', label: 'Paint Artist', dashboard: 'artist' },
      { value: 'compositing_lead', label: 'Compositing Lead', dashboard: 'hod' },
    ],
  },
  color: {
    label: 'Color Grading Department',
    roles: [
      { value: 'colorist', label: 'Colorist', dashboard: 'artist' },
      { value: 'color_assistant', label: 'Color Assistant', dashboard: 'artist' },
      { value: 'color_supervisor', label: 'Color Supervisor', dashboard: 'hod' },
    ],
  },
  sound: {
    label: 'Sound Department',
    roles: [
      { value: 'sound_designer', label: 'Sound Designer', dashboard: 'artist' },
      { value: 'foley_artist', label: 'Foley Artist', dashboard: 'artist' },
      { value: 'dialogue_editor', label: 'Dialogue Editor', dashboard: 'artist' },
      { value: 'sound_mixer', label: 'Sound Mixer', dashboard: 'artist' },
      { value: 'sound_supervisor', label: 'Sound Supervisor', dashboard: 'hod' },
    ],
  },
  editing: {
    label: 'Editing Department',
    roles: [
      { value: 'post_editor', label: 'Editor', dashboard: 'artist' },
      { value: 'post_assistant_editor', label: 'Assistant Editor', dashboard: 'artist' },
      { value: 'conform_artist', label: 'Conform Artist', dashboard: 'artist' },
      { value: 'post_supervisor', label: 'Post Supervisor', dashboard: 'hod' },
    ],
  },
  finishing: {
    label: 'DI / Finishing',
    roles: [
      { value: 'di_artist', label: 'DI Artist', dashboard: 'artist' },
      { value: 'finishing_artist', label: 'Finishing Artist', dashboard: 'artist' },
      { value: 'qc_specialist', label: 'QC Specialist', dashboard: 'artist' },
      { value: 'delivery_coordinator', label: 'Delivery Coordinator', dashboard: 'artist' },
    ],
  },
};

// Management Roles (Cross-Phase)
export const MANAGEMENT_ROLES: Record<string, DepartmentRoles> = {
  production_management: {
    label: 'Production Management',
    roles: [
      { value: 'producer', label: 'Producer', dashboard: 'producer' },
      { value: 'line_producer', label: 'Line Producer', dashboard: 'producer' },
      { value: 'production_manager', label: 'Production Manager', dashboard: 'production_manager' },
      { value: 'assistant_production_manager', label: 'Assistant Production Manager', dashboard: 'production_manager' },
    ],
  },
  direction: {
    label: 'Direction / Creative Control',
    roles: [
      { value: 'director', label: 'Director', dashboard: 'director' },
      { value: 'creative_director', label: 'Creative Director', dashboard: 'director' },
      { value: 'associate_director', label: 'Associate Director', dashboard: 'director' },
    ],
  },
  admin: {
    label: 'Administration',
    roles: [
      { value: 'super_user', label: 'Super User / Admin', dashboard: 'super_user' },
      { value: 'client', label: 'Client', dashboard: 'client' },
    ],
  },
};

// Get all roles for a specific phase
export function getRolesForPhase(phase: ProductionPhase): Record<string, DepartmentRoles> {
  switch (phase) {
    case 'pre_production':
      return PRE_PRODUCTION_ROLES;
    case 'production':
      return PRODUCTION_ROLES;
    case 'post_production':
      return POST_PRODUCTION_ROLES;
    case 'management':
      return MANAGEMENT_ROLES;
    default:
      return {};
  }
}

// Map specific role to dashboard type (ProductionRole)
export function getDashboardForRole(roleValue: string): string {
  const allDepartments = [
    ...Object.values(PRE_PRODUCTION_ROLES),
    ...Object.values(PRODUCTION_ROLES),
    ...Object.values(POST_PRODUCTION_ROLES),
    ...Object.values(MANAGEMENT_ROLES),
  ];

  for (const dept of allDepartments) {
    const role = dept.roles.find(r => r.value === roleValue);
    if (role) {
      return role.dashboard;
    }
  }
  return 'artist'; // Default
}

// Get all roles flat
export function getAllPhaseRoles() {
  return {
    pre_production: PRE_PRODUCTION_ROLES,
    production: PRODUCTION_ROLES,
    post_production: POST_PRODUCTION_ROLES,
    management: MANAGEMENT_ROLES,
  };
}
