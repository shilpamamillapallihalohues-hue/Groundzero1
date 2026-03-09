import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getImageProvider, generateImage } from "../_shared/imageGeneration.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Genre-specific visual directions for character generation
const GENRE_STYLE_DIRECTIONS: Record<string, string> = {
  mythology: "ancient mythological aesthetic, divine ethereal lighting, traditional Indian/Hindu mythology, sacred temple architecture, ornate gold jewelry, flowing silk robes, lotus motifs, celestial aura",
  mythological: "ancient mythological aesthetic, divine ethereal lighting, traditional Indian/Hindu mythology, ornate gold jewelry, flowing silk robes, celestial aura",
  hindu_mythology: "Hindu mythology aesthetic, divine radiance, traditional Indian art style, vibrant traditional colors (saffron, gold, vermillion), silk dhoti and saree, divine crown",
  fantasy: "high fantasy, magical realism, enchanted lighting, ethereal atmosphere, mystical elements",
  scifi: "science fiction, futuristic technology, sleek metallic surfaces, holographic displays, cybernetic elements",
  cyberpunk: "cyberpunk aesthetic, neon-lit, augmented humans, dystopian urban style",
  historical: "historical accuracy, period-appropriate costumes, architectural authenticity",
  period: "period drama aesthetic, ornate costumes, classical architecture",
  action: "dynamic action aesthetic, heroic poses, intense lighting",
  drama: "dramatic aesthetic, emotional lighting, character-focused",
  war: "war film aesthetic, gritty realism, period-accurate uniforms",
};

