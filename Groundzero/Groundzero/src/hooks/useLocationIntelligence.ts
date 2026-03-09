import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DiscoveredLocation, 
  LocationSuggestion, 
  SceneForMatching,
  SceneRequirements,
  DataConfidence
} from '@/types/locationIntelligence';
import { toast } from 'sonner';

export function useLocationIntelligence(projectId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locations, setLocations] = useState<DiscoveredLocation[]>([]);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [requirements, setRequirements] = useState<SceneRequirements | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'firecrawl' | null>(null);

  // Load locations from database on mount
  useEffect(() => {
    loadLocationsFromDB();
  }, []);

  const loadLocationsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('discovered_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map database fields to DiscoveredLocation type
        const mappedLocations: DiscoveredLocation[] = data.map((row: any) => ({
          id: row.id,
          name: row.location_name || 'Unknown Location',
          location_name: row.location_name,
          location_type: row.location_type,
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
          address: row.address,
          square_footage: row.square_footage,
          square_footage_confidence: row.square_footage_confidence || 'estimated',
          ceiling_height_ft: row.ceiling_height_ft,
          ceiling_height_confidence: row.ceiling_height_confidence || 'estimated',
          usable_floor_area: row.usable_floor_area,
          floor_area_confidence: row.floor_area_confidence || 'estimated',
          wide_shot_feasible: row.wide_shot_feasible,
          wide_shot_confidence: row.wide_shot_confidence || 'estimated',
          crane_dolly_feasible: row.crane_dolly_feasible,
          crane_dolly_confidence: row.crane_dolly_confidence || 'estimated',
          multi_camera_feasible: row.multi_camera_feasible,
          multi_camera_confidence: row.multi_camera_confidence || 'estimated',
          drone_allowed: row.drone_allowed,
          drone_confidence: row.drone_confidence || 'estimated',
          green_screen_feasible: row.green_screen_feasible,
          green_screen_confidence: row.green_screen_confidence || 'estimated',
          led_volume_possible: row.led_volume_possible,
          led_volume_confidence: row.led_volume_confidence || 'estimated',
          indoor_stage_adaptable: row.indoor_stage_adaptable,
          indoor_stage_confidence: row.indoor_stage_confidence || 'estimated',
          vp_readiness_score: row.vp_readiness_score || 0,
          sound_control_level: row.sound_control_level,
          sound_control_confidence: row.sound_control_confidence || 'estimated',
          data_source: row.data_source || 'database',
          source_url: row.source_url,
          source_name: row.source_name,
          is_indoor: row.is_indoor || false,
          amenities: row.amenities,
          photos: row.photos,
          contact_info: row.contact_info,
          operating_hours: row.operating_hours,
          cost_estimate_per_day: row.cost_estimate_per_day,
          notes: row.notes_field || row.description || '',
          is_manually_verified: row.is_manually_verified,
        }));
        setLocations(mappedLocations);
        setDataSource('database');
      }
    } catch (error) {
      console.error('Error loading locations from DB:', error);
    }
  };

  const discoverLocations = async (country: string = 'India') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: { action: 'discover_locations', country }
      });

      if (error) throw error;

      if (data?.success && data.locations) {
        setLocations(data.locations);
        setDataSource(data.source || 'firecrawl');
        return data.locations;
      }
      
      if (data?.error) {
        toast.error(data.error);
        return [];
      }

      throw new Error('Failed to discover locations');
    } catch (error) {
      console.error('Error discovering locations:', error);
      toast.error('Failed to load location data');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const searchNewLocations = async (query: string, country: string = 'India') => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: { 
          action: 'search_new_locations',
          search_query: query,
          country 
        }
      });

      if (error) throw error;

      if (data?.success && data.locations) {
        // Merge with existing locations
        setLocations(prev => {
          const existingNames = new Set(prev.map(l => l.name));
          const newLocs = data.locations.filter((l: DiscoveredLocation) => !existingNames.has(l.name));
          return [...newLocs, ...prev];
        });
        setDataSource('firecrawl');
        toast.success(`Found ${data.count} locations`);
        return data.locations;
      }
      
      if (data?.error) {
        toast.error(data.error);
        return [];
      }

      throw new Error('Failed to search locations');
    } catch (error) {
      console.error('Error searching locations:', error);
      toast.error('Failed to search for new locations');
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const matchSceneToLocations = async (scene: SceneForMatching) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: { 
          action: 'match_scene',
          scene,
          project_id: projectId
        }
      });

      if (error) throw error;

      if (data?.success && data.suggestions) {
        setSuggestions(data.suggestions);
        return data.suggestions;
      }
      
      if (data?.error) {
        toast.error(data.error);
        return [];
      }

      throw new Error('Failed to match scene');
    } catch (error) {
      console.error('Error matching scene:', error);
      toast.error('Failed to generate location suggestions');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSceneRequirements = async (scene: SceneForMatching) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: { 
          action: 'analyze_requirements',
          scene 
        }
      });

      if (error) throw error;

      if (data?.success && data.requirements) {
        setRequirements(data.requirements);
        return data.requirements;
      }
      
      throw new Error(data?.error || 'Failed to analyze requirements');
    } catch (error) {
      console.error('Error analyzing requirements:', error);
      toast.error('Failed to analyze scene requirements');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSuggestionStatus = async (
    suggestionId: string, 
    status: 'shortlisted' | 'approved' | 'rejected'
  ) => {
    try {
      const { error } = await supabase
        .from('location_suggestions')
        .update({ status })
        .eq('id', suggestionId);

      if (error) throw error;
      
      toast.success(`Location ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating suggestion:', error);
      toast.error('Failed to update status');
      return false;
    }
  };

  const clearLocations = () => {
    setLocations([]);
    setSuggestions([]);
    setRequirements(null);
    setDataSource(null);
  };

  return {
    isLoading,
    isSearching,
    locations,
    suggestions,
    requirements,
    dataSource,
    discoverLocations,
    searchNewLocations,
    matchSceneToLocations,
    analyzeSceneRequirements,
    updateSuggestionStatus,
    clearLocations,
    refreshFromDB: loadLocationsFromDB,
  };
}
