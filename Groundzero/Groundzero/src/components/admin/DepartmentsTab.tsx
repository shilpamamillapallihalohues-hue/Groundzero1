import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Crown, ChevronDown, ChevronRight, FileText, Palette, Film, Settings, Clapperboard, Scissors } from 'lucide-react';

// Production phases with their departments
const PRODUCTION_PHASES = [
  {
    id: 'pre_production',
    name: 'Pre-Production',
    icon: FileText,
    color: '#3b82f6',
    defaultDepartments: [
      { name: 'Script', description: 'Script writing and editing' },
      { name: 'Concept Arts', description: 'Concept art and visual development' },
      { name: 'Storyboard', description: 'Storyboard creation' },
      { name: 'Edit Lineup', description: 'Shot sequencing and edit decisions' },
      { name: 'Animatic/Previz', description: 'Timing and camera previsualization' },
      { name: 'Technical Planning', description: 'Pipeline and technical specs' },
    ]
  },
  {
    id: 'production',
    name: 'Production',
    icon: Clapperboard,
    color: '#10b981',
    defaultDepartments: [
      { name: 'Layout', description: 'Scene layout and camera placement' },
      { name: 'Modeling', description: '3D modeling of assets' },
      { name: 'Texturing', description: 'Texturing and materials' },
      { name: 'Rigging', description: 'Character and prop rigging' },
      { name: 'Animation', description: 'Character and object animation' },
      { name: 'Lighting', description: 'Scene lighting' },
      { name: 'FX/Simulation', description: 'Visual effects and simulations' },
      { name: 'Rendering', description: 'Final rendering' },
    ]
  },
  {
    id: 'post_production',
    name: 'Post-Production',
    icon: Scissors,
    color: '#8b5cf6',
    defaultDepartments: [
      { name: 'Compositing', description: 'Final compositing and integration' },
      { name: 'Color Grading', description: 'Color correction and grading' },
      { name: 'Editing', description: 'Final cut editing' },
      { name: 'Sound Design', description: 'Audio and sound effects' },
      { name: 'VFX Finishing', description: 'Final VFX polish' },
      { name: 'Delivery', description: 'Final output and delivery' },
    ]
  }
];

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  team_lead_id: string | null;
  phase: string | null;
  created_at: string;
  updated_at?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department_id: string | null;
}

