import { supabase } from '@/integrations/supabase/client';

export interface ParsedScene {
  scene_number: string;
  slugline: string;
  location: string;
  time_of_day: string;
  description: string;
  characters: string[];
  props: string[];
  costumes: string[];
  vfx_required: boolean;
  vfx_complexity?: string;
  sound_cues: string[];
  camera_directions: string[];
  estimated_duration: number;
}

export interface ParsedScript {
  title: string;
  genre: string;
  scenes: ParsedScene[];
}

export async function parseScript(scriptText: string): Promise<ParsedScript> {
  const { data, error } = await supabase.functions.invoke('parse-script', {
    body: { scriptText },
  });

  if (error) {
    throw new Error(error.message || 'Failed to parse script');
  }

  return data as ParsedScript;
}

export async function translateScript(scriptText: string, targetLanguage: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('translate-script', {
    body: { scriptText, targetLanguage },
  });

  if (error) {
    throw new Error(error.message || 'Failed to translate script');
  }

  return data.translatedText;
}

export async function createProject(title: string, description: string, genre: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ title, description, genre })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createScenes(projectId: string, scenes: ParsedScene[]) {
  const scenesToInsert = scenes.map((scene, idx) => ({
    project_id: projectId,
    scene_number: scene.scene_number || String(idx + 1),
    slugline: scene.slugline || `Scene ${scene.scene_number || idx + 1}`,
    location: scene.location || '',
    time_of_day: scene.time_of_day || 'day',
    description: scene.description || '',
    characters: scene.characters || [],
    props: scene.props || [],
    costumes: scene.costumes || [],
    vfx_required: scene.vfx_required || false,
    vfx_complexity: scene.vfx_complexity || null,
    sound_cues: scene.sound_cues || [],
    camera_directions: scene.camera_directions || [],
    estimated_duration: Math.round(Number(scene.estimated_duration) || 0),
    assigned_departments: [],
    status: 'not_started',
  }));

  const { data, error } = await supabase
    .from('scenes')
    .insert(scenesToInsert)
    .select();

  if (error) throw error;
  return data;
}

