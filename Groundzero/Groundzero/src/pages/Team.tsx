import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Edit, Filter, Mail, MoreVertical, Plus, Power, PowerOff, Search, SortAsc, Users, UserPlus, Building2, ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react';
// MainLayout is provided by App.tsx router - do not import here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InviteMemberDialog } from '@/components/team/InviteMemberDialog';
import { EditMemberDialog } from '@/components/team/EditMemberDialog';
import { TasksTab } from '@/components/work-tracking/TasksTab';
import { ProgressReportsTab } from '@/components/work-tracking/ProgressReportsTab';
import { WorkEmployee, WorkTask, WorkProgressReport } from '@/pages/WorkTracking';
const roleColors: Record<string, string> = {
  super_user: 'bg-destructive/20 text-destructive',
  producer: 'bg-primary/20 text-primary',
  director: 'bg-amber-500/20 text-amber-500',
  production_manager: 'bg-blue-500/20 text-blue-500',
  hod: 'bg-purple-500/20 text-purple-500',
  department_head: 'bg-info/20 text-info',
  artist: 'bg-success/20 text-success',
  vendor: 'bg-cyan-500/20 text-cyan-500',
  client: 'bg-warning/20 text-warning',
};

const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success',
  inactive: 'bg-muted text-muted-foreground',
  on_leave: 'bg-warning/20 text-warning',
  terminated: 'bg-destructive/20 text-destructive',
};

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active?: boolean;
  status?: string;
  department_id?: string;
  department_name?: string;
  isPending?: boolean;
}

