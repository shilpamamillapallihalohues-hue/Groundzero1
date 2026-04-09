import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getImageProvider, generateImage } from "../_shared/imageGeneration.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StoryboardRequest {
  sceneId?: string;
  sceneNumber?: number;
  description: string;
  shotType?: string;
  cameraAngle?: string;
  cameraHeight?: string;
  cameraDistance?: string;
  lightingSetup?: string;
  lightingMood?: string;
  location?: string;
  timeOfDay?: string;
  mood?: string;
  artStyle?: string;
  lensType?: string;
  lensFocalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focusType?: string;
  cameraMovement?: string;
  cameraMovementSpeed?: string;
  projectId?: string;
  workflowConfig?: any;
  characters?: string[];
  shotNumber?: number;
  narrativePurpose?: string;
  compositionRule?: string;
}

// ═══════════════════════════════════════════════════════
// SCENE MEMORY ENGINE
// Maintains spatial and visual continuity across shots
// ═══════════════════════════════════════════════════════

interface SceneMemoryState {
  lastCameraDirection: string;
  lastLightingDirection: string;
  characterPositions: Record<string, string>; // character -> screen position
  establishedLayout: string;
  timeProgression: string;
  emotionalArc: string[];
  shotProgression: string[];
  spatialContinuity: string;
}