// Known mythological character archetypes with auto-assist attire
const MYTHOLOGICAL_CHARACTER_ARCHETYPES: Record<string, string> = {
  // Hindu Deities
  'vishnu': "Lord Vishnu, four-armed divine form, holding conch (shankha), discus (sudarshana chakra), mace (gada), lotus, blue-skinned deity, yellow silk pitambar dhoti, Kaustubha gem necklace, Vaijayanti garland, golden crown (kirita mukut), divine radiance",
  'lord vishnu': "Lord Vishnu, four-armed divine form, blue-skinned deity, yellow silk pitambar dhoti, Kaustubha gem necklace, golden crown, divine radiance",
  'shiva': "Lord Shiva, third eye on forehead, blue throat (neelkanth), crescent moon in matted hair (jata), tiger skin dhoti, sacred ash (vibhuti), trishul (trident), snake around neck, Ganga flowing from hair, rudraksha beads",
  'lord shiva': "Lord Shiva, third eye, crescent moon in matted hair, tiger skin dhoti, sacred ash, trishul and damaru, snake around neck",
  'brahma': "Lord Brahma, four heads facing four directions, four arms holding vedas, lotus, prayer beads, kamandalu, white beard, red/pink garments, seated on lotus",
  'krishna': "Lord Krishna, blue-skinned deity, peacock feather crown, yellow silk dhoti (pitambar), playing divine flute (bansuri), tilak on forehead, enchanting smile, standing in tribhanga pose",
  'lord krishna': "Lord Krishna, blue-skinned deity, peacock feather crown, yellow silk dhoti, divine flute, tribhanga pose, divine aura",
  'rama': "Lord Rama, blue-skinned, wielding divine bow (Sharanga), yellow silk dhoti, royal crown, serene warrior expression, noble posture",
  'lord rama': "Lord Rama, blue-skinned, divine bow and arrows, yellow silk dhoti, royal crown, noble warrior",
  'hanuman': "Lord Hanuman, mighty monkey god, muscular divine form, orange/saffron complexion, tail, golden crown, loincloth, holding mace (gada), devoted expression",
  'ganesha': "Lord Ganesha, elephant-headed deity, four arms, holding axe, noose, lotus, modaka, big belly, mouse vehicle, broken tusk, red/yellow silk dhoti",
  'lord ganesha': "Lord Ganesha, elephant-headed deity, four arms, ornate jewelry, benevolent expression",
  'durga': "Goddess Durga, ten-armed warrior deity, riding lion/tiger, holding divine weapons, red silk saree, golden crown, fierce yet beautiful",
  'goddess durga': "Goddess Durga, multi-armed warrior deity, riding lion, divine weapons, red silk saree, fierce beauty",
  'lakshmi': "Goddess Lakshmi, four arms, sitting on lotus, golden coins flowing from hands, red silk saree with gold border, divine beauty",
  'goddess lakshmi': "Goddess Lakshmi, goddess of wealth, lotus flower, red silk saree, gold jewelry, serene expression",
  'saraswati': "Goddess Saraswati, goddess of knowledge, white silk saree, playing veena, holding vedas, seated on white lotus, swan vehicle",
  'goddess saraswati': "Goddess Saraswati, white silk saree, veena instrument, scholarly expression",
  'parvati': "Goddess Parvati, green silk saree, holding lotus, gentle beautiful form, motherly expression",
  'kali': "Goddess Kali, fierce form, blue/black skin, garland of skulls, four arms holding sword, wild unbound hair, third eye",
  'indra': "Lord Indra, king of gods, golden armor, thunderbolt (vajra), riding white elephant Airavata, divine crown",
  'kartikeya': "Lord Kartikeya, god of war, six-headed form, riding peacock, divine spear (vel), red garments",
  
  // Epic Characters
  'ravana': "Ravana, ten-headed demon king, twenty arms, golden crowns, ornate demonic jewelry, royal Lankan attire, powerful form",
  'sita': "Sita, princess of Mithila, traditional silk saree, gold jewelry, virtuous expression, royal demeanor",
  'lakshmana': "Lakshmana, skilled archer, yellow silk dhoti, royal crown, bow and arrows, loyal warrior prince",
  'arjuna': "Arjuna, greatest archer, Gandiva bow, warrior armor over dhoti, noble expression",
  'bhima': "Bhima, mighty Pandava warrior, massive muscular form, wielding mace, fierce expression",
  'draupadi': "Draupadi, queen of Pandavas, royal silk saree, elaborate jewelry, dignified expression",
  'karna': "Karna, tragic hero, golden armor (Kavacha), earrings (Kundala), wielding bow, sun-like radiance",
  
  // Greek Mythology
  'zeus': "Zeus, king of Greek gods, white toga, golden laurel wreath, lightning bolt, majestic beard, divine authority",
  'poseidon': "Poseidon, god of seas, wielding trident, sea-green robes, muscular aquatic deity",
  'athena': "Athena, goddess of wisdom, Corinthian helmet, aegis shield, spear, Greek peplos dress, owl companion",
  'apollo': "Apollo, god of sun and music, golden laurel crown, holding lyre, radiant sun aura, white toga",
  'hercules': "Hercules, divine hero, immense muscular form, lion skin cloak, wooden club",
  
  // Egyptian Mythology
  'ra': "Ra, Egyptian sun god, falcon head with sun disk crown, golden armor, holding ankh",
  'anubis': "Anubis, jackal-headed god, golden Egyptian collar, holding scales of judgment",
  'isis': "Isis, Egyptian goddess of magic, throne headdress, elegant Egyptian robes, protective wings",
  
  // Norse Mythology
  'odin': "Odin, Norse All-Father, one-eyed elder god, horned helmet, spear Gungnir, raven companions",
  'thor': "Thor, Norse thunder god, red beard, winged helmet, hammer Mjolnir, thunderstorm aesthetic",
  'loki': "Loki, Norse trickster god, green and gold robes, horned helmet, mischievous expression",
};

// Helper function to detect and apply mythological character archetypes
function getMythologicalCharacterStyle(characterName: string): string | null {
  const normalizedName = characterName.toLowerCase().trim();
  
  // Check for exact matches first
  if (MYTHOLOGICAL_CHARACTER_ARCHETYPES[normalizedName]) {
    return MYTHOLOGICAL_CHARACTER_ARCHETYPES[normalizedName];
  }
  
  // Check for partial matches
  for (const [key, style] of Object.entries(MYTHOLOGICAL_CHARACTER_ARCHETYPES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return style;
    }
  }
  
  return null;
}

interface AssetAnalysisRequest {
  action: 'analyze_asset' | 'generate_character_proxy' | 'search_references' | 'create_handoff_pack' | 'generate_side_view' | 'link_character_to_scene';
  assetId?: string;
  projectId: string;
  conceptArtIds?: string[];
  characterData?: {
    name: string;
    description?: string;
    sceneContext?: string;
    applyCostume?: boolean;
    costumeDetails?: string;
    referenceImageUrls?: string[]; // Reference images to maintain appearance
  };
  characterProxyId?: string;
  sceneId?: string;
  emotionalTone?: string;
  costumeNotes?: string;
  searchQuery?: string;
  searchType?: 'reference' | 'silhouette' | 'material';
}