export async function getProjects() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Run role checks in parallel for speed
  const [adminResult, profileResult, specificRolesResult] = await Promise.all([
    supabase.rpc('is_admin', { _user_id: user.id }),
    supabase.from('profiles').select('role').eq('user_id', user.id).single(),
    supabase.from('user_specific_roles').select('specific_role').eq('user_id', user.id),
  ]);

  const isAdmin = adminResult.data;
  const profile = profileResult.data;
  const specificRoles = specificRolesResult.data;

  // Supervisors and admins see all projects
  const supervisorRoles = ['Script Supervisor', 'Script Editor', 'VFX Supervisor'];
  const hasSupervisorRole = specificRoles?.some(r => supervisorRoles.includes(r.specific_role));
  
  if (isAdmin || profile?.role === 'super_user' || profile?.role === 'producer' || hasSupervisorRole) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // For regular users (including directors), get only assigned projects
  const { data: assignments, error: assignmentsError } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', user.id);

  if (assignmentsError) throw assignmentsError;

  const projectIds = assignments?.map(a => a.project_id) || [];
  
  if (projectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string) {
  // First delete all related data (scenes, tasks, storyboards)
  // Scenes will cascade delete storyboards and comments
  const { error: scenesError } = await supabase
    .from('scenes')
    .delete()
    .eq('project_id', projectId);

  if (scenesError) throw scenesError;

  // Delete tasks
  const { error: tasksError } = await supabase
    .from('tasks')
    .delete()
    .eq('project_id', projectId);

  if (tasksError) throw tasksError;

  // Finally delete the project
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

export async function renameProject(projectId: string, title: string) {
  const { data, error } = await supabase
    .from('projects')
    .update({ title })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScene(sceneId: string) {
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('id', sceneId);

  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

export async function getProjectScenes(projectId: string) {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_number', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateScene(sceneId: string, updates: {
  characters?: string[];
  props?: string[];
  costumes?: string[];
  sound_cues?: string[];
  camera_directions?: string[];
  vfx_required?: boolean;
  vfx_complexity?: string;
  description?: string;
  location?: string;
  time_of_day?: string;
  estimated_duration?: number;
  scene_number?: string;
}) {
  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', sceneId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function reorderScenes(scenes: { id: string; scene_number: string }[]) {
  const updates = scenes.map(({ id, scene_number }) =>
    supabase
      .from('scenes')
      .update({ scene_number })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function getTasks() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is admin - admins see all tasks
  const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
  
  if (isAdmin) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // For non-admins, get only tasks from assigned projects
  const { data: assignments, error: assignmentsError } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', user.id);

  if (assignmentsError) throw assignmentsError;

  const projectIds = assignments?.map(a => a.project_id) || [];
  
  if (projectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTask(task: {
  project_id: string;
  scene_id?: string;
  title: string;
  description?: string;
  department: string;
  priority?: string;
  due_date?: string;
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaskStatus(taskId: string, status: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Storyboard APIs
export async function getSceneStoryboards(sceneId: string) {
  const { data, error } = await supabase
    .from('storyboards')
    .select('*')
    .eq('scene_id', sceneId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getProjectStoryboards(projectId: string) {
  // First get scenes for the project, then get storyboards for those scenes
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId);
  
  if (scenesError) throw scenesError;
  if (!scenes || scenes.length === 0) return [];
  
  const sceneIds = scenes.map(s => s.id);
  const { data, error } = await supabase
    .from('storyboards')
    .select(`
      *,
      scenes(scene_number, slugline)
    `)
    .in('scene_id', sceneIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export interface GenerateStoryboardParams {
  sceneId: string;
  sceneNumber: string;
  slugline: string;
  description: string;
  characters?: string[];
  location?: string;
  timeOfDay?: string;
  mood?: string;
  shotType?: string;
  cameraAngle?: string;
  workflowConfig?: Record<string, unknown>;
  // Lens and lighting parameters
  lensType?: string;
  lensFocalLength?: string;
  lightingSetup?: string;
  lightingMood?: string;
  projectId?: string;
  artStyle?: string;
  // Complete camera settings
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focusType?: string;
  focusDistance?: string;
  cameraMovement?: string;
  cameraMovementSpeed?: string;
}

export async function generateStoryboard(params: GenerateStoryboardParams) {
  const { data, error } = await supabase.functions.invoke('generate-storyboard', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate storyboard');
  }

  return data;
}

export async function saveStoryboard(storyboard: {
  scene_id: string;
  shot_number: string;
  image_url: string;
  prompt?: string;
  shot_type?: string;
  camera_angle?: string;
  mood?: string;
  action?: string;
  lighting?: string;
  sort_order?: number;
}) {
  // Get max sort_order for the scene
  const { data: existing } = await supabase
    .from('storyboards')
    .select('sort_order')
    .eq('scene_id', storyboard.scene_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxSortOrder = existing?.[0]?.sort_order ?? -1;

  const { data, error } = await supabase
    .from('storyboards')
    .insert({
      ...storyboard,
      status: 'generated',
      version: 1,
      sort_order: maxSortOrder + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStoryboardOrder(storyboardId: string, sortOrder: number) {
  const { data, error } = await supabase
    .from('storyboards')
    .update({ sort_order: sortOrder })
    .eq('id', storyboardId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function reorderStoryboards(storyboards: { id: string; sort_order: number }[]) {
  const updates = storyboards.map(({ id, sort_order }) =>
    supabase
      .from('storyboards')
      .update({ sort_order })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function deleteStoryboard(storyboardId: string) {
  const { error } = await supabase
    .from('storyboards')
    .delete()
    .eq('id', storyboardId);

  if (error) throw error;
}

// Storyboard Comments APIs
export interface StoryboardComment {
  id: string;
  storyboard_id: string;
  user_id: string;
  content: string;
  position_x?: number;
  position_y?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export async function getStoryboardComments(storyboardId: string) {
  const { data: comments, error } = await supabase
    .from('storyboard_comments')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  
  // Fetch profiles separately
  if (comments && comments.length > 0) {
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return comments.map(c => ({
      ...c,
      profiles: profileMap.get(c.user_id) || { full_name: 'Unknown', avatar_url: null }
    })) as StoryboardComment[];
  }
  
  return [] as StoryboardComment[];
}

export async function createComment(comment: {
  storyboard_id: string;
  user_id: string;
  content: string;
  position_x?: number;
  position_y?: number;
}) {
  const { data, error } = await supabase
    .from('storyboard_comments')
    .insert(comment)
    .select()
    .single();

  if (error) throw error;
  
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .eq('user_id', comment.user_id)
    .single();
  
  return {
    ...data,
    profiles: profile || { full_name: 'Unknown', avatar_url: null }
  } as StoryboardComment;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('storyboard_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

// Subscribe to real-time comments
export function subscribeToComments(
  storyboardId: string,
  onInsert: (comment: any) => void,
  onDelete: (commentId: string) => void
) {
  const channel = supabase
    .channel(`storyboard-comments-${storyboardId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'storyboard_comments',
        filter: `storyboard_id=eq.${storyboardId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'storyboard_comments',
        filter: `storyboard_id=eq.${storyboardId}`,
      },
      (payload) => onDelete(payload.old.id)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
