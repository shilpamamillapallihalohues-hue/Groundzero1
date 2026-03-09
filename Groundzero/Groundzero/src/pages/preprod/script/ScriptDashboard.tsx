import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Brain, Clapperboard, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScriptDashboard() {
  const navigate = useNavigate();

  const scriptStats = {
    totalVersions: 3,
    currentStatus: 'draft' as 'draft' | 'review' | 'locked',
    scenesExtracted: 24,
    charactersFound: 12,
    propsIdentified: 45,
    locationsFound: 8,
  };

  const workflowSteps = [
    { 
      title: 'Upload Script', 
      description: 'Upload PDF/DOC script file',
      icon: Upload, 
      href: '/preprod/script/versions',
      status: 'completed' as const,
    },
    { 
      title: 'AI Breakdown', 
      description: 'AI extracts scenes, characters, props',
      icon: Brain, 
      href: '/preprod/script/ai-breakdown',
      status: 'in_progress' as const,
    },
    { 
      title: 'Scene Editor', 
      description: 'Edit and refine scene details',
      icon: Clapperboard, 
      href: '/preprod/script/scenes',
      status: 'pending' as const,
    },
    { 
      title: 'Script Lock', 
      description: 'Producer locks script for production',
      icon: Lock, 
      href: '/preprod/script/lock',
      status: 'pending' as const,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Script Department</h1>
            <p className="text-muted-foreground mt-1">
              Convert raw script into locked scene structure
            </p>
          </div>
          <Badge variant={scriptStats.currentStatus === 'locked' ? 'default' : 'secondary'}>
            {scriptStats.currentStatus === 'locked' ? 'Locked' : 'In Progress'}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Script Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scriptStats.totalVersions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scenes Extracted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scriptStats.scenesExtracted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Characters Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scriptStats.charactersFound}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Props Identified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scriptStats.propsIdentified}</div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Script Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {workflowSteps.map((step, index) => (
                <Card 
                  key={step.title}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    step.status === 'completed' ? 'border-green-500 bg-green-500/5' :
                    step.status === 'in_progress' ? 'border-amber-500 bg-amber-500/5' : ''
                  }`}
                  onClick={() => navigate(step.href)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        step.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        step.status === 'in_progress' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-muted-foreground">Step {index + 1}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    <Button variant="ghost" size="sm" className="mt-3 w-full">
                      Open <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
