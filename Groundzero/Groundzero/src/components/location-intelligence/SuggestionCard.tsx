import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationSuggestion } from "@/types/locationIntelligence";
import { LocationCard } from "./LocationCard";
import { 
  MapPin, Star, AlertTriangle, Lightbulb, Wrench, 
  ThumbsUp, ThumbsDown, Check, ChevronDown, ChevronUp,
  Camera, Volume2, Video, Maximize
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SuggestionCardProps {
  suggestion: LocationSuggestion;
  rank: number;
  onShortlist?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function SuggestionCard({ 
  suggestion, 
  rank, 
  onShortlist, 
  onApprove, 
  onReject 
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-500/10';
    if (score >= 60) return 'text-amber-600 bg-amber-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getSuggestionTypeBadge = () => {
    switch (suggestion.suggestion_type) {
      case 'real_location':
        return <Badge className="bg-blue-500/10 text-blue-600 border-0">Real Location</Badge>;
      case 'studio_set':
        return <Badge className="bg-purple-500/10 text-purple-600 border-0">Studio Set</Badge>;
      case 'hybrid':
        return <Badge className="bg-amber-500/10 text-amber-600 border-0">Hybrid</Badge>;
      case 'virtual_production':
        return <Badge className="bg-green-500/10 text-green-600 border-0">Virtual Production</Badge>;
      default:
        return null;
    }
  };

  // Score categories for display
  const scoreCategories = [
    { key: 'space', label: 'Space', score: suggestion.space_suitability_score, icon: Maximize },
    { key: 'height', label: 'Height', score: suggestion.height_feasibility_score, icon: Maximize },
    { key: 'camera', label: 'Camera', score: suggestion.camera_movement_score, icon: Camera },
    { key: 'sound', label: 'Sound', score: suggestion.sound_control_score, icon: Volume2 },
    { key: 'vp', label: 'VP Ready', score: suggestion.vp_readiness_score, icon: Video },
  ];

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${getScoreColor(suggestion.overall_match_score)}`}>
              #{rank}
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {suggestion.location?.name || suggestion.location?.location_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {suggestion.location?.city}, {suggestion.location?.state}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`px-3 py-1 rounded-lg font-bold text-lg ${getScoreColor(suggestion.overall_match_score)}`}>
              {suggestion.overall_match_score}%
            </div>
            <span className="text-xs text-muted-foreground">{getScoreLabel(suggestion.overall_match_score)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Type Badge */}
        <div className="flex items-center gap-2">
          {getSuggestionTypeBadge()}
        </div>

        {/* Score Breakdown - Clean badges instead of progress bars */}
        <div className="flex flex-wrap gap-2">
          {scoreCategories.map((cat) => {
            const Icon = cat.icon;
            const colorClass = cat.score >= 80 ? 'border-green-500/30 text-green-600' : 
                              cat.score >= 60 ? 'border-amber-500/30 text-amber-600' : 
                              'border-red-500/30 text-red-600';
            return (
              <Badge key={cat.key} variant="outline" className={`gap-1 ${colorClass}`}>
                <Icon className="h-3 w-3" />
                {cat.label}: {cat.score}%
              </Badge>
            );
          })}
        </div>

        {/* AI Notes - Clear description */}
        <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
          <div className="flex items-start gap-2">
            <Star className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">AI Recommendation</p>
              <p className="text-sm leading-relaxed">{suggestion.ai_notes}</p>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  View Full Analysis
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Risk Assumptions */}
            {suggestion.risk_assumptions?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Risk Assumptions
                </h4>
                <div className="space-y-1">
                  {suggestion.risk_assumptions.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded bg-amber-500/5 border border-amber-500/20">
                      <span className="text-amber-500 font-medium">{idx + 1}.</span>
                      <span className="text-muted-foreground">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workarounds */}
            {suggestion.workarounds?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  Suggested Workarounds
                </h4>
                <div className="space-y-1">
                  {suggestion.workarounds.map((work, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded bg-blue-500/5 border border-blue-500/20">
                      <span className="text-blue-500 font-medium">{idx + 1}.</span>
                      <span className="text-muted-foreground">{work}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {suggestion.recommendations?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-500" />
                  Recommendations
                </h4>
                <div className="space-y-1">
                  {suggestion.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded bg-green-500/5 border border-green-500/20">
                      <span className="text-green-500 font-medium">{idx + 1}.</span>
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Details */}
            {suggestion.location && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-medium mb-2">Location Details</h4>
                <LocationCard location={suggestion.location} compact />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={onShortlist}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            Shortlist
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={onApprove}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onReject}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}