function buildSceneMemory(
  existingShots: any[],
  currentRequest: StoryboardRequest,
  currentScene: any
): SceneMemoryState {
  const memory: SceneMemoryState = {
    lastCameraDirection: 'neutral',
    lastLightingDirection: currentRequest.lightingSetup || 'natural',
    characterPositions: {},
    establishedLayout: '',
    timeProgression: currentRequest.timeOfDay || currentScene?.time_of_day || 'day',
    emotionalArc: [],
    shotProgression: [],
    spatialContinuity: '',
  };

  if (existingShots.length === 0) return memory;

  // Analyze each previous shot to build cumulative spatial state
  for (const shot of existingShots) {
    // Track camera direction evolution
    if (shot.camera_angle) {
      memory.lastCameraDirection = shot.camera_angle;
    }
    if (shot.lighting) {
      memory.lastLightingDirection = shot.lighting;
    }

    // Track emotional progression
    if (shot.mood) {
      memory.emotionalArc.push(shot.mood);
    }

    // Build shot progression summary
    memory.shotProgression.push(
      `Shot ${shot.shot_number}: ${shot.shot_type || 'medium'} — ${(shot.action || '').slice(0, 60)}`
    );

    // Infer character positions from shot type and action
    const action = (shot.action || '').toLowerCase();
    const shotType = (shot.shot_type || '').toLowerCase();
    
    if (shotType.includes('over_shoulder') || shotType.includes('ots')) {
      // OTS implies two characters facing each other
      memory.characterPositions['foreground_character'] = 'screen-left, back to camera';
      memory.characterPositions['subject_character'] = 'screen-right, facing camera';
    } else if (shotType.includes('wide') || shotType.includes('establishing')) {
      // Wide shots establish spatial layout
      memory.establishedLayout = action.slice(0, 120);
    }

    // Extract character position cues from action text
    if (action.includes('left')) {
      const charMatch = action.match(/(\w+)\s+(?:on\s+)?(?:the\s+)?left/i);
      if (charMatch) memory.characterPositions[charMatch[1]] = 'screen-left';
    }
    if (action.includes('right')) {
      const charMatch = action.match(/(\w+)\s+(?:on\s+)?(?:the\s+)?right/i);
      if (charMatch) memory.characterPositions[charMatch[1]] = 'screen-right';
    }
    if (action.includes('center') || action.includes('centre')) {
      const charMatch = action.match(/(\w+)\s+(?:in\s+)?(?:the\s+)?cent(?:er|re)/i);
      if (charMatch) memory.characterPositions[charMatch[1]] = 'center-frame';
    }
  }

  // Build spatial continuity instruction
  const lastShot = existingShots[existingShots.length - 1];
  const parts: string[] = [];
  
  if (memory.establishedLayout) {
    parts.push(`Established spatial layout: ${memory.establishedLayout}`);
  }
  if (Object.keys(memory.characterPositions).length > 0) {
    const posStr = Object.entries(memory.characterPositions)
      .map(([char, pos]) => `${char}: ${pos}`)
      .join(', ');
    parts.push(`Character positions from previous shots: ${posStr}`);
  }
  parts.push(`Previous camera was: ${memory.lastCameraDirection}`);
  parts.push(`Lighting established as: ${memory.lastLightingDirection}`);
  
  if (lastShot) {
    parts.push(`Last shot was: ${lastShot.shot_type || 'medium'} (${lastShot.camera_angle || 'eye level'}), action: "${(lastShot.action || '').slice(0, 80)}"`);
  }

  memory.spatialContinuity = parts.join('. ');
  
  return memory;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: StoryboardRequest = await req.json();
    console.log('Generating storyboard for scene:', requestData.sceneNumber, 'shot:', requestData.shotNumber);

    let projectId = requestData.projectId;
    
    // Get project ID from scene if not provided
    if (!projectId && requestData.sceneId) {
      const { data: scene } = await supabase
        .from('scenes')
        .select('project_id')
        .eq('id', requestData.sceneId)
        .single();
      projectId = scene?.project_id;
    }

    // ═══════════════════════════════════════════════════════
    // STEP 1: SCRIPT INTELLIGENCE — Full context gathering
    // ═══════════════════════════════════════════════════════
    
    let scriptContext: any = {};
    let currentScene: any = null;
    let allScenes: any[] = [];
    
    if (projectId) {
      // Fetch project metadata
      const { data: project } = await supabase
        .from('projects')
        .select('title, genre')
        .eq('id', projectId)
        .single();
      
      if (project) {
        scriptContext.projectTitle = project.title;
        scriptContext.projectGenre = project.genre;
      }
      
      // Fetch ALL scenes for full script understanding
      const { data: scenes } = await supabase
        .from('scenes')
        .select('scene_number, slugline, description, characters, location, time_of_day, mood')
        .eq('project_id', projectId)
        .order('scene_number');
      
      if (scenes && scenes.length > 0) {
        allScenes = scenes;
        const currentIndex = scenes.findIndex((s: any) => s.scene_number === requestData.sceneNumber);
        if (currentIndex >= 0) {
          currentScene = scenes[currentIndex];
          scriptContext.previousScene = currentIndex > 0 ? scenes[currentIndex - 1] : null;
          scriptContext.nextScene = currentIndex < scenes.length - 1 ? scenes[currentIndex + 1] : null;
        }
      }

      // Fetch creative context / lore rules for production design intelligence
      const { data: loreRules } = await supabase
        .from('creative_context_rules')
        .select('domain, rule_text, entity_name')
        .eq('project_id', projectId)
        .eq('is_approved', true)
        .limit(30);
      
      if (loreRules && loreRules.length > 0) {
        scriptContext.loreRules = loreRules;
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: CHARACTER CONTINUITY — Gather visual references
    // ═══════════════════════════════════════════════════════
    
    let characterReferences: any[] = [];
    let approvedConcepts: any[] = [];
    let sceneReferences: any[] = [];
    
    // Fetch tagged references for characters in this shot
    const shotCharacters = requestData.characters || (currentScene?.characters as string[]) || [];
    
    if (projectId && shotCharacters.length > 0) {
      // Get character proxies (turnaround sheets)
      const { data: proxies } = await supabase
        .from('character_proxies')
        .select('name, front_view_url, neutral_proxy_url')
        .eq('project_id', projectId)
        .in('name', shotCharacters);
      
      if (proxies) {
        characterReferences = proxies.filter((p: any) => p.front_view_url || p.neutral_proxy_url);
      }

      // Get approved concept arts for characters
      const { data: charConcepts } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, image_url, art_style')
        .eq('project_id', projectId)
        .eq('concept_type', 'character')
        .or('is_approved.eq.true,director_approved.eq.true')
        .not('image_url', 'is', null)
        .limit(6);
      
      if (charConcepts) {
        approvedConcepts.push(...charConcepts);
      }
    }

    // Fetch scene-specific references
    if (requestData.sceneId) {
      const { data: refs } = await supabase
        .from('scene_references')
        .select('id, image_url, category, title')
        .eq('scene_id', requestData.sceneId);
      
      if (refs) sceneReferences = refs;

      // Fetch scene-specific concept arts (environments, props)
      const { data: sceneConcepts } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, image_url, art_style')
        .eq('scene_id', requestData.sceneId)
        .or('is_approved.eq.true,director_approved.eq.true')
        .not('image_url', 'is', null)
        .limit(4);
      
      if (sceneConcepts) {
        approvedConcepts.push(...sceneConcepts);
      }
    }

    // Fallback: project-level concepts
    if (approvedConcepts.length === 0 && projectId) {
      const { data: projectConcepts } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, image_url, art_style')
        .eq('project_id', projectId)
        .or('is_approved.eq.true,director_approved.eq.true')
        .not('image_url', 'is', null)
        .limit(6);
      
      if (projectConcepts) approvedConcepts = projectConcepts;
    }

    // Fetch existing shots in this scene for continuity validation + Scene Memory
    let existingShots: any[] = [];
    if (requestData.sceneId) {
      const { data: prevShots } = await supabase
        .from('storyboards')
        .select('shot_number, shot_type, camera_angle, lighting, action, mood, image_url, metadata')
        .eq('scene_id', requestData.sceneId)
        .order('shot_number');
      
      if (prevShots) existingShots = prevShots;
    }

    // ═══════════════════════════════════════════════════════
    // SCENE MEMORY ENGINE — Spatial & visual continuity state
    // ═══════════════════════════════════════════════════════
    
    // Build a cumulative memory of the scene's spatial state from previous shots
    const sceneMemory = buildSceneMemory(existingShots, requestData, currentScene);

    console.log('Intelligence gathered:', {
      projectTitle: scriptContext.projectTitle,
      genre: scriptContext.projectGenre,
      sceneCount: allScenes.length,
      characterRefs: characterReferences.length,
      approvedConcepts: approvedConcepts.length,
      sceneRefs: sceneReferences.length,
      loreRules: scriptContext.loreRules?.length || 0,
      existingShots: existingShots.length,
    });

    // ═══════════════════════════════════════════════════════
    // STEP 3: CINEMATOGRAPHY PLANNING
    // ═══════════════════════════════════════════════════════
    
    const shotType = requestData.shotType || 'wide_shot';
    const cameraAngle = requestData.cameraAngle || 'eye level';
    const cameraHeight = requestData.cameraHeight || 'eye level';
    const cameraDistance = requestData.cameraDistance || 'medium';
    const mood = requestData.mood || currentScene?.mood || 'neutral';
    const timeOfDay = requestData.timeOfDay || currentScene?.time_of_day || 'day';
    const location = requestData.location || currentScene?.location || 'interior';
    const lensType = requestData.lensType || 'standard';
    const lensFocalLength = requestData.lensFocalLength || '35mm';
    const lightingSetup = requestData.lightingSetup || 'natural';
    const lightingMood = requestData.lightingMood || 'balanced';
    const aperture = requestData.aperture || 'f/2.8';
    const focusType = requestData.focusType || 'shallow';
    const cameraMovement = requestData.cameraMovement || 'static';
    const narrativePurpose = requestData.narrativePurpose || '';
    const compositionRule = requestData.compositionRule || 'rule_of_thirds';

    // Map shot types to storyboard-specific framing instructions
    const shotFramingMap: Record<string, string> = {
      'establishing_shot': 'Very wide establishing frame showing the full location/environment. Characters tiny or absent. Focus on architecture, landscape, and spatial context.',
      'wide_shot': 'Wide shot showing full scene geography. Characters shown full-body within their environment. Clear spatial relationships.',
      'medium_wide': 'Medium-wide frame, characters from knees up. Environment visible. Group dynamics clear.',
      'medium_shot': 'Medium shot, characters from waist up. Conversational distance. Expressions readable.',
      'medium_close_up': 'Medium close-up, characters from chest up. Emotional engagement. Background soft.',
      'close_up': 'Close-up on face or key detail. Emotional intensity. Background very blurred or absent.',
      'extreme_close_up': 'Extreme close-up on eyes, hands, or critical object. Maximum dramatic tension.',
      'over_shoulder': 'Over-the-shoulder composition. Foreground character partially visible, focus on the subject they face.',
      'insert_shot': 'Insert/cutaway of a specific prop, object, or detail relevant to the narrative.',
      'pov': 'Point-of-view shot from a character\'s perspective. Slightly subjective framing.',
      'tracking_shot': 'Dynamic tracking composition suggesting lateral camera movement alongside subject.',
      'low_angle': 'Low angle looking up at subject. Conveys power, authority, or intimidation.',
      'high_angle': 'High angle looking down. Conveys vulnerability, overview, or divine perspective.',
      'dutch_angle': 'Tilted/canted frame. Creates unease, tension, or disorientation.',
      'bird_eye': 'Overhead bird\'s eye view. God-like perspective showing spatial layout.',
    };

    const framingInstruction = shotFramingMap[shotType] || shotFramingMap['medium_shot'];

    // Composition rule instructions
    const compositionRules: Record<string, string> = {
      'rule_of_thirds': 'Compose using rule of thirds. Place key subjects at intersection points.',
      'center_frame': 'Symmetrical center-frame composition for formal, powerful staging.',
      'leading_lines': 'Use architectural or environmental leading lines to guide the eye to the subject.',
      'foreground_framing': 'Frame subject through foreground elements (doorways, branches, shoulders).',
      'depth_layers': 'Create clear foreground, midground, and background layers for cinematic depth.',
      'negative_space': 'Use negative space to isolate the subject and create dramatic tension.',
      'golden_ratio': 'Apply golden ratio/spiral for organic, aesthetically balanced composition.',
    };

    const compositionInstruction = compositionRules[compositionRule] || compositionRules['rule_of_thirds'];

    // ═══════════════════════════════════════════════════════
    // STEP 4: PRODUCTION DESIGN INTELLIGENCE
    // ═══════════════════════════════════════════════════════
    
    // Detect project style classification from genre + lore
    let styleClassification = 'contemporary drama';
    const genre = (scriptContext.projectGenre || '').toLowerCase();
    const projectTitle = (scriptContext.projectTitle || '').toLowerCase();
    const loreRules = scriptContext.loreRules || [];
    
    const mythKeywords = ['mythology', 'mythological', 'puranic', 'epic', 'shiva', 'vishnu', 'temple', 'ancient', 'vedic', 'samudra manthan'];
    const hasMyth = mythKeywords.some(k => 
      genre.includes(k) || projectTitle.includes(k) || 
      loreRules.some((r: any) => (r.rule_text || '').toLowerCase().includes(k))
    );
    
    if (hasMyth) styleClassification = 'mythological epic';
    else if (genre.includes('horror')) styleClassification = 'horror thriller';
    else if (genre.includes('sci-fi') || genre.includes('science fiction')) styleClassification = 'science fiction';
    else if (genre.includes('war') || genre.includes('action')) styleClassification = 'action war';
    else if (genre.includes('period') || genre.includes('historical')) styleClassification = 'period historical';
    else if (genre.includes('fantasy')) styleClassification = 'high fantasy';

    // Build lore constraints for prompt
    let loreConstraints = '';
    if (loreRules.length > 0) {
      const relevantRules = loreRules
        .filter((r: any) => {
          const ruleText = (r.rule_text || '').toLowerCase();
          const entityName = (r.entity_name || '').toLowerCase();
          // Include rules relevant to characters in this shot or general world rules
          return shotCharacters.some(c => entityName.includes(c.toLowerCase()) || ruleText.includes(c.toLowerCase())) ||
                 r.domain === 'worlds' || r.domain === 'locations' || r.domain === 'culture';
        })
        .slice(0, 8);
      
      if (relevantRules.length > 0) {
        loreConstraints = `\n\nMANDATORY CREATIVE CANON (from approved production design):\n${relevantRules.map((r: any) => `- [${r.domain}] ${r.rule_text}`).join('\n')}`;
      }
    }

    // Style-drift prevention: negative constraints based on classification
    const styleDriftBlacklist: Record<string, string[]> = {
      'mythological epic': ['cyberpunk', 'neon lights', 'modern technology', 'futuristic', 'sci-fi armor', 'glass buildings', 'LED', 'hologram'],
      'period historical': ['modern cars', 'smartphones', 'neon', 'futuristic', 'cyberpunk', 'hologram'],
      'science fiction': ['medieval armor', 'horse-drawn carriage', 'oil lamp'],
      'horror thriller': ['bright cheerful', 'cartoon', 'pastel colors', 'cute'],
    };
    
    const blacklist = styleDriftBlacklist[styleClassification] || [];
    const negativeConstraints = blacklist.length > 0 
      ? `\nSTRICTLY AVOID these anachronistic elements: ${blacklist.join(', ')}.` 
      : '';

    // ═══════════════════════════════════════════════════════
    // STEP 5: STRUCTURED STORYBOARD PROMPT with SCENE MEMORY
    // ═══════════════════════════════════════════════════════

    // Build Scene Memory continuity block (replaces simple continuity)
    let sceneMemoryBlock = '';
    if (existingShots.length > 0) {
      sceneMemoryBlock = `
SCENE MEMORY ENGINE — SPATIAL CONTINUITY STATE:
${sceneMemory.spatialContinuity}

Shot progression so far:
${sceneMemory.shotProgression.slice(-5).join('\n')}

${sceneMemory.emotionalArc.length > 0 ? `Emotional arc: ${sceneMemory.emotionalArc.join(' → ')}` : ''}

CONTINUITY RULES (MANDATORY):
- Character positions MUST remain consistent with established blocking
- Lighting direction MUST match: ${sceneMemory.lastLightingDirection}
- Environment layout MUST match the establishing shot
- Time of day: ${sceneMemory.timeProgression} (no unexplained changes)
- Camera should progress logically from: ${sceneMemory.lastCameraDirection}`;
    }

    // Build CHARACTER IDENTITY LOCK block
    let characterBlock = '';
    if (shotCharacters.length > 0) {
      characterBlock = `\nCHARACTERS IN FRAME: ${shotCharacters.join(', ')}`;
      
      if (characterReferences.length > 0) {
        characterBlock += `\n\nCHARACTER IDENTITY LOCK (MANDATORY):
The following characters have approved design references attached as images.
Each character MUST maintain EXACT visual identity:
- Same face structure, skin tone, and features
- Same hairstyle and facial hair
- Same costume and accessories
- Same body proportions
Only POSE, EXPRESSION, and CAMERA ANGLE may change between shots.
Characters: ${characterReferences.map((r: any) => r.name).join(', ')}`;
      } else if (approvedConcepts.length > 0) {
        characterBlock += `\n\nCHARACTER IDENTITY LOCK:
Approved concept art references are attached. Characters must match these designs exactly.
Only pose, expression, and camera angle may differ from the reference sheets.`;
      }
    }

    // Art style for storyboard frames
    const artStyle = requestData.artStyle || 'photoreal';
    const storyboardStyles: Record<string, string> = {
      'sketch': 'Professional film storyboard frame. Clean pencil/ink sketch with confident linework. Grayscale with selective tonal values for depth. Hand-drawn storyboard aesthetic used in major film productions. NOT a finished illustration — a PLANNING frame.',
      'photoreal': 'Cinematic previsualization frame. Photorealistic but with the clarity of a previs render. Clean, controlled lighting. Film production quality reference frame. NOT a glamour shot — a cinematography planning tool.',
      'anime': 'Anime-style storyboard frame (conte). Clean linework, flat colors, manga panel composition. Directorial storyboard quality.',
      'painterly': 'Digital painted storyboard frame. Quick but precise brushwork. Color keys for mood and lighting direction. Art department production reference.',
      'noir': 'High-contrast black and white storyboard. Dramatic chiaroscuro. Film noir storyboard aesthetic.',
    };
    
    const styleInstruction = storyboardStyles[artStyle] || storyboardStyles['sketch'];

    const prompt = `PROFESSIONAL FILM STORYBOARD FRAME GENERATION

OUTPUT TYPE: A single cinematic storyboard frame for film production use. This must look like a frame from a professional storyboard artist's sequence board — NOT a generic AI illustration.

PRODUCTION: "${scriptContext.projectTitle || 'Film Production'}" — ${styleClassification}
SCENE: ${requestData.sceneNumber ? `Scene ${requestData.sceneNumber}` : 'Unknown'} — "${currentScene?.slugline || location}"

SHOT DESCRIPTION: "${requestData.description}"

CINEMATOGRAPHY SPECIFICATIONS:
- Frame Type: ${framingInstruction}
- Camera Angle: ${cameraAngle}
- Camera Height: ${cameraHeight}
- Lens: ${lensFocalLength} (${lensType})
- Aperture: ${aperture} — depth of field accordingly
- Focus: ${focusType}
- Camera Movement: ${cameraMovement !== 'static' ? `${cameraMovement} — imply motion direction in composition` : 'Static — locked tripod frame'}
- Lighting: ${lightingSetup}, ${lightingMood} mood
- Time of Day: ${timeOfDay}

COMPOSITION:
${compositionInstruction}
${narrativePurpose ? `Narrative Purpose: ${narrativePurpose}` : ''}
${characterBlock}

VISUAL STYLE:
${styleInstruction}
16:9 widescreen aspect ratio. Production-grade frame.

STORYBOARD FRAME RULES:
1. This is a PLANNING FRAME for cinematography — clarity of staging and composition is paramount
2. Show clear spatial relationships between subjects and environment
3. Camera angle and lens perspective must be visually accurate
4. Lighting direction must be clear and consistent with scene memory
5. Only show elements EXPLICITLY in the shot description — nothing extra
6. Frame edges should suggest the camera's field of view boundaries
7. If characters are present, their blocking/positioning must match scene memory state
8. Character identity must EXACTLY match approved concept art references — no deviation
${sceneMemoryBlock}
${loreConstraints}
${negativeConstraints}`;

    console.log('Storyboard prompt built:', {
      length: prompt.length,
      style: artStyle,
      classification: styleClassification,
      hasCharacterRefs: characterReferences.length > 0,
      hasLore: loreConstraints.length > 0,
      hasSceneMemory: existingShots.length > 0,
      sceneMemoryShots: sceneMemory.shotProgression.length,
      characterPositions: Object.keys(sceneMemory.characterPositions).length,
    });

    // Collect reference image URLs (character refs + concept arts + scene refs)
    const referenceUrls = [
      ...characterReferences.slice(0, 2).map((r: any) => r.front_view_url || r.neutral_proxy_url),
      ...approvedConcepts.slice(0, 3).map((c: any) => c.image_url),
      ...sceneReferences.slice(0, 2).map((r: any) => r.image_url),
    ].filter(Boolean).slice(0, 6);

    // Get the configured image provider
    const provider = await getImageProvider(supabase, projectId);
    console.log('Using provider:', provider, 'with', referenceUrls.length, 'reference images');

    // Generate image
    const result = await generateImage(
      { prompt, projectId, referenceImages: referenceUrls },
      provider
    );

    if (result.error) {
      console.error('Image generation error:', result.error);
      
      if (result.error.includes('Rate limit') || result.error.includes('rate limit')) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (result.error.includes('credits')) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(result.error);
    }

    if (!result.imageUrl) {
      throw new Error('No image was generated');
    }

    return new Response(
      JSON.stringify({
        success: true,
        sceneId: requestData.sceneId,
        imageUrl: result.imageUrl,
        prompt,
        artStyle,
        usedReferences: sceneReferences.length,
        usedApprovedConcepts: approvedConcepts.length,
        usedCharacterRefs: characterReferences.length,
        provider: result.provider,
        styleClassification,
        scriptContext: {
          projectTitle: scriptContext.projectTitle,
          genre: scriptContext.projectGenre,
          hasSceneMemory: existingShots.length > 0,
          loreRulesApplied: loreConstraints.length > 0,
        },
        sceneMemory: {
          shotCount: sceneMemory.shotProgression.length,
          characterPositions: sceneMemory.characterPositions,
          lastCameraDirection: sceneMemory.lastCameraDirection,
          lastLightingDirection: sceneMemory.lastLightingDirection,
          emotionalArc: sceneMemory.emotionalArc,
        },
        cinematography: {
          shotType, cameraAngle, lensFocalLength, lightingSetup, compositionRule
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate storyboard error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate storyboard' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
