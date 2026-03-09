import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Camera, 
  ChevronRight, 
  Edit, 
  Film, 
  Layers, 
  Mic, 
  Palette, 
  Plus, 
  Shirt, 
  Trash2, 
  Users, 
  Zap,
  Box,
  Lightbulb,
  Paintbrush,
  Cog,
  Sparkles
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const departmentIcons: Record<string, any> = {
  'Direction': Film,
  'Cinematography': Camera,
  'Art Department': Palette,
  'Costume': Shirt,
  'VFX': Zap,
  'Sound': Mic,
  '3D Modelling': Box,
  'Texturing': Paintbrush,
  'Lighting': Lightbulb,
  'Rigging': Cog,
  'Animation': Sparkles,
  'Compositing': Layers,
};

const departmentColors: Record<string, string> = {
  'Direction': 'from-primary to-amber-500',
  'Cinematography': 'from-info to-blue-400',
  'Art Department': 'from-success to-emerald-400',
  'Costume': 'from-pink-500 to-rose-400',
  'VFX': 'from-purple-500 to-violet-400',
  'Sound': 'from-warning to-orange-400',
  '3D Modelling': 'from-blue-500 to-cyan-400',
  'Texturing': 'from-amber-500 to-yellow-400',
  'Lighting': 'from-yellow-500 to-orange-400',
  'Rigging': 'from-slate-500 to-gray-400',
  'Animation': 'from-pink-500 to-purple-400',
  'Compositing': 'from-green-500 to-teal-400',
};

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  team_lead_id: string | null;
  parent_department_id?: string | null;
  team_lead?: { full_name: string } | null;
  member_count?: number;
  children?: Department[];
}

interface TeamLead {
  id: string;
  full_name: string;
}

export default function Departments() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdmin } = usePagePermissions();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_lead_id: '',
    parent_department_id: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDepartments();
      loadTeamLeads();
    }
  }, [isAuthenticated]);

  const loadDepartments = async () => {
    try {
      const { data: deptData, error } = await supabase
        .from('departments')
        .select(`
          id, name, description, color, team_lead_id,
          team_lead:team_lead_id (full_name)
        `)
        .order('name');

      if (error) throw error;

      // Get member counts
      const { data: members } = await supabase
        .from('profiles')
        .select('department_id');

      const memberCounts = (members || []).reduce((acc: Record<string, number>, m) => {
        if (m.department_id) {
          acc[m.department_id] = (acc[m.department_id] || 0) + 1;
        }
        return acc;
      }, {});

      const deptsWithCounts = (deptData || []).map(d => ({
        ...d,
        member_count: memberCounts[d.id] || 0,
      }));

      setDepartments(deptsWithCounts);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamLeads = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['hod', 'department_head', 'producer', 'director', 'production_manager'])
      .order('full_name');
    setTeamLeads(data || []);
  };

  const openCreateDialog = () => {
    setFormData({ name: '', description: '', team_lead_id: '', parent_department_id: '' });
    setEditingDept(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setFormData({
      name: dept.name,
      description: dept.description || '',
      team_lead_id: dept.team_lead_id || '',
      parent_department_id: dept.parent_department_id || '',
    });
    setEditingDept(dept);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            team_lead_id: formData.team_lead_id || null,
          })
          .eq('id', editingDept.id);
        if (error) throw error;
        toast.success('Department updated');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            team_lead_id: formData.team_lead_id || null,
          });
        if (error) throw error;
        toast.success('Department created');
      }
      setIsDialogOpen(false);
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Failed to save department');
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Delete "${dept.name}"? This cannot be undone.`)) return;
    
    try {
      const { error } = await supabase.from('departments').delete().eq('id', dept.id);
      if (error) throw error;
      toast.success('Department deleted');
      loadDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  // VFX Sub-departments for the flowchart
  const vfxDept = departments.find(d => d.name === 'VFX');
  const vfxSubDepartments = [
    '3D Modelling', 'Texturing', 'Rigging', 'Animation', 'Lighting', 'Compositing'
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground mt-1">
              Manage production departments and sub-departments
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gold" onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
                  <DialogDescription>
                    {editingDept ? 'Update department details' : 'Add a new production department'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Department Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., 3D Modelling"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Team Lead</Label>
                    <Select 
                      value={formData.team_lead_id || "none"} 
                      onValueChange={(v) => setFormData(p => ({ ...p, team_lead_id: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teamLeads.map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>{lead.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave}>{editingDept ? 'Update' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* VFX Sub-department Flow */}
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              VFX Pipeline Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
              {vfxSubDepartments.map((name, idx) => {
                const Icon = departmentIcons[name] || Layers;
                const exists = departments.some(d => d.name === name);
                return (
                  <div key={name} className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border",
                      exists 
                        ? "bg-purple-500/10 border-purple-500/30" 
                        : "bg-muted border-dashed border-muted-foreground/30"
                    )}>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{name}</span>
                      {!exists && isAdmin && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setFormData({ name, description: `VFX ${name} department`, team_lead_id: '', parent_department_id: '' });
                            setEditingDept(null);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {idx < vfxSubDepartments.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Assets flow automatically through these departments based on routing configuration.
            </p>
          </CardContent>
        </Card>

        {/* Department Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading departments...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => {
              const Icon = departmentIcons[dept.name] || Building2;
              const color = departmentColors[dept.name] || 'from-primary to-amber-500';
              
              return (
                <div 
                  key={dept.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-xl animate-slide-up"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                    color
                  )} style={{ opacity: 0.05 }} />

                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(dept)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(dept)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className={cn(
                    "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4",
                    color
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{dept.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Lead: {dept.team_lead?.full_name || 'Unassigned'}
                      </p>
                    </div>
                    <Badge variant="info">Active</Badge>
                  </div>

                  {dept.description && (
                    <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{dept.member_count || 0} team members</span>
                  </div>
                </div>
              );
            })}

            {departments.length === 0 && (
              <div className="col-span-full text-center py-12 border border-dashed rounded-xl">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No departments yet</h3>
                <p className="text-muted-foreground mb-4">Create your first department to get started</p>
                {isAdmin && (
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
