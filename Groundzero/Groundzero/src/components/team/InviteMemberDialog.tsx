import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Eye, EyeOff, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ProductionPhase,
  PRE_PRODUCTION_ROLES,
  PRODUCTION_ROLES,
  POST_PRODUCTION_ROLES,
  MANAGEMENT_ROLES,
  getDashboardForRole,
} from '@/types/preprodRoles';

interface InviteMemberDialogProps {
  onMemberAdded: () => void;
  children: React.ReactNode;
}

const PRODUCTION_PHASES = [
  { value: 'management', label: 'Management / Administration' },
  { value: 'pre_production', label: 'Pre-Production' },
  { value: 'production', label: 'Production' },
  { value: 'post_production', label: 'Post-Production' },
];

interface Department {
  id: string;
  name: string;
  phase: string | null;
}

export function InviteMemberDialog({ onMemberAdded, children }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phase: '' as ProductionPhase | '',
    role: '',
    departmentId: '',
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, phase')
      .order('name');
    
    if (!error && data) {
      const depts = data.map(d => ({
        id: d.id,
        name: d.name,
        phase: d.phase || 'production'
      }));
      setDepartments(depts);
    }
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
    if (!formData.role) return null;
    return getDashboardForRole(formData.role);
  }, [formData.role]);

  const filteredDepartments = formData.phase 
    ? departments.filter(d => {
        if (formData.phase === 'management') return true;
        return d.phase === formData.phase;
      })
    : departments;

  const handlePhaseChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      phase: value as ProductionPhase, 
      role: '', 
      departmentId: '' 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.phase || !formData.role) {
      toast.error('Please select a phase and role');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const { data: existingMember } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        toast.error('A team member with this email already exists');
        setLoading(false);
        return;
      }

      // Get the dashboard role for routing
      const dashboardRole = getDashboardForRole(formData.role);

      // Create pending invitation
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          full_name: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          role: dashboardRole as any, // Store dashboard role for routing
          status: 'pending',
        });

      if (inviteError) throw inviteError;

      // Create auth user via edge function
      const { data, error } = await supabase.functions.invoke('create-team-user', {
        body: {
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          fullName: formData.fullName.trim(),
          role: dashboardRole, // Dashboard role for routing
          specificRole: formData.role, // Specific job role
          phase: formData.phase,
          departmentId: formData.departmentId || null,
        },
      });

      if (error) {
        await supabase
          .from('team_invitations')
          .delete()
          .eq('email', formData.email.toLowerCase().trim())
          .eq('status', 'pending');
        throw error;
      }

      if (data?.error) {
        await supabase
          .from('team_invitations')
          .delete()
          .eq('email', formData.email.toLowerCase().trim())
          .eq('status', 'pending');
        throw new Error(data.error);
      }

      // Mark invitation as accepted
      await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('email', formData.email.toLowerCase().trim());

      toast.success(`${formData.fullName} has been added to the team`);
      setFormData({ fullName: '', email: '', password: '', phase: '', role: '', departmentId: '' });
      setOpen(false);
      onMemberAdded();
    } catch (error: any) {
      console.error('Error creating member:', error);
      toast.error(error.message || 'Failed to create team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Create Team Member
          </DialogTitle>
          <DialogDescription>
            Add a new member to your production team with role-specific access
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min 6 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-secondary/50 pr-10"
                  minLength={6}
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

            <div className="space-y-2">
              <Label htmlFor="phase">Production Phase *</Label>
              <Select
                value={formData.phase}
                onValueChange={handlePhaseChange}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select production phase" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_PHASES.map((phase) => (
                    <SelectItem key={phase.value} value={phase.value}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the phase to see department-specific roles
              </p>
            </div>

            {formData.phase && (
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[300px]">
                      {Object.entries(phaseRoles).map(([deptKey, dept]) => (
                        <SelectGroup key={deptKey}>
                          <SelectLabel className="text-primary font-semibold py-2">
                            {dept.label}
                          </SelectLabel>
                          {dept.roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
                {dashboardType && (
                  <p className="text-xs text-muted-foreground">
                    Dashboard: <span className="text-primary capitalize">{dashboardType.replace('_', ' ')}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value === 'none' ? '' : value }))}
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
              <p className="text-xs text-muted-foreground">
                Assign to a specific department for filtered views
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" disabled={loading}>
                {loading ? 'Creating...' : 'Create Member'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
