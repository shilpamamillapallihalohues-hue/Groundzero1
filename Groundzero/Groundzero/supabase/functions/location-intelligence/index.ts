import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ... keep existing code (SceneData interface)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { action, scene, project_id, search_query, country } = await req.json();
    console.log(`Location Intelligence: action=${action}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (action === 'discover_locations') {
      // First check database for existing locations
      const { data: existingLocations, error: dbError } = await supabase
        .from('discovered_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('DB error:', dbError);
      }

      // If we have locations in DB, return them
      if (existingLocations && existingLocations.length > 0) {
        console.log(`Returning ${existingLocations.length} locations from database`);
        return new Response(JSON.stringify({ 
          success: true, 
          locations: existingLocations,
          source: 'database'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // No locations in DB - use Firecrawl to search
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API not configured. Please connect Firecrawl to discover locations.',
          locations: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchCountry = country || 'India';
      const discoveredLocations = await searchForFilmLocations(FIRECRAWL_API_KEY, LOVABLE_API_KEY, searchCountry);
      
      // Save to database
      if (discoveredLocations.length > 0) {
        const { error: insertError } = await supabase
          .from('discovered_locations')
          .insert(discoveredLocations.map((loc: any) => ({
            location_name: loc.name,
            city: loc.city,
            state: loc.state,
            country: loc.country || searchCountry,
            location_type: loc.location_type,
            source_url: loc.source_url,
            source_name: loc.source_name || 'web_search',
            square_footage: loc.square_footage,
            square_footage_confidence: loc.square_footage_confidence || 'estimated',
            ceiling_height_ft: loc.ceiling_height_ft,
            ceiling_height_confidence: loc.ceiling_height_confidence || 'estimated',
            is_indoor: loc.is_indoor,
            amenities: loc.amenities,
            wide_shot_feasible: loc.wide_shot_feasible,
            crane_dolly_feasible: loc.crane_dolly_feasible,
            multi_camera_feasible: loc.multi_camera_feasible,
            drone_allowed: loc.drone_allowed,
            green_screen_feasible: loc.green_screen_feasible,
            led_volume_possible: loc.led_volume_possible,
            sound_control_level: loc.sound_control_level,
            vp_readiness_score: loc.vp_readiness_score,
            data_source: 'firecrawl'
          })));

        if (insertError) {
          console.error('Insert error:', insertError);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        locations: discoveredLocations,
        source: 'firecrawl'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search_new_locations') {
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Firecrawl API not configured'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const query = search_query || 'film studios shooting locations';
      const searchCountry = country || 'India';
      
      const newLocations = await searchForFilmLocations(FIRECRAWL_API_KEY, LOVABLE_API_KEY, searchCountry, query);
      
      // Save new locations to database
      if (newLocations.length > 0) {
        const { error: insertError } = await supabase
          .from('discovered_locations')
          .upsert(newLocations.map((loc: any) => ({
            location_name: loc.name,
            city: loc.city,
            state: loc.state,
            country: loc.country || searchCountry,
            location_type: loc.location_type,
            source_url: loc.source_url,
            source_name: loc.source_name || 'web_search',
            square_footage: loc.square_footage,
            square_footage_confidence: loc.square_footage_confidence || 'estimated',
            ceiling_height_ft: loc.ceiling_height_ft,
            ceiling_height_confidence: loc.ceiling_height_confidence || 'estimated',
            is_indoor: loc.is_indoor,
            amenities: loc.amenities,
            wide_shot_feasible: loc.wide_shot_feasible,
            crane_dolly_feasible: loc.crane_dolly_feasible,
            multi_camera_feasible: loc.multi_camera_feasible,
            drone_allowed: loc.drone_allowed,
            green_screen_feasible: loc.green_screen_feasible,
            led_volume_possible: loc.led_volume_possible,
            sound_control_level: loc.sound_control_level,
            vp_readiness_score: loc.vp_readiness_score,
            data_source: 'firecrawl'
          })), { onConflict: 'location_name' });

        if (insertError) {
          console.error('Upsert error:', insertError);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        locations: newLocations,
        count: newLocations.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'match_scene') {
      if (!scene) {
        throw new Error('Scene data required for matching');
      }
      
      // Get locations from database
      const { data: locations } = await supabase
        .from('discovered_locations')
        .select('*')
        .order('vp_readiness_score', { ascending: false });

      if (!locations || locations.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No locations discovered yet. Please run location discovery first.',
          suggestions: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const suggestions = await matchSceneToLocations(scene as SceneData, locations, LOVABLE_API_KEY);
      
      // Save suggestions to database if project_id provided
      if (project_id && suggestions.length > 0) {
        for (const suggestion of suggestions) {
          const locationId = locations[suggestion.location_index]?.id;
          if (locationId) {
            await supabase
              .from('location_suggestions')
              .upsert({
                scene_id: scene.id,
                location_id: locationId,
                project_id: project_id,
                suggestion_type: suggestion.suggestion_type,
                overall_match_score: suggestion.overall_match_score,
                space_suitability_score: suggestion.space_suitability_score,
                height_feasibility_score: suggestion.height_feasibility_score,
                camera_movement_score: suggestion.camera_movement_score,
                sound_control_score: suggestion.sound_control_score,
                vp_readiness_score: suggestion.vp_readiness_score,
                ai_notes: suggestion.ai_notes,
                risk_assumptions: suggestion.risk_assumptions,
                workarounds: suggestion.workarounds,
                recommendations: suggestion.recommendations
              }, { onConflict: 'scene_id,location_id' });
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        suggestions: suggestions.map((s: any, idx: number) => ({
          ...s,
          location: locations[s.location_index]
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'analyze_requirements') {
      if (!scene) {
        throw new Error('Scene data required for analysis');
      }
      
      const requirements = await analyzeSceneRequirements(scene as SceneData, LOVABLE_API_KEY);
      return new Response(JSON.stringify({ 
        success: true, 
        requirements 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Unknown action. Use: discover_locations, search_new_locations, match_scene, analyze_requirements' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Location Intelligence error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchForFilmLocations(firecrawlKey: string, lovableKey: string, country: string, customQuery?: string) {
  const searchQueries = customQuery ? [customQuery] : [
    `film studios ${country}`,
    `shooting locations ${country} movie production`,
    `backlot sets ${country} cinema`,
    `indoor sound stages ${country}`
  ];

  const allResults: any[] = [];

  for (const query of searchQueries) {
    try {
      console.log(`Searching Firecrawl: ${query}`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 10,
          scrapeOptions: {
            formats: ['markdown']
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          allResults.push(...data.data);
        }
      } else {
        console.error(`Firecrawl search failed: ${response.status}`);
      }
    } catch (e) {
      console.error(`Search error for "${query}":`, e);
    }
  }

  if (allResults.length === 0) {
    console.log('No search results from Firecrawl');
    return [];
  }

  // Use AI to extract and enhance location data from search results
  const extractedLocations = await extractLocationsFromSearchResults(allResults, lovableKey, country);
  return extractedLocations;
}

async function extractLocationsFromSearchResults(searchResults: any[], apiKey: string, country: string) {
  const combinedContent = searchResults.map(r => `
URL: ${r.url}
Title: ${r.title || 'Unknown'}
Content: ${(r.markdown || r.description || '').substring(0, 1500)}
`).join('\n---\n');

  // Valid database enum values for location_type
  const validLocationTypes = ['film_studio', 'backlot', 'permanent_set', 'indoor_stage', 'outdoor_location', 'heritage_zone', 'urban_zone', 'rural_zone'];
  
  const prompt = `You are a film production location scout. Extract film studios and shooting locations from these search results.

Search Results:
${combinedContent}

For each distinct location found, provide:
- name: Official name of the studio/location
- city: City name
- state: State/Province
- country: "${country}"
- location_type: MUST be one of: "film_studio", "backlot", "permanent_set", "indoor_stage", "outdoor_location", "heritage_zone", "urban_zone", "rural_zone"
- source_url: The URL where this info was found
- is_indoor: boolean
- amenities: array of available facilities
- notes: Brief description

Also estimate (mark these as AI-estimated):
- square_footage: Estimated size in sq ft
- ceiling_height_ft: For indoor spaces (20-60ft typical)
- wide_shot_feasible: boolean
- crane_dolly_feasible: boolean
- multi_camera_feasible: boolean
- drone_allowed: boolean (consider regulations)
- green_screen_feasible: boolean
- led_volume_possible: boolean
- sound_control_level: "high" | "medium" | "low"
- vp_readiness_score: 0-100

CRITICAL: location_type MUST be exactly one of: film_studio, backlot, permanent_set, indoor_stage, outdoor_location, heritage_zone, urban_zone, rural_zone

Return a JSON array of location objects. Include 5-15 unique locations.
Return ONLY valid JSON array, no markdown or explanation.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a film production location expert. Extract location data and return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI extraction failed:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const locations = JSON.parse(jsonMatch[0]);
      
      // Map for invalid location types to valid ones
      const locationTypeMap: Record<string, string> = {
        'heritage_site': 'heritage_zone',
        'video_studio': 'film_studio',
        'sound_stage': 'indoor_stage',
        'studio': 'film_studio',
        'outdoor': 'outdoor_location',
        'urban': 'urban_zone',
        'rural': 'rural_zone',
        'set': 'permanent_set'
      };
      
      const validLocationTypes = ['film_studio', 'backlot', 'permanent_set', 'indoor_stage', 'outdoor_location', 'heritage_zone', 'urban_zone', 'rural_zone'];
      
      return locations.map((loc: any) => {
        // Sanitize location_type to valid enum value
        let locationType = loc.location_type?.toLowerCase() || 'film_studio';
        if (!validLocationTypes.includes(locationType)) {
          locationType = locationTypeMap[locationType] || 'film_studio';
        }
        
        return {
          ...loc,
          location_type: locationType,
          square_footage_confidence: 'estimated',
          ceiling_height_confidence: 'estimated',
          data_source: 'firecrawl'
        };
      });
    }
    
    return [];
  } catch (e) {
    console.error('Extraction error:', e);
    return [];
  }
}