export function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['pre_production', 'production', 'post_production']);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [teamLeadId, setTeamLeadId] = useState<string>('');
  const [phase, setPhase] = useState<string>('production');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, profileRes] = await Promise.all([
        supabase.from('departments').select('id, name, description, color, team_lead_id, phase, created_at, updated_at').order('name'),
        supabase.from('profiles').select('id, full_name, email, role, department_id').order('full_name')
      ]);

      if (deptRes.error) throw deptRes.error;
      if (profileRes.error) throw profileRes.error;

      // Cast and ensure phase defaults to 'production' if null
      const depts = (deptRes.data || []).map(d => ({
        ...d,
        phase: d.phase || 'production'
      })) as Department[];

      setDepartments(depts);
      setProfiles(profileRes.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#6366f1');
    setTeamLeadId('');
    setPhase('production');
    setEditingDept(null);
  };

  const openCreate = (defaultPhase?: string) => {
    resetForm();
    if (defaultPhase) setPhase(defaultPhase);
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setColor(dept.color);
    setTeamLeadId(dept.team_lead_id || '');
    setPhase(dept.phase || 'production');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Department name is required');
      return;
    }

    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        team_lead_id: teamLeadId || null,
        phase
      };

      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update(data)
          .eq('id', editingDept.id);
        if (error) throw error;
        toast.success('Department updated');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert(data);
        if (error) throw error;
        toast.success('Department created');
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving department:', error);
      toast.error(error.message || 'Failed to save department');
    }
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm('Delete this department? Team members will be unassigned.')) return;

    try {
      // Unassign team members first
      await supabase
        .from('profiles')
        .update({ department_id: null })
        .eq('department_id', deptId);

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deptId);
      if (error) throw error;
      toast.success('Department deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

  const getTeamLead = (teamLeadId: string | null) => {
    if (!teamLeadId) return null;
    return profiles.find(p => p.id === teamLeadId);
  };

  const getDepartmentMembers = (deptId: string) => {
    return profiles.filter(p => p.department_id === deptId);
  };

  const getDepartmentsByPhase = (phaseId: string) => {
    return departments.filter(d => d.phase === phaseId);
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(p => p !== phaseId)
        : [...prev, phaseId]
    );
  };

  const colorOptions = [
    { value: '#6366f1', label: 'Indigo' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#06b6d4', label: 'Cyan' },
  ];

  const initializeDefaultDepartments = async (phaseId: string) => {
    const phaseConfig = PRODUCTION_PHASES.find(p => p.id === phaseId);
    if (!phaseConfig) return;

    const existingNames = departments.filter(d => d.phase === phaseId).map(d => d.name.toLowerCase());
    const toCreate = phaseConfig.defaultDepartments.filter(
      d => !existingNames.includes(d.name.toLowerCase())
    );

    if (toCreate.length === 0) {
      toast.info('All default departments already exist');
      return;
    }

    try {
      const { error } = await supabase.from('departments').insert(
        toCreate.map(d => ({
          name: d.name,
          description: d.description,
          color: phaseConfig.color,
          phase: phaseId
        }))
      );

      if (error) throw error;
      toast.success(`Created ${toCreate.length} default departments`);
      loadData();
    } catch (error) {
      console.error('Error creating default departments:', error);
      toast.error('Failed to create default departments');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading departments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Department Hierarchy</CardTitle>
            <CardDescription>Organize departments by production phase</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openCreate()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Production Phase</Label>
                  <Select value={phase} onValueChange={setPhase}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_PHASES.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Animation, Lighting"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department Lead (HOD)</Label>
                  <Select value={teamLeadId || "none"} onValueChange={(val) => setTeamLeadId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {profiles.filter(p => ['hod', 'department_head', 'director', 'producer'].includes(p.role)).map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} ({p.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>{editingDept ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {PRODUCTION_PHASES.map(phaseConfig => {
          const phaseDepts = getDepartmentsByPhase(phaseConfig.id);
          const isExpanded = expandedPhases.includes(phaseConfig.id);
          const PhaseIcon = phaseConfig.icon;

          return (
            <Collapsible key={phaseConfig.id} open={isExpanded} onOpenChange={() => togglePhase(phaseConfig.id)}>
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    style={{ borderLeft: `4px solid ${phaseConfig.color}` }}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      <PhaseIcon className="w-5 h-5" style={{ color: phaseConfig.color }} />
                      <span className="font-semibold text-lg">{phaseConfig.name}</span>
                      <Badge variant="outline">{phaseDepts.length} departments</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); initializeDefaultDepartments(phaseConfig.id); }}
                      >
                        Initialize Defaults
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openCreate(phaseConfig.id); }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0">
                    {phaseDepts.length === 0 ? (
                      <div className="text-center py-8 border border-dashed rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">No departments in this phase</p>
                        <Button variant="link" size="sm" onClick={() => initializeDefaultDepartments(phaseConfig.id)}>
                          Create default departments
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {phaseDepts.map(dept => {
                          const teamLead = getTeamLead(dept.team_lead_id);
                          const members = getDepartmentMembers(dept.id);
                          
                          return (
                            <div 
                              key={dept.id} 
                              className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded" 
                                    style={{ backgroundColor: dept.color }} 
                                  />
                                  <h3 className="font-medium text-foreground">{dept.name}</h3>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dept)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(dept.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              {dept.description && (
                                <p className="text-xs text-muted-foreground mb-2">{dept.description}</p>
                              )}
                              {teamLead ? (
                                <div className="flex items-center gap-2 p-2 rounded bg-accent/50 mb-2">
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs font-medium">{teamLead.full_name}</span>
                                  <Badge variant="outline" className="text-[10px] ml-auto">Lead</Badge>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic mb-2">No lead assigned</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span>{members.length} members</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
