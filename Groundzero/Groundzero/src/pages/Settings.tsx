import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Box, Key, Palette, Shield, User, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, profile } = useAuth();
  const [model3DProvider, setModel3DProvider] = useState<'meshy' | 'tripo' | 'scenecraft'>('meshy');
  const [isUpdating3DProvider, setIsUpdating3DProvider] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Load 3D provider setting from localStorage (could be moved to DB later)
  useEffect(() => {
    const savedProvider = localStorage.getItem('preferred_3d_provider');
    if (savedProvider && ['meshy', 'tripo', 'scenecraft'].includes(savedProvider)) {
      setModel3DProvider(savedProvider as 'meshy' | 'tripo' | 'scenecraft');
    }
  }, []);

  const handle3DProviderChange = async (value: string) => {
    setIsUpdating3DProvider(true);
    try {
      const provider = value as 'meshy' | 'tripo' | 'scenecraft';
      localStorage.setItem('preferred_3d_provider', provider);
      setModel3DProvider(provider);
      toast.success(`3D model generation provider set to ${provider === 'scenecraft' ? 'Scenecraft AI' : provider === 'meshy' ? 'Meshy AI' : 'Tripo AI'}`);
    } catch (error) {
      toast.error('Failed to update provider setting');
    } finally {
      setIsUpdating3DProvider(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and application preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-secondary/50 p-1">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Zap className="w-4 h-4" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="3d-models" className="gap-2">
              <Box className="w-4 h-4" />
              3D Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={profile?.full_name || ''} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={profile?.email || ''} disabled className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" defaultValue={profile?.role?.replace('_', ' ') || ''} disabled className="bg-secondary/50 capitalize" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="gold">Save Changes</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Task Assignments</p>
                    <p className="text-sm text-muted-foreground">Get notified when you're assigned a new task</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Asset Approvals</p>
                    <p className="text-sm text-muted-foreground">Get notified when an asset needs your approval</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">AI Generations Complete</p>
                    <p className="text-sm text-muted-foreground">Get notified when AI-generated content is ready</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-6">
              <h3 className="text-lg font-semibold text-foreground">AI Generation Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-generate Storyboards</p>
                    <p className="text-sm text-muted-foreground">Automatically generate storyboards for new scenes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-breakdown Scripts</p>
                    <p className="text-sm text-muted-foreground">Automatically analyze uploaded scripts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Smart Task Assignment</p>
                    <p className="text-sm text-muted-foreground">Let AI suggest optimal task assignments</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="3d-models" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  3D Model Generation Provider
                </CardTitle>
                <CardDescription>
                  Choose which AI provider to use for image-to-3D model generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup 
                  value={model3DProvider} 
                  onValueChange={handle3DProviderChange}
                  disabled={isUpdating3DProvider}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
                    <RadioGroupItem value="meshy" id="meshy" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="meshy" className="text-base font-medium cursor-pointer">Meshy AI</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        High-quality 3D models with configurable topology (quad/tri), target polycount, and PBR textures
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">External API Key Required</span>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Best Quality</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
                    <RadioGroupItem value="tripo" id="tripo" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="tripo" className="text-base font-medium cursor-pointer">Tripo AI</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fast image-to-3D generation with good texture quality and animation-ready topology
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">External API Key Required</span>
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Fast Generation</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-secondary/30 transition-colors">
                    <RadioGroupItem value="scenecraft" id="scenecraft" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="scenecraft" className="text-base font-medium cursor-pointer">Scenecraft AI</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Integrated AI provider with no additional API key required. Uses built-in credits.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">No API Key Needed</span>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Integrated Billing</span>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> For Meshy AI and Tripo AI, you'll need to configure API keys in the 
                    <Button variant="link" className="p-0 h-auto mx-1" onClick={() => navigate('/external-tools')}>
                      External Tools
                    </Button>
                    settings page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
