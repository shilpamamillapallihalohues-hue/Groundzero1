import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Layers, 
  User, 
  Target, 
  Settings,
  Info,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FrameworkConfig {
  id: string;
  enabled: boolean;
  priority: number;
}

export default function StoryFrameworks() {
  const [configs, setConfigs] = useState<FrameworkConfig[]>([
    { id: 'save_the_cat', enabled: true, priority: 1 },
    { id: 'sequence_method', enabled: true, priority: 2 },
    { id: 'hero_journey', enabled: true, priority: 3 },
    { id: 'seven_point', enabled: false, priority: 4 },
  ]);

  const frameworks = [
    {
      id: 'save_the_cat',
      name: 'Save the Cat!',
      author: 'Blake Snyder',
      description: 'A 15-beat story structure that breaks down the ideal Hollywood screenplay into precise page counts and emotional beats.',
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      beats: 15,
      details: [
        'Opening Image → Final Image contrast',
        'Catalyst at page 12',
        'Fun & Games section (promise of premise)',
        'Midpoint false victory/defeat',
        'All Is Lost + Dark Night of Soul'
      ],
      bestFor: 'Commercial films, mainstream storytelling'
    },
    {
      id: 'sequence_method',
      name: 'Sequence Method',
      author: 'Frank Daniel',
      description: 'Divides the screenplay into 8 sequences of approximately 12-15 pages each, focusing on escalating tension and mini-resolutions.',
      icon: Layers,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      beats: 8,
      details: [
        'Each sequence has its own tension arc',
        'Mini-climax at end of each sequence',
        'Clear cause-and-effect between sequences',
        'Focus on escalation and payoff'
      ],
      bestFor: 'Complex narratives, ensemble pieces'
    },
    {
      id: 'hero_journey',
      name: "Hero's Journey",
      author: 'Joseph Campbell / Chris Vogler',
      description: 'The classic 12-step mythic structure tracing a hero from the ordinary world through transformation and return.',
      icon: User,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      beats: 12,
      details: [
        'Call to Adventure + Refusal',
        'Meeting the Mentor',
        'Crossing the Threshold',
        'The Ordeal (death & rebirth)',
        'Return with the Elixir'
      ],
      bestFor: 'Adventure, fantasy, character-driven stories'
    },
    {
      id: 'seven_point',
      name: 'Seven-Point Structure',
      author: 'Dan Wells',
      description: 'A streamlined structure focusing on seven key turning points from Hook to Resolution.',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      beats: 7,
      details: [
        'Hook (opposite of resolution)',
        'Plot Point 1 (inciting incident)',
        'Pinch Points (pressure moments)',
        'Midpoint (reaction to action shift)',
        'Resolution (climax)'
      ],
      bestFor: 'Thrillers, mysteries, tightly-plotted stories'
    }
  ];

  const toggleFramework = (id: string) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
    toast.success(`Framework ${configs.find(c => c.id === id)?.enabled ? 'disabled' : 'enabled'}`);
  };

  const getConfig = (id: string) => configs.find(c => c.id === id);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Story Frameworks</h1>
            <p className="text-muted-foreground mt-1">
              Configure which narrative frameworks to use for AI analysis
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Advanced Settings
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Frameworks Guide Analysis, Not Your Writing</p>
                <p className="text-sm text-muted-foreground">
                  These frameworks help identify structural patterns and potential gaps. 
                  They are tools for insight, not constraints on creativity. 
                  All suggestions are optional and can be ignored.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Framework Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {frameworks.map(framework => {
            const config = getConfig(framework.id);
            return (
              <Card key={framework.id} className={!config?.enabled ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${framework.bgColor}`}>
                        <framework.icon className={`h-6 w-6 ${framework.color}`} />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {framework.name}
                          <Badge variant="outline" className="text-xs">
                            {framework.beats} Beats
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          by {framework.author}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${framework.id}`} className="text-sm">
                        {config?.enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                      <Switch 
                        id={`toggle-${framework.id}`}
                        checked={config?.enabled}
                        onCheckedChange={() => toggleFramework(framework.id)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {framework.description}
                  </p>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Key Beats:</p>
                    <ul className="space-y-1">
                      {framework.details.map((detail, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className={`${framework.color} mt-1`}>•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="secondary" className="text-xs">
                      Best for: {framework.bestFor}
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-1">
                      Learn More <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Active Frameworks Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Active Analysis Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {configs.filter(c => c.enabled).map(config => {
                const framework = frameworks.find(f => f.id === config.id);
                if (!framework) return null;
                return (
                  <Badge key={config.id} variant="default" className="gap-2">
                    <framework.icon className="h-3 w-3" />
                    {framework.name}
                  </Badge>
                );
              })}
              {configs.filter(c => c.enabled).length === 0 && (
                <p className="text-muted-foreground text-sm">No frameworks enabled. Enable at least one for analysis.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