async function analyzeSceneRequirements(scene: SceneData, apiKey: string) {
  const prompt = `Analyze this film scene and determine location requirements:

Scene: ${scene.scene_number} - ${scene.slugline}
INT/EXT: ${scene.int_ext}
Location hint: ${scene.location}
Time of Day: ${scene.time_of_day}
Description: ${scene.description}
Characters: ${scene.characters?.join(', ') || 'Unknown'}
Props: ${scene.props?.join(', ') || 'None specified'}

Provide a JSON object with:
{
  "required_space_sqft": number (estimated minimum),
  "required_ceiling_height_ft": number (for indoor),
  "is_indoor_required": boolean,
  "crowd_size": "none" | "small" | "medium" | "large",
  "action_intensity": "low" | "medium" | "high",
  "camera_requirements": {
    "wide_shots_needed": boolean,
    "crane_shots_needed": boolean,
    "dolly_shots_needed": boolean,
    "multi_camera_needed": boolean,
    "drone_shots_possible": boolean
  },
  "sound_requirements": "controlled" | "semi-controlled" | "natural",
  "lighting_requirements": "natural" | "mixed" | "full_artificial",
  "vfx_likelihood": "none" | "low" | "medium" | "high",
  "vp_suitability": "recommended" | "possible" | "not_recommended",
  "special_requirements": string[],
  "location_type_preference": string[]
}

Return ONLY valid JSON.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a film production planner. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse requirements');
  } catch (e) {
    console.error('Requirements analysis error:', e);
    return {
      required_space_sqft: scene.int_ext?.includes('INT') ? 5000 : 20000,
      required_ceiling_height_ft: scene.int_ext?.includes('INT') ? 20 : null,
      is_indoor_required: scene.int_ext?.includes('INT'),
      crowd_size: 'small',
      action_intensity: 'medium',
      camera_requirements: {
        wide_shots_needed: true,
        crane_shots_needed: false,
        dolly_shots_needed: true,
        multi_camera_needed: false,
        drone_shots_possible: scene.int_ext?.includes('EXT'),
      },
      sound_requirements: scene.int_ext?.includes('INT') ? 'controlled' : 'natural',
      lighting_requirements: 'mixed',
      vfx_likelihood: 'low',
      vp_suitability: 'possible',
      special_requirements: [],
      location_type_preference: [scene.int_ext?.includes('INT') ? 'indoor_stage' : 'outdoor_location'],
    };
  }
}

async function matchSceneToLocations(scene: SceneData, locations: any[], apiKey: string) {
  const requirements = await analyzeSceneRequirements(scene, apiKey);
  
  const prompt = `Match this scene to the best filming locations and provide ranked suggestions.

Scene Requirements:
${JSON.stringify(requirements, null, 2)}

Scene Details:
- Scene: ${scene.scene_number} - ${scene.slugline}
- INT/EXT: ${scene.int_ext}
- Location hint: ${scene.location}
- Description: ${scene.description}

Available Locations (indexed 0 to ${locations.length - 1}):
${JSON.stringify(locations.map((l, i) => ({ index: i, name: l.name, city: l.city, type: l.location_type, sqft: l.square_footage, indoor: l.is_indoor })), null, 2)}

For each suitable location, provide:
{
  "suggestions": [
    {
      "location_index": number (0-based index),
      "suggestion_type": "real_location" | "studio_set" | "hybrid" | "virtual_production",
      "overall_match_score": number (0-100),
      "space_suitability_score": number (0-100),
      "height_feasibility_score": number (0-100),
      "camera_movement_score": number (0-100),
      "sound_control_score": number (0-100),
      "vp_readiness_score": number (0-100),
      "ai_notes": string (brief explanation),
      "risk_assumptions": string[] (what might not work),
      "workarounds": string[] (how to handle gaps),
      "recommendations": string[] (production tips)
    }
  ]
}

Rank by overall_match_score descending. Include 3-5 suggestions.
Return ONLY valid JSON.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a film location scout AI. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestions || [];
    }
    
    return [];
  } catch (e) {
    console.error('Matching error:', e);
    // Return basic suggestions based on location data
    return locations.slice(0, 3).map((loc, idx) => ({
      location_index: idx,
      suggestion_type: loc.is_indoor ? 'studio_set' : 'real_location',
      overall_match_score: 70 - (idx * 10),
      space_suitability_score: 65,
      height_feasibility_score: 70,
      camera_movement_score: 75,
      sound_control_score: loc.sound_control_level === 'high' ? 90 : 60,
      vp_readiness_score: loc.vp_readiness_score || 50,
      ai_notes: `${loc.name} in ${loc.city} - ${loc.location_type}`,
      risk_assumptions: ['Availability not confirmed', 'Pricing unknown'],
      workarounds: ['Contact location manager for details'],
      recommendations: ['Scout location in person before booking']
    }));
  }
}
