import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientReview } from '@/hooks/useClientReview';
import { useAuth } from '@/hooks/useAuth';
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ShotReviewScreenProps {
  projectId: string;
  sceneId?: string;
}

export function ShotReviewScreen({ projectId, sceneId }: ShotReviewScreenProps) {
  const { profile } = useAuth();
  const { shots, comments, versions, addComment, submitApproval, isSubmitting, isLoading } = useClientReview(projectId);
  
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState<string>('latest');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [newComment, setNewComment] = useState('');

  const filteredShots = sceneId 
    ? shots?.filter(s => s.scene_id === sceneId) 
    : shots;
  
  const currentShot = filteredShots?.[selectedShotIndex];
  const shotVersions = versions?.filter(v => v.asset_id === currentShot?.id) || [];
  const shotComments = comments?.filter(c => c.shot_id === currentShot?.id) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !currentShot || !profile) return;
    
    addComment({
      review_session_id: crypto.randomUUID(), // Would use actual session
      project_id: projectId,
      scene_id: sceneId || null,
      shot_id: currentShot.id,
      asset_id: null,
      version_id: selectedVersion !== 'latest' ? selectedVersion : null,
      client_id: profile.id,
      comment_text: newComment,
      timestamp_marker: currentTime,
      frame_number: null,
      annotation_data: null,
      status: 'pending',
    });
    
    setNewComment('');
    toast.success('Comment added');
  };

  const handleApproval = (decision: 'approved' | 'changes_required' | 'rejected') => {
    if (!currentShot || !profile) return;
    
    submitApproval({
      project_id: projectId,
      scene_id: sceneId || null,
      shot_id: currentShot.id,
      asset_id: null,
      version_id: selectedVersion !== 'latest' ? selectedVersion : null,
      client_id: profile.id,
      decision,
      notes: newComment || null,
    });
    
    toast.success(`Shot ${decision === 'approved' ? 'approved' : 'sent for revision'}`);
  };

  const navigateShot = (direction: 'prev' | 'next') => {
    if (!filteredShots) return;
    
    if (direction === 'prev' && selectedShotIndex > 0) {
      setSelectedShotIndex(selectedShotIndex - 1);
    } else if (direction === 'next' && selectedShotIndex < filteredShots.length - 1) {
      setSelectedShotIndex(selectedShotIndex + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Player */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigateShot('prev')}
                  disabled={selectedShotIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>
                    Shot {currentShot?.shot_number || '-'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedShotIndex + 1} of {filteredShots?.length || 0}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigateShot('next')}
                  disabled={selectedShotIndex === (filteredShots?.length || 1) - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest Version</SelectItem>
                  {shotVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Video/Image Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              {currentShot?.image_url ? (
                <img 
                  src={currentShot.image_url} 
                  alt={`Shot ${currentShot.shot_number}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  No preview available
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="space-y-2">
              <Slider 
                value={[currentTime]} 
                max={100} 
                step={1}
                onValueChange={(v) => setCurrentTime(v[0])}
                className="w-full"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentTime(0)}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCurrentTime(100)}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
                
                <span className="text-sm text-muted-foreground">
                  Frame {Math.floor(currentTime * 2.4)} / 240
                </span>
              </div>
            </div>

            {/* Shot Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Shot Description</h4>
              <p className="text-sm text-muted-foreground">
                {currentShot?.action || 'No description provided'}
              </p>
              {currentShot?.camera_angle && (
                <Badge variant="outline" className="mt-2">
                  {currentShot.camera_angle}
                </Badge>
              )}
            </div>

            {/* Approval Buttons */}
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleApproval('approved')}
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50"
                onClick={() => handleApproval('changes_required')}
                disabled={isSubmitting}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
              <Button 
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => handleApproval('rejected')}
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comments Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea 
                placeholder="Add a comment at current frame..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button 
                className="w-full" 
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Add Comment
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {shotComments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="p-3 bg-muted rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {(comment as any).profiles?.full_name || 'Client'}
                    </span>
                    <div className="flex items-center gap-2">
                      {comment.timestamp_marker !== null && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {Math.floor(comment.timestamp_marker * 2.4)}f
                        </Badge>
                      )}
                      <Badge 
                        variant={
                          comment.status === 'resolved' ? 'default' :
                          comment.status === 'acknowledged' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {comment.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {comment.comment_text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              ))}
              
              {shotComments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No comments yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