interface StoryContext {
  projectTitle?: string;
  projectGenre?: string;
  projectDescription?: string;
  allCharacters?: string[];
}

// Character proxy generation prompt with story context
function buildCharacterProxyPrompt(name: string, description?: string, sceneContext?: string, storyContext?: StoryContext): string {
  const genreContext = storyContext?.projectGenre ? `\nPROJECT GENRE: ${storyContext.projectGenre}` : '';
  const projectContext = storyContext?.projectTitle ? `\nPROJECT: ${storyContext.projectTitle}` : '';
  const descContext = storyContext?.projectDescription ? `\nSTORY CONTEXT: ${storyContext.projectDescription}` : '';
  
  return `You are a senior character supervisor creating a neutral facial proxy for a 3D modeling team.
${projectContext}${genreContext}${descContext}

CHARACTER: ${name}
${description ? `DESCRIPTION: ${description}` : ''}
${sceneContext ? `SCENE CONTEXT: ${sceneContext}` : ''}

Generate a detailed character proxy specification. DO NOT create any real person likeness or celebrity resemblance.
Consider the project genre and story context when designing the character's look and attire.

Return a JSON object with these fields:
{
  "age_range": "e.g., 25-35, 40-50",
  "gender": "male/female/non-binary",
  "facial_structure": {
    "face_shape": "oval/round/square/heart/oblong",
    "jaw_definition": "soft/moderate/strong",
    "cheekbone_prominence": "low/medium/high",
    "brow_ridge": "subtle/moderate/prominent"
  },
  "hair_style": "description of hairstyle",
  "hair_density": "thin/medium/thick",
  "hair_color": "description",
  "facial_hair": "none/stubble/beard/mustache/goatee with description",
  "body_build": "slim/athletic/average/stocky/muscular/heavy",
  "height_reference": "short/average/tall with approximate height",
  "ethnicity_hints": "broad regional hints only, non-specific",
  "distinguishing_features": ["list of unique visual features"],
  "skin_texture_notes": "texture and complexion notes for materials",
  "expression_baseline": "neutral emotional baseline",
  "complexity_rating": 50-100 based on modeling difficulty,
  "modeling_notes": "specific notes for 3D modelers"
}`;
}

// Asset analysis prompt
function buildAssetAnalysisPrompt(assetName: string, category: string, conceptArtDescription?: string): string {
  return `You are a senior asset TD analyzing an asset for 3D production.

ASSET: ${assetName}
CATEGORY: ${category}
${conceptArtDescription ? `CONCEPT DESCRIPTION: ${conceptArtDescription}` : ''}

Analyze this asset and provide production intelligence. Return a JSON object:
{
  "silhouette_analysis": {
    "primary_shape": "description of main silhouette",
    "secondary_shapes": ["list of secondary forms"],
    "negative_space": "description of negative space elements"
  },
  "scale_reference": {
    "estimated_size": "dimensions or relative scale",
    "reference_objects": ["real-world objects for scale comparison"]
  },
  "proportion_breakdown": {
    "segments": [{"name": "segment name", "ratio": "percentage of total"}]
  },
  "material_hints": [
    {"surface": "surface name", "material_type": "metal/wood/fabric/etc", "texture_notes": "texture description"}
  ],
  "functional_components": ["list of moving or functional parts"],
  "mesh_group_suggestions": ["suggested mesh group names for organization"],
  "topology_considerations": ["areas needing special topology attention"],
  "lod_recommendations": {
    "hero": "hero level details",
    "mid": "mid-range details to retain",
    "background": "silhouette-only considerations"
  },
  "complexity_score": 0-100,
  "reusability_potential": 0-100,
  "scene_relevance_notes": "how this asset fits the scene context"
}`;
}

// Reference search prompt
function buildReferenceSearchPrompt(query: string, searchType: string): string {
  return `You are a reference researcher for a 3D production team.

SEARCH QUERY: ${query}
SEARCH TYPE: ${searchType}

Generate 5 detailed search suggestions for finding production references. Focus on:
- Public domain resources
- Creative Commons licensed content
- Educational/tutorial content
- Museum archives
- Technical references

Return a JSON object:
{
  "search_suggestions": [
    {
      "query": "specific search query",
      "platforms": ["suggested platforms to search"],
      "expected_results": "what kind of references to expect",
      "usage_notes": "how to use these references safely"
    }
  ],
  "silhouette_keywords": ["keywords for silhouette references"],
  "material_keywords": ["keywords for material/texture references"],
  "scale_keywords": ["keywords for scale/proportion references"],
  "safety_notes": "legal and ethical considerations"
}`;
}

