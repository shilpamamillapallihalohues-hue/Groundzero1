import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Users, FolderKanban, LayoutGrid, Loader2, Building2, Bell } from 'lucide-react';
import { ALL_PAGES, PAGE_CATEGORIES, getPagesByCategory, PageCategory } from '@/hooks/usePagePermissions';
import { DepartmentsTab } from '@/components/admin/DepartmentsTab';
import { NotificationRoutingTab } from '@/components/admin/NotificationRoutingTab';

const USER_ROLES = [
  { value: 'super_user', label: 'Super User' },
  { value: 'producer', label: 'Producer' },
  { value: 'director', label: 'Director' },
  { value: 'production_manager', label: 'Production Manager' },
  { value: 'hod', label: 'HOD / Lead' },
  { value: 'art_director', label: 'Art Director' },
  { value: 'storyboard_supervisor', label: 'Storyboard Supervisor' },
  { value: 'artist', label: 'Artist' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'client', label: 'Client' },
] as const;

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Project {
  id: string;
  title: string;
}

interface ProjectAssignment {
  project_id: string;
  user_id: string;
}

interface PagePermission {
  page_key: string;
  user_id: string;
  can_access: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [pagePermissions, setPagePermissions] = useState<PagePermission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (!isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }
      loadData();
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all profiles (excluding admin)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('email', 'viswas.ganti@deepixel.in');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load all project assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('project_id, user_id');

      if (assignmentsError) throw assignmentsError;
      setProjectAssignments(assignmentsData || []);

      // Load all page permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('page_permissions')
        .select('page_key, user_id, can_access');