// Employee Migration Card Component
function EmployeeMigrationCard({ 
  employee, 
  departments, 
  index,
  onMigrated 
}: { 
  employee: WorkEmployee; 
  departments: { id: string; name: string }[];
  index: number;
  onMigrated: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'artist',
    departmentId: '',
  });

  // Find matching department by name
  useEffect(() => {
    if (employee.department && departments.length > 0) {
      const matchingDept = departments.find(d => 
        d.name.toLowerCase().includes(employee.department?.toLowerCase() || '') ||
        employee.department?.toLowerCase().includes(d.name.toLowerCase())
      );
      if (matchingDept) {
        setFormData(prev => ({ ...prev, departmentId: matchingDept.id }));
      }
    }
  }, [employee.department, departments]);

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      // Create auth user via edge function
      const { data, error } = await supabase.functions.invoke('create-team-user', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: employee.name,
          role: formData.role,
          departmentId: formData.departmentId || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Link work_employee to the new profile
      if (data?.user?.id) {
        // Find the profile by user_id
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (profileData) {
          // Update work_employee with profile_id
          await supabase
            .from('work_employees')
            .update({ 
              profile_id: profileData.id,
              department_id: formData.departmentId || null,
              email: formData.email
            })
            .eq('id', employee.id);
        }
      }

      toast.success(`${employee.name} has been migrated to a team member!`);
      setDialogOpen(false);
      onMigrated();
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Failed to migrate employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="group relative p-5 rounded-xl border border-dashed border-amber-500/50 bg-card hover:border-amber-500 transition-all animate-slide-up"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <Badge className="absolute top-3 right-3 text-xs bg-amber-500/20 text-amber-500">
          Needs Migration
        </Badge>

        <div className="mb-4 mt-2">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
            {employee.name?.split(' ').map(n => n[0]).join('') || 'E'}
          </div>
        </div>

        <h3 className="font-semibold text-foreground">{employee.name}</h3>
        <p className="text-sm text-muted-foreground mb-1">{employee.designation || 'Employee'}</p>
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {employee.department || 'No department'}
        </p>

        <Button 
          variant="gold" 
          size="sm" 
          className="w-full gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Migrate Employee to Team
            </DialogTitle>
            <DialogDescription>
              Create login credentials for {employee.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMigrate} className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-medium">{employee.name}</p>
              <p className="text-sm text-muted-foreground">{employee.department} - {employee.designation}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="employee@company.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artist">Artist</SelectItem>
                    <SelectItem value="hod">HOD / Lead</SelectItem>
                    <SelectItem value="production_manager">Production Manager</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Team() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  
  // Work tracking data
  const [employees, setEmployees] = useState<WorkEmployee[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [reports, setReports] = useState<WorkProgressReport[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTeam();
      loadWorkTrackingData();
      loadDepartments();
    }
  }, [isAuthenticated]);

  const loadDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name');
    setDepartments(data || []);
  };

  const loadTeam = async () => {
    try {
      // Fetch active profiles with department info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, user_id, full_name, email, role, is_active, status, department_id,
          departments:department_id (name)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('id, full_name, email, role')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      // Combine both lists
      const activeMembers = (profiles || []).map((p: any) => ({ 
        ...p, 
        isPending: false,
        department_name: p.departments?.name 
      }));
      const pendingMembers = (invitations || []).map(i => ({ ...i, user_id: '', isPending: true }));
      
      setTeamMembers([...activeMembers, ...pendingMembers]);
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoadingData(false);
    }
  };

  const loadWorkTrackingData = async () => {
    try {
      // Load employees
      const { data: employeesData } = await supabase
        .from('work_employees')
        .select('*')
        .order('name');
      setEmployees(employeesData || []);

      // Load tasks
      const { data: tasksData } = await supabase
        .from('work_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      const tasksWithEmployees = (tasksData || []).map(task => ({
        ...task,
        employee: employeesData?.find(e => e.id === task.employee_id)
      }));
      setTasks(tasksWithEmployees);

      // Load reports
      const { data: reportsData } = await supabase
        .from('work_progress_reports')
        .select('*')
        .order('report_date', { ascending: false });
      
      const reportsWithTasks = (reportsData || []).map(report => ({
        ...report,
        task: tasksWithEmployees.find(t => t.id === report.task_id)
      }));
      setReports(reportsWithTasks);
    } catch (error) {
      console.error('Error loading work tracking data:', error);
    }
  };

  const toggleLoginStatus = async (member: TeamMember) => {
    if (member.isPending) return;
    
    const newStatus = !member.is_active;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', member.id);
      
      if (error) throw error;
      
      toast.success(`Login ${newStatus ? 'enabled' : 'disabled'} for ${member.full_name}`);
      loadTeam();
    } catch (error) {
      console.error('Error toggling login:', error);
      toast.error('Failed to update login status');
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setEditDialogOpen(true);
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // Apply filters and sorting
  let filteredMembers = teamMembers.filter(m => {
    const matchesSearch = m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || m.department_id === departmentFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && m.is_active !== false) ||
      (statusFilter === 'inactive' && m.is_active === false) ||
      (statusFilter === 'pending' && m.isPending);
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  // Apply sorting
  filteredMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.full_name || '').localeCompare(b.full_name || '');
      case 'role':
        return (a.role || '').localeCompare(b.role || '');
      case 'department':
        return (a.department_name || '').localeCompare(b.department_name || '');
      default:
        return 0;
    }
  });

  const uniqueRoles = [...new Set(teamMembers.map(m => m.role).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members, work tracking, and tasks
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="members">Team Members ({teamMembers.length})</TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <ArrowRightLeft className="w-3 h-3" />
              Employees ({employees.filter(e => !e.profile_id).length})
            </TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="reports">Progress Reports ({reports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role?.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Disabled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]">
                  <SortAsc className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="role">By Role</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                </SelectContent>
              </Select>
              
              <InviteMemberDialog onMemberAdded={loadTeam}>
                <Button variant="gold" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Member
                </Button>
              </InviteMemberDialog>
            </div>

            {/* Team Grid */}
            {loadingData ? (
              <div className="text-center py-12 text-muted-foreground">Loading team...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm || roleFilter !== 'all' || departmentFilter !== 'all' ? 'No team members found' : 'Your team'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try a different search term or filter' : 'Team members will appear here'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMembers.map((member, index) => (
                  <div 
                    key={member.id}
                    className={cn(
                      "group relative p-5 rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg animate-slide-up",
                      member.isPending && "border-dashed opacity-80",
                      member.is_active === false && !member.isPending && "opacity-60"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Action Menu */}
                    {!member.isPending && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-3 right-3 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(member)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleLoginStatus(member)}>
                            {member.is_active !== false ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2 text-destructive" />
                                <span className="text-destructive">Disable Login</span>
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2 text-success" />
                                <span className="text-success">Enable Login</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {member.isPending && (
                        <Badge variant="outline" className="text-xs gap-1 bg-warning/10 text-warning border-warning/30">
                          <Clock className="w-3 h-3" />
                          Pending
                        </Badge>
                      )}
                      {!member.isPending && member.is_active === false && (
                        <Badge variant="outline" className="text-xs gap-1 bg-destructive/10 text-destructive border-destructive/30">
                          <PowerOff className="w-3 h-3" />
                          Disabled
                        </Badge>
                      )}
                      {!member.isPending && member.status && member.status !== 'active' && (
                        <Badge className={cn("text-xs capitalize", statusColors[member.status])}>
                          {member.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>

                    <div className="relative mb-4 mt-6">
                      <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-primary-foreground",
                        member.isPending || member.is_active === false
                          ? "bg-muted text-muted-foreground" 
                          : "bg-gradient-to-br from-primary to-amber-500"
                      )}>
                        {member.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground">{member.full_name || 'Unknown'}</h3>
                    <p className="text-sm text-muted-foreground mb-1 capitalize">{member.role?.replace('_', ' ') || 'Member'}</p>
                    {member.department_name && (
                      <p className="text-xs text-muted-foreground mb-3">{member.department_name}</p>
                    )}

                    <Badge className={cn("capitalize mb-4", roleColors[member.role] || 'bg-secondary text-secondary-foreground')}>
                      {member.role?.replace('_', ' ') || 'Member'}
                    </Badge>

                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Employees Tab - For migrating work_employees to team members */}
          <TabsContent value="employees" className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Employee Migration</p>
                <p className="text-xs text-muted-foreground">
                  These are legacy employees from the Work Tracking system. Click "Create Account" to migrate them to full team members with login access.
                </p>
              </div>
            </div>

            {employees.filter(e => !e.profile_id).length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">All employees migrated!</h3>
                <p className="text-muted-foreground">
                  All legacy employees have been converted to team members.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.filter(e => !e.profile_id).map((emp, index) => (
                  <EmployeeMigrationCard 
                    key={emp.id} 
                    employee={emp} 
                    departments={departments}
                    index={index}
                    onMigrated={() => {
                      loadTeam();
                      loadWorkTrackingData();
                    }}
                  />
                ))}
              </div>
            )}

            {/* Show already migrated employees */}
            {employees.filter(e => e.profile_id).length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" />
                  Already Migrated ({employees.filter(e => e.profile_id).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {employees.filter(e => e.profile_id).map(emp => (
                    <div key={emp.id} className="p-3 rounded-lg bg-success/10 border border-success/30">
                      <p className="font-medium text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department || 'No department'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab 
              tasks={tasks} 
              employees={employees}
              onRefresh={loadWorkTrackingData} 
            />
          </TabsContent>

          <TabsContent value="reports">
            <ProgressReportsTab 
              reports={reports}
              tasks={tasks}
              onRefresh={loadWorkTrackingData} 
            />
          </TabsContent>
        </Tabs>

      {/* Edit Dialog */}
      <EditMemberDialog
        member={editingMember}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onMemberUpdated={loadTeam}
      />
    </div>
  );
}

