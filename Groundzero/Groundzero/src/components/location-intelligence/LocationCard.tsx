import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiscoveredLocation } from "@/types/locationIntelligence";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { 
  MapPin, Building2, TreePine, Camera, Video, 
  Volume2, Zap, ExternalLink, IndianRupee,
  Maximize, MoveVertical
} from "lucide-react";

interface LocationCardProps {
  location: DiscoveredLocation;
  onSelect?: (location: DiscoveredLocation) => void;
  selected?: boolean;
  compact?: boolean;
}

export function LocationCard({ location, onSelect, selected, compact }: LocationCardProps) {
  const getTypeIcon = () => {
    switch (location.location_type) {
      case 'film_studio':
      case 'indoor_stage':
        return Building2;
      case 'outdoor_location':
      case 'backlot':
        return TreePine;
      default:
        return MapPin;
    }
  };

  const TypeIcon = getTypeIcon();

  const formatNumber = (num?: number) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  return (
    <Card 
      className={`transition-all cursor-pointer hover:shadow-md ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect?.(location)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {location.name || location.location_name}
            </CardTitle>
          </div>
          <Badge variant="outline" className="capitalize">
            {location.location_type?.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {location.city}, {location.state}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Spatial Info */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Maximize className="h-4 w-4 text-muted-foreground" />
            <ConfidenceBadge 
              confidence={location.square_footage_confidence}
              value={location.square_footage ? `${formatNumber(location.square_footage)} sq ft` : undefined}
            />
          </div>
          {location.ceiling_height_ft && (
            <div className="flex items-center gap-2">
              <MoveVertical className="h-4 w-4 text-muted-foreground" />
              <ConfidenceBadge 
                confidence={location.ceiling_height_confidence}
                value={`${location.ceiling_height_ft} ft`}
              />
            </div>
          )}
        </div>

        {!compact && (
          <>
            {/* Camera Feasibility */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="h-3 w-3" /> Camera Feasibility
              </p>
              <div className="flex flex-wrap gap-1">
                <ConfidenceBadge 
                  confidence={location.wide_shot_confidence}
                  value={location.wide_shot_feasible}
                  label="Wide"
                  showIcon={false}
                />
                <ConfidenceBadge 
                  confidence={location.crane_dolly_confidence}
                  value={location.crane_dolly_feasible}
                  label="Crane"
                  showIcon={false}
                />
                <ConfidenceBadge 
                  confidence={location.drone_confidence}
                  value={location.drone_allowed}
                  label="Drone"
                  showIcon={false}
                />
              </div>
            </div>

            {/* VP Readiness */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Video className="h-3 w-3" /> VP Suitability
              </p>
              <div className="flex flex-wrap gap-1">
                <ConfidenceBadge 
                  confidence={location.green_screen_confidence}
                  value={location.green_screen_feasible}
                  label="Green"
                  showIcon={false}
                />
                <ConfidenceBadge 
                  confidence={location.led_volume_confidence}
                  value={location.led_volume_possible}
                  label="LED"
                  showIcon={false}
                />
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  VP Score: {location.vp_readiness_score || 0}%
                </Badge>
              </div>
            </div>

            {/* Sound Control */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <ConfidenceBadge 
                confidence={location.sound_control_confidence}
                value={location.sound_control_level}
                label="Sound Control"
              />
            </div>

            {/* Cost & Source */}
            <div className="flex items-center justify-between pt-2 border-t">
              {location.cost_estimate_per_day && (
                <div className="flex items-center gap-1 text-sm">
                  <IndianRupee className="h-4 w-4" />
                  <span>~{formatNumber(location.cost_estimate_per_day)}/day</span>
                </div>
              )}
              {location.source_url && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={location.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Source
                  </a>
                </Button>
              )}
            </div>
          </>
        )}

        {/* Amenities */}
        {!compact && location.amenities && location.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {location.amenities.slice(0, 5).map((amenity, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {location.amenities.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{location.amenities.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