// Handoff pack generation prompt
function buildHandoffPackPrompt(assetName: string, category: string, modelPlan?: any): string {
  return `You are a senior asset TD creating a modeling handoff brief.

ASSET: ${assetName}
CATEGORY: ${category}
${modelPlan ? `EXISTING MODEL PLAN: ${JSON.stringify(modelPlan)}` : ''}

Create a comprehensive modeling brief. Return a JSON object:
{
  "modeling_brief": "2-3 paragraph brief for the modeling team",
  "priority_areas": ["list of areas requiring most attention"],
  "scale_notes": "detailed scale and proportion notes",
  "topology_guidance": {
    "edge_flow_notes": "notes on edge flow requirements",
    "density_zones": [{"zone": "zone name", "density": "high/medium/low", "reason": "why"}],
    "deformation_areas": ["areas that may deform/animate"]
  },
  "material_hints": [
    {"slot_name": "material slot", "material_type": "type", "texture_notes": "notes"}
  ],
  "mesh_groups": [
    {"name": "group name", "purpose": "purpose", "can_be_separate": true/false}
  ],
  "technical_requirements": {
    "poly_budget_estimate": "estimated poly count",
    "texture_resolution": "recommended resolution",
    "uv_layout_notes": "UV layout recommendations"
  },
  "common_pitfalls": ["things to watch out for"],
  "reference_usage_guide": "how to interpret provided references"
}`;
}

