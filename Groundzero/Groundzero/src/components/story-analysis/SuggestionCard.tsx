import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StorySuggestion } from '@/types/storyFrameworks';
import { 
  Lightbulb, 
  Check, 
  X, 
  Sparkles, 
  AlertCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  Wand2
} from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SuggestionCardProps {
  suggestion: StorySuggestion;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  onRequestOptions: (id: string) => void;
  onGenerateScene?: (suggestion: StorySuggestion) => void;
}

export function SuggestionCard({ 
  suggestion, 
  onAccept, 
  onIgnore, 
  onRequestOptions,
  onGenerateScene 
}: SuggestionCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getSeverityColor = () => {
    switch (suggestion.severity) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getTypeIcon = () => {
    switch (suggestion.type) {
      case 'missing_beat': return <AlertCircle className="h-4 w-4" />;
      case 'weak_beat': return <Clock className="h-4 w-4" />;
      case 'pacing': return <Lightbulb className="h-4 w-4" />;
      case 'character_arc': return <Sparkles className="h-4 w-4" />;
      case 'continuity': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (suggestion.type) {
      case 'missing_beat': return 'Missing Beat';
      case 'weak_beat': return 'Weak Beat';
      case 'pacing': return 'Pacing Issue';
      case 'character_arc': return 'Character Arc';
      case 'continuity': return 'Continuity';
    }
  };

  const canGenerateScene = suggestion.type === 'missing_beat' || suggestion.type === 'weak_beat' || suggestion.type === 'character_arc';

  if (suggestion.status !== 'pending') {
    return (
      <Card className={`border-l-4 ${suggestion.status === 'accepted' ? 'border-l-green-500 bg-green-500/5' : 'border-l-muted bg-muted/30'}`}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {suggestion.status === 'accepted' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={suggestion.status === 'accepted' ? 'text-foreground' : 'text-muted-foreground line-through'}>
                {suggestion.title}
              </span>
            </div>
            <Badge variant={suggestion.status === 'accepted' ? 'default' : 'secondary'}>
              {suggestion.status === 'accepted' ? 'Accepted' : 'Ignored'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border-l-4 ${getSeverityColor()}`}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded ${getSeverityColor()}`}>
                {getTypeIcon()}
              </div>
              <div>
                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{getTypeLabel()}</Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getSeverityColor()}`}
                  >
                    {suggestion.severity.charAt(0).toUpperCase() + suggestion.severity.slice(1)} Priority
                  </Badge>
                </div>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
            
            {suggestion.affectedScenes && suggestion.affectedScenes.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Affected Scenes:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.affectedScenes.map((scene, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">Scene {scene}</Badge>
                  ))}
                </div>
              </div>
            )}

            {suggestion.proposedOptions && suggestion.proposedOptions.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium mb-2">AI-Proposed Options:</p>
                <ul className="space-y-1">
                  {suggestion.proposedOptions.map((option, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-medium">{i + 1}.</span>
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {canGenerateScene && onGenerateScene && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => onGenerateScene(suggestion)}
                  className="gap-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Write Scene
                </Button>
              )}
              <Button 
                size="sm" 
                variant={canGenerateScene ? "outline" : "default"}
                onClick={() => onAccept(suggestion.id)}
                className="gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Mark Resolved
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onIgnore(suggestion.id)}
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" /> Ignore
              </Button>
              {!suggestion.proposedOptions?.length && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => onRequestOptions(suggestion.id)}
                  className="gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Get AI Options
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
