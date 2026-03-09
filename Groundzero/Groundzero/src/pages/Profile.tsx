import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User,
  Mail,
  Building2,
  Shield,
  Bell,
  Key,
  Save,
  Camera
} from 'lucide-react';
import { ROLE_LABELS } from '@/types/roles';

const Profile = () => {
  const { user, profile } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { role: productionRole, capabilities, sidebarSections } = useProductionRole();
  const [isEditing, setIsEditing] = useState(false);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and settings</p>
        </div>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    <Shield className="w-3 h-3 mr-1" />
                    {ROLE_LABELS[productionRole] || productionRole}
                  </Badge>
                  {isAdmin && (
                    <Badge variant="destructive">
                      Administrator
                    </Badge>
                  )}
                  {profile?.department_id && (
                    <Badge variant="secondary">
                      <Building2 className="w-3 h-3 mr-1" />
                      {profile.department_id}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input 
                  value={displayName} 
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  value={user?.email || ''} 
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input 
                  value={profile?.department_id || 'Not assigned'} 
                  disabled
                  className="mt-1"
                />
              </div>
              {isEditing && (
                <Button className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
              <CardDescription>Your access level and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Current Role</Label>
                <p className="text-lg font-medium mt-1">{ROLE_LABELS[productionRole] || productionRole}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Capabilities</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capabilities.canApprove ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">Can Approve</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capabilities.canAssign ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">Can Assign</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capabilities.canUpload ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">Can Upload</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capabilities.canViewBudget ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">View Budget</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capabilities.canOverride ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">Can Override</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capabilities.canManageTeam ? 'bg-green-500' : 'bg-muted'}`} />
                    <span className="text-sm">Manage Team</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Access Level</Label>
                <Badge variant="outline" className="mt-2 capitalize">
                  {capabilities.accessLevel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Manage notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Notification settings will be available in a future update.
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Password and authentication</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
