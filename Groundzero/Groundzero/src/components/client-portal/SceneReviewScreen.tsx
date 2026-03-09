import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useClientReview } from '@/hooks/useClientReview';
import { 
  Clapperboard, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SceneReviewScreenProps {
  projectId: string;
}

export function SceneReviewScreen({ projectId }: SceneReviewScreenProps) {
  const navigate = useNavigate();
  const { scenes, shots, approvals, isLoading } = useClientReview(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate scene stats
  const sceneStats = scenes?.map(scene => {
    const sceneShots = shots?.filter(s => s.scene_id === scene.id) || [];
    const sceneApprovals = approvals?.filter(a => a.scene_id === scene.id) || [];
    const approvedShots = sceneShots.filter(shot => 
      sceneApprovals.some(a => a.shot_id === shot.id && a.decision === 'approved')
    );
    
    return {
      ...scene,
      totalShots: sceneShots.length,
      approvedShots: approvedShots.length,
      pendingShots: sceneShots.length - approvedShots.length,
      progress: sceneShots.length > 0 
        ? Math.round((approvedShots.length / sceneShots.length) * 100)
        : 0,
      thumbnails: sceneShots.slice(0, 4).map(s => s.image_url),
    };
  }) || [];

  const getStatusBadge = (progress: number) => {
    if (progress === 100) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
      </Badge>;
    }
    if (progress > 0) {
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200">
        <Clock className="h-3 w-3 mr-1" /> In Review
      </Badge>;
    }
    return <Badge variant="outline">
      <AlertCircle className="h-3 w-3 mr-1" /> Pending
    </Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scene Review</h2>
          <p className="text-muted-foreground">
            {scenes?.length || 0} scenes · {shots?.length || 0} total shots
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sceneStats.map((scene) => (
          <Card 
            key={scene.id} 
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/client/project/${projectId}/scene/${scene.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clapperboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Scene {scene.scene_number}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate max-w-40">
                      {scene.slugline}
                    </p>
                  </div>
                </div>
                {getStatusBadge(scene.progress)}
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Shot Thumbnails Grid */}
              <div className="grid grid-cols-4 gap-1 mb-4">
                {scene.thumbnails.map((thumb, idx) => (
                  <div 
                    key={idx} 
                    className="aspect-video bg-muted rounded overflow-hidden"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Clapperboard className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 4 - scene.thumbnails.length) }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-video bg-muted rounded" />
                ))}
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {scene.approvedShots}/{scene.totalShots} shots approved
                  </span>
                  <span className="font-medium">{scene.progress}%</span>
                </div>
                <Progress value={scene.progress} className="h-2" />
              </div>

              {/* Action */}
              <Button 
                variant="ghost" 
                className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              >
                Review Shots
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {sceneStats.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scenes available for review yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