// Character image generation prompt with story and mythological context
function buildCharacterImagePrompt(
  characterSpec: any, 
  viewType: 'front' | 'side' | 'three_quarter', 
  costumeDetails?: string,
  storyContext?: StoryContext,
  characterName?: string
): string {
  const viewDescriptions = {
    front: 'front view, facing camera directly, symmetrical pose',
    side: 'profile view, 90 degree side angle, clear silhouette',
    three_quarter: 'three-quarter view, 45 degree angle, showing depth and form'
  };

  // Check for mythological character archetype
  let mythologicalStyle = '';
  if (characterName) {
    const archetype = getMythologicalCharacterStyle(characterName);
    if (archetype) {
      mythologicalStyle = `\n\nMYTHOLOGICAL CHARACTER ARCHETYPE:\n${archetype}`;
      console.log(`Applied mythological archetype for: ${characterName}`);
    }
  }

  // Apply genre-specific styling
  let genreStyle = '';
  if (storyContext?.projectGenre) {
    const genre = storyContext.projectGenre.toLowerCase().replace(/[^a-z]/g, '_');
    if (GENRE_STYLE_DIRECTIONS[genre]) {
      genreStyle = `\n\nGENRE VISUAL STYLE:\n${GENRE_STYLE_DIRECTIONS[genre]}`;
    }
  }

  // Story context
  let storyInfo = '';
  if (storyContext?.projectTitle || storyContext?.projectDescription) {
    storyInfo = `\n\nSTORY CONTEXT:`;
    if (storyContext.projectTitle) storyInfo += `\nProject: ${storyContext.projectTitle}`;
    if (storyContext.projectGenre) storyInfo += `\nGenre: ${storyContext.projectGenre}`;
    if (storyContext.projectDescription) storyInfo += `\nDescription: ${storyContext.projectDescription}`;
  }

  const costumePrompt = costumeDetails ? `\n- Costume: ${costumeDetails}` : '';

  // If mythological character, prioritize the archetype styling
  if (mythologicalStyle) {
    return `Character reference sheet for 3D modeling. ${viewDescriptions[viewType]}.
${mythologicalStyle}
${genreStyle}
${storyInfo}

Additional specifications:
- Age: ${characterSpec.age_range || 'divine/ageless'}
- Build: ${characterSpec.body_build || 'as per archetype'}
${characterSpec.distinguishing_features?.length ? `- Features: ${characterSpec.distinguishing_features.join(', ')}` : ''}${costumePrompt}

IMPORTANT: Follow the mythological archetype attire and iconography. Divine ethereal lighting. Plain background for modeling reference. Standing pose appropriate for the deity/character. Ultra high resolution reference sheet.`;
  }

  return `Neutral character reference sheet for 3D modeling. ${viewDescriptions[viewType]}.
${genreStyle}
${storyInfo}

Character specifications:
- Age: ${characterSpec.age_range || 'adult'}
- Gender: ${characterSpec.gender || 'neutral'}
- Build: ${characterSpec.body_build || 'average'}
- Face shape: ${characterSpec.facial_structure?.face_shape || 'oval'}
- Hair: ${characterSpec.hair_style || 'short'}, ${characterSpec.hair_density || 'medium'} density
${characterSpec.facial_hair && characterSpec.facial_hair !== 'none' ? `- Facial hair: ${characterSpec.facial_hair}` : ''}
${characterSpec.distinguishing_features?.length ? `- Features: ${characterSpec.distinguishing_features.join(', ')}` : ''}${costumePrompt}

IMPORTANT: Generic, non-identifiable face. Neutral expression. Neutral lighting. Plain gray background. Modeling reference style. T-pose or relaxed standing. Ultra high resolution reference sheet.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: AssetAnalysisRequest = await req.json();
    const { action, projectId } = request;

    console.log(`Asset Intelligence action: ${action}`);

    // Get the configured image provider for this project
    const imageProvider = await getImageProvider(supabase, projectId);
    console.log('Using image provider:', imageProvider);

    switch (action) {
      case 'analyze_asset': {
        const { assetId, conceptArtIds } = request;
        
        // Fetch asset data
        const { data: asset, error: assetError } = await supabase
          .from('production_assets')
          .select('*')
          .eq('id', assetId)
          .single();

        if (assetError) throw assetError;

        // Fetch related concept arts if provided
        let conceptDescription = '';
        if (conceptArtIds?.length) {
          const { data: concepts } = await supabase
            .from('concept_arts')
            .select('description, title')
            .in('id', conceptArtIds);
          
          if (concepts) {
            conceptDescription = concepts.map(c => `${c.title}: ${c.description}`).join('. ');
          }
        }

        const prompt = buildAssetAnalysisPrompt(asset.name, asset.category, conceptDescription);

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a senior asset TD. Return only valid JSON.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }), {
              status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw new Error(`AI request failed: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        return new Response(JSON.stringify({
          success: true,
          analysis,
          assetId,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'generate_character_proxy': {
        const { characterData } = request;
        if (!characterData?.name) {
          throw new Error('Character name is required');
        }

        // Fetch full story context for the project
        console.log('Fetching story context for character proxy generation...');
        const { data: project } = await supabase
          .from('projects')
          .select('title, genre, description')
          .eq('id', projectId)
          .single();

        const storyContext: StoryContext = {
          projectTitle: project?.title,
          projectGenre: project?.genre,
          projectDescription: project?.description,
        };

        console.log('Story context:', JSON.stringify(storyContext));

        // Check if character is a known mythological archetype
        const mythologicalArchetype = getMythologicalCharacterStyle(characterData.name);
        if (mythologicalArchetype) {
          console.log(`Detected mythological archetype for: ${characterData.name}`);
        }

        // Step 1: Generate character specification
        const specPrompt = buildCharacterProxyPrompt(
          characterData.name,
          characterData.description,
          characterData.sceneContext,
          storyContext
        );

        const specResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a character supervisor. Return only valid JSON. For mythological or religious characters, incorporate their traditional attire and iconography.' },
              { role: 'user', content: specPrompt }
            ],
          }),
        });

        if (!specResponse.ok) {
          if (specResponse.status === 429) {
            return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded.' }), {
              status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw new Error(`AI request failed: ${specResponse.status}`);
        }

        const specData = await specResponse.json();
        const specContent = specData.choices?.[0]?.message?.content || '';
        const jsonMatch = specContent.match(/\{[\s\S]*\}/);
        const characterSpec = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        // Get costume details if provided
        const costumeDetails = characterData.applyCostume ? characterData.costumeDetails : undefined;
        
        // Get reference images if provided
        const referenceImages = characterData.referenceImageUrls || [];
        const hasReferenceImages = referenceImages.length > 0;
        
        if (hasReferenceImages) {
          console.log(`Using ${referenceImages.length} reference image(s) for character generation`);
        }
        
        // Step 2: Generate front view image with story context and reference images
        console.log('Generating front view proxy image with story context...');
        const frontPrompt = hasReferenceImages 
          ? `Based on the provided reference image(s), maintain the exact appearance, costume, and visual style while generating a ${buildCharacterImagePrompt(characterSpec, 'front', costumeDetails, storyContext, characterData.name)}. CRITICAL: Preserve the character's face, clothing, and all visual details from the reference.`
          : buildCharacterImagePrompt(characterSpec, 'front', costumeDetails, storyContext, characterData.name);
        const frontResult = await generateImage({ prompt: frontPrompt, projectId, referenceImages }, imageProvider);
        const frontViewUrl = frontResult.imageUrl;

        // Step 3: Generate three-quarter view with story context and reference images
        console.log('Generating three-quarter view proxy image with story context...');
        const threeQuarterPrompt = hasReferenceImages
          ? `Based on the provided reference image(s), maintain the exact appearance, costume, and visual style while generating a ${buildCharacterImagePrompt(characterSpec, 'three_quarter', costumeDetails, storyContext, characterData.name)}. CRITICAL: Preserve the character's face, clothing, and all visual details from the reference.`
          : buildCharacterImagePrompt(characterSpec, 'three_quarter', costumeDetails, storyContext, characterData.name);
        const threeQuarterResult = await generateImage({ prompt: threeQuarterPrompt, projectId, referenceImages }, imageProvider);
        const threeQuarterViewUrl = threeQuarterResult.imageUrl;

        // Step 4: Generate side view with story context and reference images
        console.log('Generating side view proxy image with story context...');
        const sidePrompt = hasReferenceImages
          ? `Based on the provided reference image(s), maintain the exact appearance, costume, and visual style while generating a ${buildCharacterImagePrompt(characterSpec, 'side', costumeDetails, storyContext, characterData.name)}. CRITICAL: Preserve the character's face, clothing, and all visual details from the reference.`
          : buildCharacterImagePrompt(characterSpec, 'side', costumeDetails, storyContext, characterData.name);
        const sideResult = await generateImage({ prompt: sidePrompt, projectId, referenceImages }, imageProvider);
        const sideViewUrl = sideResult.imageUrl;

        // Save to database
        const { data: savedProxy, error: saveError } = await supabase
          .from('character_proxies')
          .insert({
            project_id: projectId,
            name: characterData.name,
            age_range: characterSpec.age_range,
            facial_structure: characterSpec.facial_structure,
            hair_style: characterSpec.hair_style,
            hair_density: characterSpec.hair_density,
            facial_hair: characterSpec.facial_hair,
            body_build: characterSpec.body_build,
            ethnicity_hints: characterSpec.ethnicity_hints,
            gender: characterSpec.gender,
            height_reference: characterSpec.height_reference,
            distinguishing_features: characterSpec.distinguishing_features,
            front_view_url: frontViewUrl,
            side_view_url: sideViewUrl,
            three_quarter_view_url: threeQuarterViewUrl,
            complexity_rating: characterSpec.complexity_rating,
            status: 'generated',
          })
          .select()
          .single();

        if (saveError) throw saveError;

        return new Response(JSON.stringify({
          success: true,
          characterProxy: savedProxy,
          characterSpec,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'generate_side_view': {
        const { characterProxyId } = request;
        if (!characterProxyId) {
          throw new Error('Character proxy ID is required');
        }

        // Fetch existing character proxy
        const { data: proxy, error: proxyError } = await supabase
          .from('character_proxies')
          .select('*')
          .eq('id', characterProxyId)
          .single();

        if (proxyError) throw proxyError;

        // Fetch story context for the project
        const { data: project } = await supabase
          .from('projects')
          .select('title, genre, description')
          .eq('id', proxy.project_id)
          .single();

        const storyContext: StoryContext = {
          projectTitle: project?.title,
          projectGenre: project?.genre,
          projectDescription: project?.description,
        };

        const characterSpec = {
          age_range: proxy.age_range,
          gender: proxy.gender,
          body_build: proxy.body_build,
          facial_structure: proxy.facial_structure,
          hair_style: proxy.hair_style,
          hair_density: proxy.hair_density,
          facial_hair: proxy.facial_hair,
          distinguishing_features: proxy.distinguishing_features,
        };

        console.log('Generating side view for existing character with story context...');
        const sidePrompt = buildCharacterImagePrompt(characterSpec, 'side', undefined, storyContext, proxy.name);
        
        const sideResult = await generateImage({ prompt: sidePrompt, projectId }, imageProvider);
        const sideViewUrl = sideResult.imageUrl;

        // Update character proxy with side view
        const { data: updatedProxy, error: updateError } = await supabase
          .from('character_proxies')
          .update({ side_view_url: sideViewUrl })
          .eq('id', characterProxyId)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
          success: true,
          characterProxy: updatedProxy,
          sideViewUrl,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'link_character_to_scene': {
        const { characterProxyId, sceneId, emotionalTone, costumeNotes } = request;
        if (!characterProxyId || !sceneId) {
          throw new Error('Character proxy ID and scene ID are required');
        }

        // Fetch scene info
        const { data: scene, error: sceneError } = await supabase
          .from('scenes')
          .select('id, scene_number, slugline')
          .eq('id', sceneId)
          .single();

        if (sceneError) throw sceneError;

        // Fetch current character proxy
        const { data: proxy, error: proxyError } = await supabase
          .from('character_proxies')
          .select('scene_usage, emotional_tones')
          .eq('id', characterProxyId)
          .single();

        if (proxyError) throw proxyError;

        // Add scene to usage
        const currentSceneUsage = (proxy.scene_usage as unknown as any[]) || [];
        const currentEmotionalTones = (proxy.emotional_tones as Record<string, string>) || {};
        
        // Check if scene already linked
        const existingIndex = currentSceneUsage.findIndex((s: any) => s.scene_id === sceneId);
        
        const sceneEntry = {
          scene_id: sceneId,
          scene_name: `${scene.scene_number} - ${scene.slugline}`,
          emotional_tone: emotionalTone,
          costume_notes: costumeNotes,
        };

        if (existingIndex >= 0) {
          currentSceneUsage[existingIndex] = sceneEntry;
        } else {
          currentSceneUsage.push(sceneEntry);
        }

        if (emotionalTone) {
          currentEmotionalTones[sceneId] = emotionalTone;
        }

        // Update character proxy
        const { data: updatedProxy, error: updateError } = await supabase
          .from('character_proxies')
          .update({ 
            scene_usage: currentSceneUsage,
            emotional_tones: currentEmotionalTones,
          })
          .eq('id', characterProxyId)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
          success: true,
          characterProxy: updatedProxy,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'search_references': {
        const { searchQuery, searchType = 'reference' } = request;
        if (!searchQuery) {
          throw new Error('Search query is required');
        }

        const searchPrompt = buildReferenceSearchPrompt(searchQuery, searchType);

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a reference researcher. Return only valid JSON.' },
              { role: 'user', content: searchPrompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI request failed: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const searchResults = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        // Save search to database
        await supabase.from('reference_searches').insert({
          project_id: projectId,
          search_query: searchQuery,
          search_type: searchType,
          source_type: 'ai_suggested',
          results: searchResults,
        });

        return new Response(JSON.stringify({
          success: true,
          searchResults,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_handoff_pack': {
        const { assetId } = request;
        
        // Fetch asset and model plan
        const { data: asset } = await supabase
          .from('production_assets')
          .select('*')
          .eq('id', assetId)
          .single();

        if (!asset) throw new Error('Asset not found');

        const { data: modelPlan } = await supabase
          .from('model_plans')
          .select('*')
          .eq('asset_id', assetId)
          .single();

        const prompt = buildHandoffPackPrompt(asset.name, asset.category, modelPlan);

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a senior asset TD. Return only valid JSON.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI request failed: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const handoffData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        // Save handoff pack
        const { data: savedPack, error: saveError } = await supabase
          .from('modeling_handoff_packs')
          .insert({
            project_id: projectId,
            asset_id: assetId,
            pack_name: `${asset.name} Handoff Pack`,
            pack_type: 'asset',
            modeling_brief: handoffData.modeling_brief,
            scale_notes: handoffData.scale_notes,
            topology_guidance: handoffData.topology_guidance,
            material_hints: handoffData.material_hints,
            mesh_groups: handoffData.mesh_groups,
            complexity_rating: asset.complexity_score || 50,
            status: 'ready',
          })
          .select()
          .single();

        if (saveError) throw saveError;

        return new Response(JSON.stringify({
          success: true,
          handoffPack: savedPack,
          handoffData,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Asset Intelligence error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
