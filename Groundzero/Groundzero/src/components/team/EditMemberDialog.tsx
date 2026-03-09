import { useState, useEffect, useMemo } from 'react';
import { Edit, Eye, EyeOff, Power, PowerOff, FolderKanban, Building2, Layers, X, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ProductionPhase,
  PRE_PRODUCTION_ROLES,
  PRODUCTION_ROLES,
  POST_PRODUCTION_ROLES,
  MANAGEMENT_ROLES,
  getDashboardForRole,
} from '@/types/preprodRoles';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  specific_role?: string;
  phase?: string;
  is_active?: boolean;
  status?: string;
  department_id?: string;
}

interface Project {
  id: string;
  title: string;
}

interface Department {
  id: string;
  name: string;
  phase: string | null;
}

interface SelectedRole {
  specific_role: string;
  phase: string;
}

interface EditMemberDialogProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberUpdated: () => void;
}

const PRODUCTION_PHASES = [
  { value: 'management', label: 'Management / Administration' },
  { value: 'pre_production', label: 'Pre-Production' },
  { value: 'production', label: 'Production' },
  { value: 'post_production', label: 'Post-Production' },
];

const statusOptions = [
  { value: 'active', label: 'Active', color: 'bg-success/20 text-success' },
  { value: 'inactive', label: 'Inactive', color: 'bg-muted text-muted-foreground' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-warning/20 text-warning' },
  { value: 'terminated', label: 'Terminated', color: 'bg-destructive/20 text-destructive' },
];

export function EditMemberDialog({ member, open, onOpenChange, onMemberUpdated }: EditMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<SelectedRole[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    phase: '' as ProductionPhase | '',
    specificRole: '',
    status: 'active',
    is_active: true,
    newPassword: '',
    departmentId: '',
  });

  useEffect(() => {
    if (member && open) {
      loadDepartments().then((depts) => {
        // Determine phase from specific_role or department
        let memberPhase = member.phase || '';
        const currentDept = depts.find(d => d.id === member.department_id);
        if (!memberPhase && currentDept?.phase) {
          memberPhase = currentDept.phase;
        }
        
        setFormData({
          fullName: member.full_name || '',
          phase: memberPhase as ProductionPhase || '',
          specificRole: member.specific_role || '',
          status: member.status || 'active',
          is_active: member.is_active !== false,
          newPassword: '',
          departmentId: member.department_id || '',
        });
      });
      loadProjects();
      loadAssignedProjects(member.user_id);
      loadUserSpecificRoles(member.user_id);
    }
  }, [member, open]);

  const loadUserSpecificRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_specific_roles')
      .select('specific_role, phase')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error loading user specific roles:', error);
      return;
    }
    
    setSelectedRoles(data?.map(r => ({ 
      specific_role: r.specific_role, 
      phase: r.phase || 'production' 
    })) || []);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, phase')
      .order('name');
    
    const depts = (data || []).map(d => ({
      id: d.id,
      name: d.name,
      phase: d.phase || 'production'
    }));
    setDepartments(depts);
    return depts;
  };

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('id, title').order('title');
    setProjects(data || []);
  };

  const loadAssignedProjects = async (authUserId: string) => {
    const { data, error } = await supabase
      .from('project_assignments')
      .select('project_id')
      .eq('user_id', authUserId);
    
    if (error) {
      console.error('Error loading assigned projects:', error);
      return;
    }
    setAssignedProjects(data?.map(a => a.project_id) || []);
  };

  // Get roles based on selected phase
  const phaseRoles = useMemo(() => {
    switch (formData.phase) {
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
  }, [formData.phase]);

  // Get dashboard type for selected role
  const dashboardType = useMemo(() => {
    if (!formData.specificRole) return null;
    return getDashboardForRole(formData.specificRole);
  }, [formData.specificRole]);

  const filteredDepartments = formData.phase 
    ? departments.filter(d => {
        if (formData.phase === 'management') return true;
        return d.phase === formData.phase;
      })
    : departments;

  const handlePhaseChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      phase: value === 'all' ? '' : value as ProductionPhase, 
      specificRole: '', 
      departmentId: '' 
    }));
  };

  // Add a role to the selected roles list
  const addSelectedRole = () => {
    if (!formData.specificRole || !formData.phase) return;
    
    // Check if role already exists
    const exists = selectedRoles.some(r => r.specific_role === formData.specificRole);
    if (exists) {
      toast.error('This role is already added');
      return;
    }
    
    setSelectedRoles(prev => [...prev, { 
      specific_role: formData.specificRole, 
      phase: formData.phase 
    }]);
    
    // Clear selection for next role
    setFormData(prev => ({ ...prev, specificRole: '' }));
    toast.success('Role added');
  };

  // Remove a role from the selected roles list
  const removeSelectedRole = (roleToRemove: string) => {
    setSelectedRoles(prev => prev.filter(r => r.specific_role !== roleToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    // Validate that at least one role is selected (either from multi-select or single select)
    const hasRoles = selectedRoles.length > 0 || formData.specificRole;
    if (!hasRoles && formData.phase && formData.phase !== 'management') {
      toast.error('Please select at least one role');
      return;
    }

    setLoading(true);
    try {
      // Determine primary role for profile table (use first role from multi-select or single select)
      const primaryRole = selectedRoles.length > 0 
        ? selectedRoles[0].specific_role 
        : formData.specificRole;
      const primaryPhase = selectedRoles.length > 0 
        ? selectedRoles[0].phase 
        : formData.phase;

      // Get the dashboard role for routing
      const dashboardRole = primaryRole 
        ? getDashboardForRole(primaryRole)
        : 'artist';

      // Use edge function to update role to ensure proper sync
      const { data: updateResult, error: updateError } = await supabase.functions.invoke('create-team-user', {
        body: {
          action: 'update_role',
          userId: member.user_id,
          profileId: member.id,
          fullName: formData.fullName.trim(),
          role: dashboardRole, // Dashboard role for routing
          specificRole: primaryRole, // Primary specific job role
          phase: primaryPhase,
          status: formData.status,
          isActive: formData.is_active,
          departmentId: formData.departmentId || null,
          // Pass all selected roles for multi-role support
          allRoles: selectedRoles.length > 0 ? selectedRoles : (formData.specificRole ? [{ specific_role: formData.specificRole, phase: formData.phase }] : []),
        },
      });

      if (updateError) throw updateError;
      if (updateResult?.error) throw new Error(updateResult.error);

      // Update password if provided
      if (formData.newPassword.trim()) {
        const { error } = await supabase.functions.invoke('create-team-user', {
          body: {
            action: 'update_password',
            userId: member.user_id,
            password: formData.newPassword,
          },
        });
        if (error) throw error;
      }

      // Update project assignments - use user_id (auth.users id), not profile id
      const { error: deleteError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('user_id', member.user_id);
      
      if (deleteError) {
        console.error('Error deleting assignments:', deleteError);
      }
      
      if (assignedProjects.length > 0) {
        const assignments = assignedProjects.map(projectId => ({
          user_id: member.user_id,
          project_id: projectId,
          can_edit: true,
        }));
        
        const { error: insertError } = await supabase
          .from('project_assignments')
          .insert(assignments);
        
        if (insertError) {
          console.error('Error inserting assignments:', insertError);
          throw insertError;
        }
      }

      toast.success('Team member updated successfully');
      onOpenChange(false);
      onMemberUpdated();
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast.error(error.message || 'Failed to update team member');
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectAssignment = (projectId: string) => {
    setAssignedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleLoginStatus = async () => {
    if (!member) return;
    const newStatus = !formData.is_active;
    setFormData(prev => ({ ...prev, is_active: newStatus }));
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Edit Team Member
          </DialogTitle>
          <DialogDescription>
            Update member details, role assignment, and project access
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={member.email} disabled className="bg-muted/50" />
              </div>
            </div>

            {/* Phase & Role Assignment */}
            <div className="space-y-3 p-4 rounded-lg border border-border bg-secondary/20">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="w-4 h-4" />
                Role Assignment
              </Label>
              <p className="text-xs text-muted-foreground">
                Role determines which dashboard and features the user can access
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phase">Production Phase *</Label>
                  <Select
                    value={formData.phase || 'all'}
                    onValueChange={handlePhaseChange}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select production phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Phases</SelectItem>
                      {PRODUCTION_PHASES.map((phase) => (
                        <SelectItem key={phase.value} value={phase.value}>
                          {phase.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.phase && Object.keys(phaseRoles).length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Add Role</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.specificRole}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, specificRole: value }))}
                      >
                        <SelectTrigger className="bg-secondary/50 flex-1">
                          <SelectValue placeholder="Select a role to add" />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-[300px]">
                            {Object.entries(phaseRoles).map(([deptKey, dept]) => (
                              <SelectGroup key={deptKey}>
                                <SelectLabel className="text-primary font-semibold py-2">
                                  {dept.label}
                                </SelectLabel>
                                {dept.roles.map((role) => (
                                  <SelectItem 
                                    key={role.value} 
                                    value={role.value}
                                    disabled={selectedRoles.some(r => r.specific_role === role.value)}
                                  >
                                    {role.label}
                                    {selectedRoles.some(r => r.specific_role === role.value) && ' ✓'}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        size="icon" 
                        onClick={addSelectedRole}
                        disabled={!formData.specificRole}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {dashboardType && formData.specificRole && (
                      <p className="text-xs text-muted-foreground">
                        Dashboard: <span className="text-primary capitalize">{dashboardType.replace(/_/g, ' ')}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Roles Display */}
                {selectedRoles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Assigned Roles ({selectedRoles.length})
                    </Label>
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-secondary/30">
                      {selectedRoles.map((role) => (
                        <Badge 
                          key={role.specific_role} 
                          variant="secondary"
                          className="flex items-center gap-1.5 pr-1"
                        >
                          {role.specific_role}
                          <span className="text-xs opacity-70">({role.phase})</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedRole(role.specific_role)}
                            className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      User will have access to dashboards for all assigned roles
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Select
                    value={formData.departmentId || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      departmentId: value === 'none' ? '' : value 
                    }))}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Login Control */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                {formData.is_active ? (
                  <Power className="w-5 h-5 text-success" />
                ) : (
                  <PowerOff className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium text-sm">Login Access</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.is_active ? 'User can log in' : 'User cannot log in'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={formData.is_active ? "destructive" : "default"}
                size="sm"
                onClick={toggleLoginStatus}
              >
                {formData.is_active ? 'Disable Login' : 'Enable Login'}
              </Button>
            </div>

            {/* Password Reset */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="bg-secondary/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Project Assignments */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                Project Assignments
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-3 rounded-lg border border-border bg-secondary/20">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects available</p>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="flex items-center gap-3">
                      <Checkbox
                        id={project.id}
                        checked={assignedProjects.includes(project.id)}
                        onCheckedChange={() => toggleProjectAssignment(project.id)}
                      />
                      <label 
                        htmlFor={project.id} 
                        className="text-sm cursor-pointer flex-1"
                      >
                        {project.title}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {assignedProjects.length} project(s) assigned
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}