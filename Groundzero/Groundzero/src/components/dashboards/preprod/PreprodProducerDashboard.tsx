import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, AlertTriangle, CheckCircle, FileText, Palette, Film, Video, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function PreprodProducerDashboard() {
  const navigate = useNavigate();

  const { data: scriptVersions } = useQuery({
    queryKey: ['script-lock-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('script_versions')
        .select('id, version_number')
        .order('version_number', { ascending: false })
        .limit(1);
      return data?.[0];
    }
  });

  const { data: approvalGates, isLoading } = useQuery({
    queryKey: ['approval-gates-producer'],
    queryFn: async () => {
      const { data } = await supabase
        .from('approval_gates')
        .select('id, entity_type, status, approval_type')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const stages = [
    { 
      name: 'Script', 
      icon: FileText, 
      locked: false,
      route: '/preprod/script/lock'
    },
    { 
      name: 'Concepts', 
      icon: Palette, 
      locked: false,
      route: '/preprod/concept/reviews'
    },
    { 
      name: 'Storyboards', 
      icon: Film, 
      locked: false,
      route: '/preprod/storyboard/lock'
    },
    { 
      name: 'Animatics', 
      icon: Video, 
      locked: false,
      route: '/preprod/animatic/reviews'
    },
    { 
      name: 'Technical', 
      icon: Settings, 
      locked: false,
      route: '/preprod/tech/approval'
    },
  ];

  const lockedCount = stages.filter(s => s.locked).length;
  const pendingApprovals = approvalGates?.filter(g => g.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Producer Dashboard (Pre-Production)</h1>
        <p className="text-muted-foreground">Schedule, budget & locking authority</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stages.length}</div>
            <p className="text-muted-foreground">Total Stages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{lockedCount}</div>
            <p className="text-muted-foreground">Locked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{stages.length - lockedCount}</div>
            <p className="text-muted-foreground">Pending Lock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{pendingApprovals}</div>
            <p className="text-muted-foreground">Pending Approvals</p>
          </CardContent>
        </Card>
      </div>

      {/* Pre-Prod Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Pre-Production Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <stage.icon className="h-5 w-5" />
                  <span className="font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {stage.locked ? (
                    <Badge variant="default" className="bg-green-500">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Unlock className="h-3 w-3 mr-1" />
                      Unlocked
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate(stage.route)}>
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lock Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Lock Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="default" onClick={() => navigate('/preprod/script/lock')}>
              <Lock className="h-4 w-4 mr-2" />
              Lock Script
            </Button>
            <Button variant="default" onClick={() => navigate('/producer/preprod/locks')}>
              <Lock className="h-4 w-4 mr-2" />
              Lock Pre-Production
            </Button>
            <Button variant="destructive">
              <Unlock className="h-4 w-4 mr-2" />
              Unlock (Warning)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ⚠️ Unlocking will require re-approval from Director.
          </p>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 AI Insights (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lockedCount === stages.length ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">All pre-production stages locked. Ready for production.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">{stages.length - lockedCount} stages still unlocked and require Director approval.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate('/producer/preprod/overview')}>
              Pre-Prod Overview
            </Button>
            <Button variant="outline" onClick={() => navigate('/producer/timeline')}>
              Timeline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
