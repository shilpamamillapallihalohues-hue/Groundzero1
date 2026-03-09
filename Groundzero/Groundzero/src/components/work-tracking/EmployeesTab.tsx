import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, User, Mail, Phone, Building, Briefcase, Download } from 'lucide-react';
import { WorkEmployee } from '@/pages/WorkTracking';
import { format } from 'date-fns';
import { exportToExcel, employeeExportColumns } from '@/lib/excelExport';

interface EmployeesTabProps {
  employees: WorkEmployee[];
  onRefresh: () => void;
}

export function EmployeesTab({ employees, onRefresh }: EmployeesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<WorkEmployee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
    });
    setEditingEmployee(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (employee: WorkEmployee) => {
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || '',
      designation: employee.designation || '',
    });
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('work_employees')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            department: formData.department.trim() || null,
            designation: formData.designation.trim() || null,
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;
        toast.success('Employee updated successfully');
      } else {
        const { error } = await supabase
          .from('work_employees')
          .insert({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            department: formData.department.trim() || null,
            designation: formData.designation.trim() || null,
          });

        if (error) throw error;
        toast.success('Employee created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (employee: WorkEmployee) => {
    if (!confirm(`Are you sure you want to delete ${employee.name}? This will also delete all their tasks and progress reports.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('work_employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;
      toast.success('Employee deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const toggleActive = async (employee: WorkEmployee) => {
    try {
      const { error } = await supabase
        .from('work_employees')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);

      if (error) throw error;
      toast.success(employee.is_active ? 'Employee deactivated' : 'Employee activated');
      onRefresh();
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const handleExportEmployees = () => {
    exportToExcel(employees, employeeExportColumns, `employees_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Employees exported successfully');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Employees</CardTitle>
          <CardDescription>Manage employees for daily work tracking</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportEmployees} disabled={employees.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Enter employee details'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Employee name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g., Developer"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingEmployee ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No employees yet</h3>
            <p className="text-muted-foreground mb-4">Add your first employee to start tracking work</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(employee => (
              <div 
                key={employee.id} 
                className={`p-4 rounded-lg border ${employee.is_active ? 'bg-card' : 'bg-muted/50 opacity-75'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{employee.name}</p>
                      {employee.designation && (
                        <p className="text-sm text-muted-foreground">{employee.designation}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                    {employee.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm mb-4">
                  {employee.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="w-3 h-3" />
                      <span>{employee.department}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(employee)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(employee)}>
                    {employee.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(employee)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}