      if (permissionsError) throw permissionsError;
      setPagePermissions(permissionsData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const isProjectAssigned = (projectId: string, userId: string): boolean => {
    return projectAssignments.some(a => a.project_id === projectId && a.user_id === userId);
  };

  const hasPagePermission = (pageKey: string, userId: string): boolean => {
    const perm = pagePermissions.find(p => p.page_key === pageKey && p.user_id === userId);
    return perm?.can_access ?? false;
  };

  const toggleProjectAssignment = async (projectId: string, userId: string) => {
    setIsSaving(true);
    try {
      const isAssigned = isProjectAssigned(projectId, userId);
      
      if (isAssigned) {
        const { error } = await supabase
          .from('project_assignments')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId);
        
        if (error) throw error;
        setProjectAssignments(prev => prev.filter(a => !(a.project_id === projectId && a.user_id === userId)));
        toast.success('Project unassigned');
      } else {
        const { error } = await supabase
          .from('project_assignments')
          .insert({
            project_id: projectId,
            user_id: userId,
            assigned_by: user?.id
          });
        
        if (error) throw error;
        setProjectAssignments(prev => [...prev, { project_id: projectId, user_id: userId }]);
        toast.success('Project assigned');
      }
    } catch (error) {
      console.error('Error toggling project assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePagePermission = async (pageKey: string, userId: string) => {
    setIsSaving(true);
    try {
      const currentPerm = pagePermissions.find(p => p.page_key === pageKey && p.user_id === userId);
      
      if (currentPerm) {
        // Update existing
        const { error } = await supabase
          .from('page_permissions')
          .update({ can_access: !currentPerm.can_access })
          .eq('page_key', pageKey)
          .eq('user_id', userId);
        
        if (error) throw error;
        setPagePermissions(prev => prev.map(p => 
          p.page_key === pageKey && p.user_id === userId 
            ? { ...p, can_access: !p.can_access }
            : p
        ));
      } else {
        // Insert new permission
        const { error } = await supabase
          .from('page_permissions')
          .insert({
            page_key: pageKey,
            user_id: userId,
            can_access: true,
            granted_by: user?.id
          });
        
        if (error) throw error;
        setPagePermissions(prev => [...prev, { page_key: pageKey, user_id: userId, can_access: true }]);
      }
      
      toast.success('Permission updated');
    } catch (error) {
      console.error('Error toggling page permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setIsSaving(false);
    }
  };

  const grantAllPages = async (userId: string) => {
    setIsSaving(true);
    try {
      // First delete all existing permissions for this user
      await supabase
        .from('page_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert all pages with can_access = true
      const permissions = ALL_PAGES
        .filter(p => p.key !== 'admin') // Don't grant admin page access
        .map(page => ({
          page_key: page.key,
          user_id: userId,
          can_access: true,
          granted_by: user?.id
        }));

      const { error } = await supabase
        .from('page_permissions')
        .insert(permissions);

      if (error) throw error;

      // Update local state
      setPagePermissions(prev => {
        const filtered = prev.filter(p => p.user_id !== userId);
        return [...filtered, ...permissions.map(p => ({ page_key: p.page_key, user_id: p.user_id, can_access: p.can_access }))];
      });

      toast.success('All pages granted');
    } catch (error) {
      console.error('Error granting all pages:', error);
      toast.error('Failed to grant all pages');
    } finally {
      setIsSaving(false);
    }
  };

  const grantCategoryPages = async (userId: string, category: PageCategory) => {
    setIsSaving(true);
    try {
      const categoryPages = getPagesByCategory(category);
      
      // Delete existing permissions for these pages
      for (const page of categoryPages) {
        await supabase
          .from('page_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('page_key', page.key);
      }

      // Insert new permissions
      const permissions = categoryPages.map(page => ({
        page_key: page.key,
        user_id: userId,
        can_access: true,
        granted_by: user?.id
      }));

      const { error } = await supabase
        .from('page_permissions')
        .insert(permissions);

      if (error) throw error;

      // Update local state
      setPagePermissions(prev => {
        const filtered = prev.filter(p => 
          !(p.user_id === userId && categoryPages.some(cp => cp.key === p.page_key))
        );
        return [...filtered, ...permissions.map(p => ({ page_key: p.page_key, user_id: p.user_id, can_access: p.can_access }))];
      });

      const categoryName = PAGE_CATEGORIES.find(c => c.id === category)?.name || category;
      toast.success(`${categoryName} pages granted`);
    } catch (error) {
      console.error('Error granting category pages:', error);
      toast.error('Failed to grant pages');
    } finally {
      setIsSaving(false);
    }
  };

  const revokeAllPages = async (userId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('page_permissions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setPagePermissions(prev => prev.filter(p => p.user_id !== userId));
      toast.success('All pages revoked');
    } catch (error) {
      console.error('Error revoking all pages:', error);
      toast.error('Failed to revoke pages');
    } finally {
      setIsSaving(false);
    }
  };

  const updateUserRole = async (profileId: string, newRole: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => 
        p.id === profileId ? { ...p, role: newRole } : p
      ));
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || roleLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Manage user access and permissions</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Project Assignments
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Page Permissions
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>View all registered team members</CardDescription>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No team members found</p>
                ) : (
                  <div className="space-y-3">
                    {profiles.map(profile => (
                      <div key={profile.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-sm font-bold text-primary-foreground">
                            {profile.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{profile.full_name}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                        <Select
                          value={profile.role}
                          onValueChange={(value) => updateUserRole(profile.id, value)}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLES.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentsTab />
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Project Assignments</CardTitle>
                <CardDescription>Assign projects to individual team members</CardDescription>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 || projects.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {projects.length === 0 ? 'No projects found' : 'No team members found'}
                  </p>
                ) : (
                  <div className="space-y-6">
                    {profiles.map(profile => (
                      <div key={profile.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-sm font-bold text-primary-foreground">
                            {profile.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {projects.map(project => (
                            <label 
                              key={project.id} 
                              className="flex items-center gap-2 p-2 rounded border hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                checked={isProjectAssigned(project.id, profile.user_id)}
                                onCheckedChange={() => toggleProjectAssignment(project.id, profile.user_id)}
                                disabled={isSaving}
                              />
                              <span className="text-sm truncate">{project.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <CardTitle>Page Permissions</CardTitle>
                <CardDescription>
                  Control which pages each team member can access. Grant by category or individually.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No team members found</p>
                ) : (
                  <div className="space-y-6">
                    {profiles.map(profile => (
                      <div key={profile.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-sm font-bold text-primary-foreground">
                              {profile.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground">{profile.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => grantAllPages(profile.user_id)}
                              disabled={isSaving}
                            >
                              Grant All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokeAllPages(profile.user_id)}
                              disabled={isSaving}
                            >
                              Revoke All
                            </Button>
                          </div>
                        </div>

                        {/* Category Quick Grant Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                          {PAGE_CATEGORIES.map(category => {
                            const categoryPages = getPagesByCategory(category.id);
                            const grantedCount = categoryPages.filter(p => 
                              hasPagePermission(p.key, profile.user_id)
                            ).length;
                            const isFullyGranted = grantedCount === categoryPages.length;
                            
                            return (
                              <Button
                                key={category.id}
                                variant={isFullyGranted ? "default" : "outline"}
                                size="sm"
                                onClick={() => grantCategoryPages(profile.user_id, category.id)}
                                disabled={isSaving}
                                className="flex items-center gap-2"
                              >
                                <div className={`w-2 h-2 rounded-full ${category.color}`} />
                                {category.name}
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {grantedCount}/{categoryPages.length}
                                </Badge>
                              </Button>
                            );
                          })}
                        </div>

                        {/* Individual Page Permissions by Category */}
                        <div className="space-y-4">
                          {PAGE_CATEGORIES.map(category => {
                            const categoryPages = getPagesByCategory(category.id);
                            if (categoryPages.length === 0) return null;
                            
                            return (
                              <div key={category.id}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-2 h-2 rounded-full ${category.color}`} />
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {category.name}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pl-4">
                                  {categoryPages
                                    .filter(p => p.key !== 'admin')
                                    .map(page => (
                                      <label 
                                        key={page.key} 
                                        className="flex items-center gap-2 p-2 rounded border hover:bg-accent cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={hasPagePermission(page.key, profile.user_id)}
                                          onCheckedChange={() => togglePagePermission(page.key, profile.user_id)}
                                          disabled={isSaving}
                                        />
                                        <span className="text-sm">{page.name}</span>
                                      </label>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationRoutingTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
