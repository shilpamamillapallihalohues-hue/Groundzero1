import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StoryFramework } from '@/types/storyFrameworks';
import { BookOpen, Layers, User, Target, Check } from 'lucide-react';

interface FrameworkSelectorProps {
  selectedFramework: StoryFramework;
  onSelect: (framework: StoryFramework) => void;
  analysisResults?: Record<StoryFramework, { coverage: number; issues: number }>;
}

const FRAMEWORKS = [
  {
    id: 'save_the_cat' as StoryFramework,
    name: 'Save the Cat!',
    description: '15-Beat Beat Sheet structure',
    icon: BookOpen,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'sequence_method' as StoryFramework,
    name: 'Sequence Method',
    description: '8 Sequences with tension/resolution',
    icon: Layers,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'hero_journey' as StoryFramework,
    name: "Hero's Journey",
    description: "12-Step protagonist arc",
    icon: User,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'seven_point' as StoryFramework,
    name: 'Seven-Point Structure',
    description: 'Hook to Resolution framework',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

export function FrameworkSelector({ selectedFramework, onSelect, analysisResults }: FrameworkSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {FRAMEWORKS.map(framework => {
        const isSelected = selectedFramework === framework.id;
        const results = analysisResults?.[framework.id];
        
        return (
          <Card 
            key={framework.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              isSelected ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => onSelect(framework.id)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${framework.bgColor}`}>
                  <framework.icon className={`h-5 w-5 ${framework.color}`} />
                </div>
                {isSelected && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold mb-1">{framework.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{framework.description}</p>
              
              {results && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={results.coverage >= 80 ? 'default' : results.coverage >= 50 ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {results.coverage}% Coverage
                  </Badge>
                  {results.issues > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {results.issues} Issues
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
