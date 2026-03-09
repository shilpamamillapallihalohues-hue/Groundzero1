import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Clapperboard, 
  Film, 
  Box, 
  History,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { ClientDashboard } from '@/components/client-portal/ClientDashboard';
import { SceneReviewScreen } from '@/components/client-portal/SceneReviewScreen';
import { ShotReviewScreen } from '@/components/client-portal/ShotReviewScreen';
import { AssetReviewScreen } from '@/components/client-portal/AssetReviewScreen';
import { ApprovalHistoryScreen } from '@/components/client-portal/ApprovalHistoryScreen';

export default function ClientPortal() {
  const { projectId, sceneId, assetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isLoading, signOut, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth', { state: { from: location.pathname } });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  // Set active tab based on route
  useEffect(() => {
    if (projectId && sceneId) {
      setActiveTab('shots');
    } else if (projectId && assetId) {
      setActiveTab('assets');
    } else if (projectId) {
      setActiveTab('scenes');
    } else {
      setActiveTab('dashboard');
    }
  }, [projectId, sceneId, assetId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Check if user is client role
  const isClient = profile?.role === 'client';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {projectId && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/client')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold">SceneCraft</h1>
                <p className="text-sm text-muted-foreground">Client Review Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <Button variant="outline" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {projectId ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="scenes" className="gap-2">
                <Clapperboard className="h-4 w-4" />
                Scenes
              </TabsTrigger>
              <TabsTrigger value="shots" className="gap-2">
                <Film className="h-4 w-4" />
                Shots
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <Box className="h-4 w-4" />
                Assets
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scenes">
              <SceneReviewScreen projectId={projectId} />
            </TabsContent>
            
            <TabsContent value="shots">
              <ShotReviewScreen projectId={projectId} sceneId={sceneId} />
            </TabsContent>
            
            <TabsContent value="assets">
              <AssetReviewScreen projectId={projectId} assetId={assetId} />
            </TabsContent>
            
            <TabsContent value="history">
              <ApprovalHistoryScreen projectId={projectId} />
            </TabsContent>
          </Tabs>
        ) : (
          <ClientDashboard />
        )}
      </main>
    </div>
  );
}
