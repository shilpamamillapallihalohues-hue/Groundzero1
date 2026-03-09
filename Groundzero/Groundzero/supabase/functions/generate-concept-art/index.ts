import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getImageProvider, generateImage } from "../_shared/imageGeneration.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Workflow configuration interface
interface WorkflowConfig {
  name: string;
  checkpoint: string;
  vae: string;
  sampler: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  batchSize: number;
  seed: number;
  seedLocked: boolean;
  denoise: number;
  clipSkip: number;
  loras: Array<{
    id: string;
    name: string;
    strength: number;
    clipStrength: number;
    enabled: boolean;
  }>;
  controlNets: Array<{
    id: string;
    type: string;
    strength: number;
    startPercent: number;
    endPercent: number;
    enabled: boolean;
    preprocessor: string;
  }>;
  upscaler: string;
  upscaleBy: number;
  hiresFixEnabled: boolean;
  hiresFixDenoise: number;
  hiresFixSteps: number;
}

interface ConceptRequest {
  conceptType: string;
  artStyle: string;
  projectId?: string;
  sceneId?: string;
  sceneContext?: {
    slugline?: string;
    description?: string;
    timeOfDay?: string;
    location?: string;
    characters?: string[];
    props?: string[];
    mood?: string;
  };
  directorVision?: {
    genre?: string;
    mood?: string;
    colorPalette?: string[];
    referenceMovies?: string[];
  };
  userPrompt?: string;
  referenceInfluence?: {
    styleDna?: Record<string, unknown>;
    weight?: number;
  };
  whatIfVariation?: {
    type: string;
    params: Record<string, unknown>;
  };
  subjectFocus?: {
    type: string;
    name: string;
    scriptDescription?: string; // Description from the script/scenes
  };
  isolatedAsset?: boolean;
  turnaroundSheet?: boolean;
  useCustomDescription?: boolean; // Flag indicating user provided custom description
  variationConfig?: {
    pose: string;
    angle: string;
  };
  referenceImages?: Array<{
    url: string;
    title?: string;
    lockedAspects: string[];
    category?: string;
  }>;
  styleLock?: {
    lockColorPalette: boolean;
    lockLighting: boolean;
    lockMood: boolean;
    extractedStyle?: {
      colorPalette?: string[];
      lightingType?: string;
      mood?: string;
      colorTemperature?: string;
    };
  };
  technicalSpecs?: {
    camera: {
      type: string;
      lens: string;
      movement: string;
      angle: string;
    };
    lighting: {
      keyLight: string;
      intensity: string;
      mood: string;
      practicals: string[];
    };
  };
  characterAttributes?: {
    age: number;
    gender: string;
    ethnicity: string;
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    bodyBuild: string;
    distinguishingFeatures: string;
  };
  workflowConfig?: WorkflowConfig;
}

interface ScriptContext {
  projectTitle?: string;
  projectGenre?: string;
  projectDescription?: string;
  allCharacters?: string[];
  allLocations?: string[];
  allScenes?: Array<{
    scene_number: string;
    slugline: string;
    description?: string;
  }>;
}

// Creative context rules extracted from lore documents
interface CreativeContextRules {
  characterRules: Array<{ title: string; description: string; sourceExcerpt?: string }>;
  environmentRules: Array<{ title: string; description: string; sourceExcerpt?: string }>;
  visualStyleRules: Array<{ title: string; description: string; sourceExcerpt?: string }>;
  symbolismRules: Array<{ title: string; description: string; sourceExcerpt?: string }>;
  worldRules: Array<{ title: string; description: string; sourceExcerpt?: string }>;
}

// PRODUCTION CONCEPT SHEET STYLE MODIFIERS
// These enforce concept-sheet composition rather than cinematic artwork
const STYLE_MODIFIERS: Record<string, string> = {
  sketch: "pencil concept sketch, clean linework, annotated design details, concept art sketch style, graphite on paper aesthetic, design exploration sheet",
  painterly: "digital painting concept art, clean brushwork, design-focused rendering, production art style, clear silhouette and form, artstation concept sheet quality",
  photoreal: "photorealistic production render, studio photography quality, clean neutral lighting, design reference render, material and texture showcase, 8K",
  matte: "matte painting concept, environment design reference, landscape layout, atmospheric depth layers, architectural blueprint quality, production VFX reference",
  mixed: "mixed media concept board, design collage with material samples, annotated reference sheet, production design board style",
};

// PRODUCTION CONCEPT SHEET QUALITY SUFFIX
const ULTRA_QUALITY_SUFFIX = "professional film production concept sheet, design reference quality, clean composition, clear design details, material textures visible, neutral controlled lighting, no lens flare, no dramatic cinematic effects, 8K resolution, sharp focus on design elements";

// CONCEPT SHEET COMPOSITION RULES - enforced on ALL outputs
const CONCEPT_SHEET_COMPOSITION = {
  character: `CONCEPT SHEET COMPOSITION: Single character centered on neutral light grey (#D0D0D0) studio background. Clean even studio lighting from above-front. NO dramatic shadows, NO rim lighting, NO environmental context. Character must fill 70-80% of frame height. Show clear silhouette. Design details must be readable. This is a CHARACTER DESIGN SHEET for 3D modelers and costume department, NOT a movie poster or cinematic frame.`,
  
  environment: `CONCEPT SHEET COMPOSITION: Environment presented as a wide establishing design reference. Clean architectural rendering style. Include subtle scale reference (human silhouette). Label-ready composition with clear spatial depth. Neutral sky or simple gradient backdrop. Architecture and spatial layout must be the focus. This is a SET DESIGN REFERENCE for production designers, NOT a cinematic landscape painting.`,
  
  prop: `CONCEPT SHEET COMPOSITION: Object centered on clean white background. Multiple angle callouts if space permits (front, side, top). Material annotations visible. Accurate scale reference. Clean studio product-photography lighting. This is a PROP DESIGN SHEET for the art department, NOT an artistic still life.`,
  
  costume: `CONCEPT SHEET COMPOSITION: Costume displayed on neutral mannequin form or flat-lay. Material swatches and construction details visible. Clean white or light grey background. Even studio lighting. Show fabric drape, stitching details, accessory placement. This is a COSTUME DESIGN SHEET for the wardrobe department.`,
  
  creature: `CONCEPT SHEET COMPOSITION: Creature centered on neutral background. Clear anatomical proportions visible. Show muscle structure, skin texture, and scale. Clean studio lighting. This is a CREATURE DESIGN SHEET for VFX and modeling teams.`,
  
  vehicle: `CONCEPT SHEET COMPOSITION: Vehicle in clean orthographic presentation. Side profile as primary view. Neutral background. Technical rendering style with material differentiation. This is a VEHICLE DESIGN SHEET for the art and VFX departments.`,
  
  set_architecture: `CONCEPT SHEET COMPOSITION: Architectural elevation or 3/4 view. Clean technical rendering. Include scale figures. Construction-ready detail level. Neutral backdrop. This is an ARCHITECTURAL DESIGN REFERENCE for set construction.`,
  
  fx_concept: `CONCEPT SHEET COMPOSITION: VFX element isolated on dark neutral background. Clear particle/energy visualization. Multiple states if applicable. This is a VFX DESIGN REFERENCE for the visual effects team.`,
};

// STYLE DRIFT PREVENTION - invalid style elements by project type
const STYLE_DRIFT_BLOCKLIST: Record<string, string[]> = {
  mythology: ['cyberpunk', 'neon', 'futuristic', 'sci-fi', 'holographic', 'digital display', 'LED', 'modern technology', 'robot', 'mech'],
  mythological: ['cyberpunk', 'neon', 'futuristic', 'sci-fi', 'holographic', 'digital display', 'LED', 'modern technology', 'robot', 'mech'],
  hindu_mythology: ['cyberpunk', 'neon', 'futuristic', 'sci-fi', 'holographic', 'digital display', 'LED', 'modern technology', 'robot', 'mech'],
  historical: ['cyberpunk', 'neon', 'futuristic', 'sci-fi', 'holographic', 'digital display', 'LED', 'modern technology', 'robot', 'mech', 'laser'],
  period: ['cyberpunk', 'neon', 'futuristic', 'sci-fi', 'holographic', 'digital display', 'LED', 'modern technology', 'robot', 'mech', 'laser'],
  western: ['cyberpunk', 'neon', 'holographic', 'sci-fi', 'robot', 'mech', 'laser', 'digital'],
  noir: ['neon', 'holographic', 'sci-fi', 'robot', 'mech', 'laser', 'digital display'],
};

// PRODUCTION DESIGN INTELLIGENCE - generates a visual bible summary from project context
function buildProductionDesignIntelligence(
  scriptContext: ScriptContext | undefined, 
  creativeContext: CreativeContextRules | undefined,
  projectGenre: string | undefined
): string {
  const parts: string[] = [];
  
  const genre = projectGenre?.toLowerCase() || '';
  
  // Classify project style
  if (genre.includes('myth') || genre.includes('hindu') || genre.includes('epic')) {
    parts.push('PRODUCTION DESIGN BIBLE: Mythological epic realism');
    parts.push('Architecture: Ancient Indian temple architecture, sacred geometry, ornate stone and metal work');
    parts.push('Materials: Silk, sacred metals (gold, bronze, copper), carved stone, sandstone, marble');
    parts.push('Color palette: Saffron, gold, vermillion, deep blue, forest green, ivory');
    parts.push('Lighting standard: Soft divine light for devas, harsh fire-lit for asuras, neutral studio for design sheets');
    parts.push('Cultural authenticity: Temple sculptures, classical Indian paintings, Puranic descriptions as primary references');
    parts.push('FORBIDDEN: Modern materials, Western fantasy tropes, generic AI fantasy aesthetics');
  } else if (genre.includes('fantasy')) {
    parts.push('PRODUCTION DESIGN BIBLE: High fantasy');
    parts.push('Materials: Leather, iron, mystical crystals, ancient wood, enchanted metals');
    parts.push('Color palette: Earth tones, deep forest greens, mystical purples, burnished gold');
  } else if (genre.includes('sci')) {
    parts.push('PRODUCTION DESIGN BIBLE: Science fiction');
    parts.push('Materials: Brushed metal, carbon fiber, holographic displays, polymer composites');
    parts.push('Color palette: Cool blues, chrome silver, neon accents, matte black');
  } else if (genre.includes('horror')) {
    parts.push('PRODUCTION DESIGN BIBLE: Horror');
    parts.push('Materials: Decayed wood, rusted metal, aged fabric, organic textures');
    parts.push('Color palette: Desaturated, muted greens and browns, deep shadows, sickly yellows');
  } else if (genre.includes('period') || genre.includes('historical')) {
    parts.push('PRODUCTION DESIGN BIBLE: Period drama');
    parts.push('Materials: Period-appropriate fabrics, wood, stone, brass, iron');
    parts.push('Historical accuracy is mandatory. Reference primary historical sources.');
  } else if (genre) {
    parts.push(`PRODUCTION DESIGN BIBLE: ${genre} genre`);
  }
  
  // Add creative context visual rules as binding visual bible entries
  if (creativeContext?.visualStyleRules && creativeContext.visualStyleRules.length > 0) {
    const visualBible = creativeContext.visualStyleRules.slice(0, 4)
      .map(r => r.description.substring(0, 150))
      .join('. ');
    parts.push(`DIRECTOR-APPROVED VISUAL RULES: ${visualBible}`);
  }
  
  // Add style drift prevention
  const blocklist = STYLE_DRIFT_BLOCKLIST[genre];
  if (blocklist) {
    parts.push(`STYLE DRIFT PREVENTION - ABSOLUTELY FORBIDDEN elements: ${blocklist.join(', ')}. If any of these appear in the output, the image is INVALID.`);
  }
  
  return parts.join('. ');
}

// Genre-specific visual directions - CRITICAL for maintaining visual coherence
const GENRE_STYLE_DIRECTIONS: Record<string, string> = {
  mythology: "ancient mythological aesthetic, divine ethereal lighting, traditional Indian/Hindu mythology, sacred temple architecture, ornate gold jewelry, flowing silk robes, lotus motifs, celestial aura, traditional religious iconography, epic Ramayana/Mahabharata visual style",
  mythological: "ancient mythological aesthetic, divine ethereal lighting, traditional Indian/Hindu mythology, sacred temple architecture, ornate gold jewelry, flowing silk robes, lotus motifs, celestial aura, traditional religious iconography, epic Ramayana/Mahabharata visual style",
  hindu_mythology: "Hindu mythology aesthetic, divine radiance, traditional Indian art style, temple sculpture influence, sacred geometry, vibrant traditional colors (saffron, gold, vermillion), silk dhoti and saree, mukut (divine crown), Padmanabha pose, divine weapons (chakra, trishul, bow)",
  fantasy: "high fantasy, magical realism, enchanted lighting, ethereal atmosphere, fantasy world building, mystical elements, otherworldly",
  scifi: "science fiction, futuristic technology, sleek metallic surfaces, holographic displays, neon accents, space-age design, cybernetic elements",
  cyberpunk: "cyberpunk aesthetic, neon-lit streets, rain-slicked surfaces, holographic advertisements, augmented humans, dystopian urban, blade runner inspired",
  horror: "horror atmosphere, unsettling shadows, desaturated colors, oppressive lighting, dread-inducing composition, psychological tension",
  noir: "film noir aesthetic, high contrast black and white, venetian blind shadows, 1940s period, fedoras and trench coats, cigarette smoke",
  western: "wild west aesthetic, dusty desert landscapes, rustic wooden buildings, cowboy attire, warm sunset tones, frontier atmosphere",
  period: "period drama aesthetic, historical accuracy, ornate costumes, classical architecture, natural lighting, vintage color grading",
  action: "dynamic action aesthetic, high energy composition, motion blur, intense lighting, explosive moments, heroic poses",
  romance: "romantic aesthetic, soft diffused lighting, warm color palette, intimate compositions, dreamy atmosphere",
  comedy: "bright colorful aesthetic, expressive characters, vibrant palette, clean lighting, approachable design",
  thriller: "thriller aesthetic, tense atmosphere, cold color grading, sharp shadows, suspenseful composition",
  drama: "dramatic aesthetic, emotional lighting, naturalistic colors, cinematic composition, character-focused",
  war: "war film aesthetic, gritty realism, muted military colors, battlefield atmosphere, period-accurate uniforms",
  historical: "historical accuracy, period-appropriate costumes, architectural authenticity, natural lighting",
  animated: "animation-ready design, clean lines, stylized proportions, vibrant colors, expressive features",
  documentary: "documentary realism, natural lighting, authentic settings, unposed compositions",
};

// COMPREHENSIVE INDIAN MYTHOLOGICAL CHARACTER ARCHETYPES
// Formula: Subject + Origin/Lore + Physical Traits + Materials/Textures + Mood/Aura + Lighting + Style + Camera + Detail Level
// These provide ultra-detailed visual guidelines for concept art generation
const MYTHOLOGICAL_CHARACTER_ARCHETYPES: Record<string, string> = {
  // =====================================================
  // TRIMURTI (Supreme Trinity)
  // =====================================================
  'vishnu': "Lord Vishnu, supreme preserver deity born from cosmic waters, tall imposing four-armed divine form, deep blue-skinned like infinite ocean, serene meditative eyes with divine calm, holding conch (shankha) emitting cosmic sound, spinning sudarshana chakra of divine order, golden mace (gada) of strength, pink lotus of purity, wearing rich yellow silk pitambar dhoti with golden borders, Kaustubha gem glowing on chest, Vaijayanti flower garland of five elements, Shrivatsa mark on chest, golden kirita mukut crown with peacock motifs, divine radiance emanating, standing on thousand-headed serpent Shesha, serene yet powerful aura, Indian mythological dark fantasy, cinematic rim lighting, dramatic shadows, ultra-detailed 8K character concept art, realistic silk textures, god-scale majesty",
  'lord vishnu': "Lord Vishnu, supreme preserver deity born from cosmic waters, tall imposing four-armed divine form, deep blue-skinned like infinite ocean, serene meditative eyes with divine calm, holding conch (shankha) emitting cosmic sound, spinning sudarshana chakra of divine order, golden mace (gada) of strength, pink lotus of purity, wearing rich yellow silk pitambar dhoti with golden borders, Kaustubha gem glowing on chest, Vaijayanti flower garland of five elements, Shrivatsa mark on chest, golden kirita mukut crown with peacock motifs, divine radiance emanating, standing on thousand-headed serpent Shesha, serene yet powerful aura, Indian mythological dark fantasy, cinematic rim lighting, dramatic shadows, ultra-detailed 8K character concept art, realistic silk textures, god-scale majesty",
  
  'shiva': "Lord Shiva, supreme destroyer and transformer, ascetic god of Mount Kailash, tall muscular form with ash-smeared skin (vibhuti), third eye of cosmic fire on forehead, blue throat (neelkanth) from drinking halahala poison, matted dreadlocks (jata) with crescent moon and sacred Ganga river flowing, five-headed serpent Vasuki coiled around neck, wearing raw tiger skin dhoti, rudraksha bead malas, holding trishul (trident) crackling with energy, damaru drum creating cosmic rhythm, seated in padmasana or standing in fierce tandava pose, Nandi bull companion nearby, smoky sacred ash aura, Himalayan cave aesthetic, Indian mythological dark fantasy, dramatic chiaroscuro lighting, volumetric fog, ultra-detailed 8K, realistic textures, hyper-real, god-scale",
  'lord shiva': "Lord Shiva, supreme destroyer and transformer, ascetic god of Mount Kailash, tall muscular form with ash-smeared skin (vibhuti), third eye of cosmic fire on forehead, blue throat (neelkanth) from drinking halahala poison, matted dreadlocks (jata) with crescent moon and sacred Ganga river flowing, five-headed serpent Vasuki coiled around neck, wearing raw tiger skin dhoti, rudraksha bead malas, holding trishul (trident) crackling with energy, damaru drum creating cosmic rhythm, seated in padmasana or standing in fierce tandava pose, Nandi bull companion nearby, smoky sacred ash aura, Himalayan cave aesthetic, Indian mythological dark fantasy, dramatic chiaroscuro lighting, volumetric fog, ultra-detailed 8K, realistic textures, hyper-real, god-scale",
  'mahadev': "Lord Shiva as Mahadev, supreme deity of deities, ash-covered muscular form radiating primal power, third eye blazing with cosmic fire, blue-poisoned throat, wild matted jata locks flowing with moon and Ganga, serpent Vasuki as necklace, tiger skin lower garment, trishul planted beside him, damaru in hand, seated in deep meditation on Mount Kailash, snow leopard skin seat, sacred ash floating, transcendent aura, ancient temple aesthetic, Indian mythological dark fantasy, dramatic rim lighting, 8K ultra-detailed, god-scale presence",
  'nataraja': "Lord Shiva as Nataraja, cosmic dancer of creation and destruction, four-armed form performing Tandava dance within ring of sacred fire (prabhamandala), one foot crushing dwarf demon Apasmara (ignorance), other leg raised in graceful bharatanatyam pose, holding damaru drum of creation, agni (fire) of destruction, abhaya mudra blessing, pointed finger to raised foot indicating liberation, matted hair flying with Ganga, crescent moon, serpent, skulls, wearing tiger skin, sacred ash coating, bronze/golden metallic sheen, flames dancing around cosmic circle, Indian mythological art, dramatic lighting, ultra-detailed 8K, hyper-real textures, cinematic",
  
  'brahma': "Lord Brahma, supreme creator of the universe, ancient four-headed deity each facing cardinal direction, four arms holding sacred Vedas (knowledge), lotus (creation), mala prayer beads (time), kamandalu water pot (cosmic waters), long flowing white beard symbolizing eternal wisdom, red-pink silk garments of creation, golden crown on each head, seated majestically on blooming lotus throne, hamsa swan vehicle nearby, radiating creative golden light, sacred Sanskrit letters floating around, temple sanctum aesthetic, Indian mythological fantasy, warm golden lighting, ultra-detailed 8K character concept art, realistic fabric textures, god-scale",
  'lord brahma': "Lord Brahma, supreme creator of the universe, ancient four-headed deity each facing cardinal direction, four arms holding sacred Vedas (knowledge), lotus (creation), mala prayer beads (time), kamandalu water pot (cosmic waters), long flowing white beard symbolizing eternal wisdom, red-pink silk garments of creation, golden crown on each head, seated majestically on blooming lotus throne, hamsa swan vehicle nearby, radiating creative golden light, sacred Sanskrit letters floating around, temple sanctum aesthetic, Indian mythological fantasy, warm golden lighting, ultra-detailed 8K character concept art, realistic fabric textures, god-scale",

  // =====================================================
  // VISHNU AVATARS (Dashavatara)
  // =====================================================
  'matsya': "Lord Matsya, first avatar of Vishnu, colossal divine fish form, upper body of blue-skinned four-armed deity emerging from golden-scaled fish body, holding conch, chakra, mace, lotus, wearing golden crown and ornaments, golden horn on fish head, swimming through cosmic ocean waters, protecting Vedas from demon, ancient primordial aesthetic, underwater divine lighting, deep ocean blues and golds, Indian mythological art, ultra-detailed 8K, hyper-real scales and textures, epic scale",
  'kurma': "Lord Kurma, turtle avatar of Vishnu, massive cosmic tortoise with blue-skinned four-armed deity upper body, holding divine weapons, Mount Mandara resting on shell during Samudra Manthan (ocean churning), serpent Vasuki wrapped around mountain, celestial beings and demons pulling, cosmic ocean churning with emerging treasures, divine resilience aura, Indian mythological epic, dramatic lighting, ultra-detailed 8K, realistic shell and skin textures",
  'varaha': "Lord Varaha, boar avatar of Vishnu, colossal divine boar with blue-skinned humanoid body, fierce tusked boar head with golden crown, four arms holding chakra, conch, mace, lotus, lifting Earth goddess Bhudevi from cosmic waters on tusks, trampling demon Hiranyaksha, primordial muscular form, wet cosmic ocean aesthetic, victory pose, Indian mythological dark fantasy, dramatic rim lighting, ultra-detailed 8K, realistic fur and muscle textures, epic scale",
  'narasimha': "Lord Narasimha, fierce man-lion avatar of Vishnu, terrifying half-lion half-man form bursting from pillar, blue-skinned muscular humanoid body, ferocious lion head with wild golden mane, blazing eyes of righteous fury, fangs bared, claws ripping demon Hiranyakashipu across lap, blood and divine fire, four arms, wearing dhoti and divine ornaments, protecting devotee Prahlada nearby, twilight setting, palace pillar doorway, ugra (fierce) divine energy, Indian mythological horror fantasy, dramatic chiaroscuro, volumetric dust and fire, ultra-detailed 8K, hyper-real fur and muscle textures",
  'lord narasimha': "Lord Narasimha, fierce man-lion avatar of Vishnu, terrifying half-lion half-man form bursting from pillar, blue-skinned muscular humanoid body, ferocious lion head with wild golden mane, blazing eyes of righteous fury, fangs bared, claws ripping demon Hiranyakashipu across lap, blood and divine fire, four arms, wearing dhoti and divine ornaments, protecting devotee Prahlada nearby, twilight setting, palace pillar doorway, ugra (fierce) divine energy, Indian mythological horror fantasy, dramatic chiaroscuro, volumetric dust and fire, ultra-detailed 8K, hyper-real fur and muscle textures",
  'vamana': "Lord Vamana, dwarf brahmin avatar of Vishnu, small stature brahmin boy with blue-tinged divine skin, shaved head with shikha tuft, sacred thread across chest, carrying wooden umbrella and kamandalu water pot, simple dhoti, innocent yet knowing smile, one foot on earth one rising to cosmic heights (Trivikrama form), measuring three worlds from demon king Bali, transformative divine energy, Indian mythological fantasy, warm sunlit aesthetic, ultra-detailed 8K, realistic textures",
  'trivikrama': "Lord Trivikrama, cosmic giant form of Vamana avatar, blue-skinned Vishnu expanded to cosmic proportions, one foot covering Earth, one leg raised covering heavens, three eyes seeing past-present-future, four arms with divine weapons, demon king Bali beneath foot offering head, cosmic scale spanning galaxies, stars and planets as ornaments, divine radiance filling universe, Indian mythological cosmic art, epic scale, ultra-detailed 8K, god-scale majesty",
  'parashurama': "Lord Parashurama, warrior-brahmin avatar of Vishnu, fierce brahmana with muscular battle-hardened body, matted hair and beard of forest hermit, intense wrathful eyes, holding divine axe (parashu) gifted by Shiva crackling with energy, bow and arrows, wearing deer skin and bark garments, rudraksha malas, sacred thread, bare feet, blood of kshatriya warriors on axe, forest ashram background, vengeful yet righteous aura, Indian mythological dark fantasy, dramatic lighting, ultra-detailed 8K, realistic weapon and skin textures",
  
  'rama': "Lord Rama, seventh avatar of Vishnu, ideal dharmic king Maryada Purushottam, blue-skinned divine prince of Ayodhya, handsome noble features with serene warrior expression, tall graceful build, holding Kodanda divine bow and golden arrows in quiver, yellow silk pitambar dhoti with golden borders, royal uttariya shawl, elaborate gold crown (mukut) with peacock and lotus motifs, gem-studded armlets and bracelets, tilak on forehead, calm yet resolute eyes, forest exile aesthetic or Ayodhya palace setting, divine radiance, Indian mythological epic, golden hour lighting, ultra-detailed 8K, realistic silk and gold textures, heroic pose",
  'lord rama': "Lord Rama, seventh avatar of Vishnu, ideal dharmic king Maryada Purushottam, blue-skinned divine prince of Ayodhya, handsome noble features with serene warrior expression, tall graceful build, holding Kodanda divine bow and golden arrows in quiver, yellow silk pitambar dhoti with golden borders, royal uttariya shawl, elaborate gold crown (mukut) with peacock and lotus motifs, gem-studded armlets and bracelets, tilak on forehead, calm yet resolute eyes, forest exile aesthetic or Ayodhya palace setting, divine radiance, Indian mythological epic, golden hour lighting, ultra-detailed 8K, realistic silk and gold textures, heroic pose",
  'shri rama': "Lord Rama, seventh avatar of Vishnu, ideal dharmic king Maryada Purushottam, blue-skinned divine prince of Ayodhya, handsome noble features with serene warrior expression, tall graceful build, holding Kodanda divine bow and golden arrows in quiver, yellow silk pitambar dhoti with golden borders, royal uttariya shawl, elaborate gold crown (mukut) with peacock and lotus motifs, gem-studded armlets and bracelets, tilak on forehead, calm yet resolute eyes, forest exile aesthetic or Ayodhya palace setting, divine radiance, Indian mythological epic, golden hour lighting, ultra-detailed 8K, realistic silk and gold textures, heroic pose",
  
  'krishna': "Lord Krishna, eighth avatar of Vishnu, divine cowherd and cosmic philosopher, enchanting blue-skinned deity with captivating divine beauty, youthful yet eternal features, mesmerizing lotus eyes, playful yet all-knowing smile, peacock feather crown (mor mukut) adorning curly black hair, playing divine flute (bansuri) in tribhanga pose, yellow silk pitambar dhoti, Kaustubha gem on chest, vaijayanti garland, golden ornaments (earrings, armlets, anklets), tilak and chandrika on forehead, Yamuna river and Vrindavan forest backdrop, magical moonlit aesthetic, divine love and cosmic truth aura, Indian mythological fantasy, ethereal lighting, ultra-detailed 8K, realistic textures, enchanting presence",
  'lord krishna': "Lord Krishna, eighth avatar of Vishnu, divine cowherd and cosmic philosopher, enchanting blue-skinned deity with captivating divine beauty, youthful yet eternal features, mesmerizing lotus eyes, playful yet all-knowing smile, peacock feather crown (mor mukut) adorning curly black hair, playing divine flute (bansuri) in tribhanga pose, yellow silk pitambar dhoti, Kaustubha gem on chest, vaijayanti garland, golden ornaments (earrings, armlets, anklets), tilak and chandrika on forehead, Yamuna river and Vrindavan forest backdrop, magical moonlit aesthetic, divine love and cosmic truth aura, Indian mythological fantasy, ethereal lighting, ultra-detailed 8K, realistic textures, enchanting presence",
  'shri krishna': "Lord Krishna, eighth avatar of Vishnu, divine cowherd and cosmic philosopher, enchanting blue-skinned deity with captivating divine beauty, youthful yet eternal features, mesmerizing lotus eyes, playful yet all-knowing smile, peacock feather crown (mor mukut) adorning curly black hair, playing divine flute (bansuri) in tribhanga pose, yellow silk pitambar dhoti, Kaustubha gem on chest, vaijayanti garland, golden ornaments (earrings, armlets, anklets), tilak and chandrika on forehead, Yamuna river and Vrindavan forest backdrop, magical moonlit aesthetic, divine love and cosmic truth aura, Indian mythological fantasy, ethereal lighting, ultra-detailed 8K, realistic textures, enchanting presence",
  'bal krishna': "Bal Krishna, divine child form, adorable chubby blue-skinned baby crawling or stealing butter, innocent mischievous eyes, butter pot in hand or mouth, naked or minimal cloth, peacock feather in curly hair, golden baby jewelry, playful expression, mother Yashoda's home setting, pots and ropes, Vrindavan aesthetic, divine innocence aura, warm maternal lighting, Indian mythological art, ultra-detailed 8K, endearing",
  'vishwarupa': "Lord Krishna Vishwarupa form, cosmic universal form revealed to Arjuna on Kurukshetra battlefield, infinite divine body containing entire universe, countless heads and arms extending into infinity, suns and moons as eyes, galaxies within form, all beings and gods visible within body, terrifying yet magnificent, Arjuna trembling below, cosmic scale beyond comprehension, blazing divine light, Indian mythological cosmic art, mind-bending perspective, ultra-detailed 8K, god-scale infinity",
  
  'balarama': "Lord Balarama, elder brother of Krishna, ploughing deity, fair/white-skinned muscular divine form contrasting Krishna's blue, wearing blue silk garments, serpent Shesha's thousand-headed hood behind him (his true form), carrying heavy plough (hala) and mace (gada), tilak on forehead, golden earrings and ornaments, strong protective warrior expression, Dwarka or Vrindavan setting, agricultural divine energy, Indian mythological art, ultra-detailed 8K, realistic textures",
  
  'kalki': "Lord Kalki, prophesied final avatar of Vishnu, future divine warrior on white horse, brilliant white-skinned or blue-skinned rider, wielding blazing sword Nandaka cutting through darkness, riding divine white horse Devadatta with fiery mane, wearing golden armor and crown, destroying evil at end of Kali Yuga, fiery apocalyptic sky background, meteors and cosmic destruction, righteous fury expression, divine light piercing darkness, Indian mythological dark fantasy, dramatic apocalyptic lighting, ultra-detailed 8K, epic scale, god-scale",

  // =====================================================
  // DEVI / GODDESS FORMS (Shakti)
  // =====================================================
  'durga': "Goddess Durga, supreme warrior deity Mahishasuramardini, fierce yet beautiful ten-armed form riding lion/tiger mount, each hand holding divine weapon (trishul trident, sudarshan chakra, sword, bow, lotus, conch, mace, shield, thunderbolt, snake), glowing red silk saree with golden borders, elaborate golden crown and jewelry, divine feminine power and grace, fierce protective expression with compassionate eyes, killing buffalo demon Mahishasura beneath mount, battle victory aesthetic, divine feminine power, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, goddess-scale majesty",
  'goddess durga': "Goddess Durga, supreme warrior deity Mahishasuramardini, fierce yet beautiful ten-armed form riding lion/tiger mount, each hand holding divine weapon (trishul trident, sudarshan chakra, sword, bow, lotus, conch, mace, shield, thunderbolt, snake), glowing red silk saree with golden borders, elaborate golden crown and jewelry, divine feminine power and grace, fierce protective expression with compassionate eyes, killing buffalo demon Mahishasura beneath mount, battle victory aesthetic, divine feminine power, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, goddess-scale majesty",
  'maa durga': "Goddess Durga, supreme warrior deity Mahishasuramardini, fierce yet beautiful ten-armed form riding lion/tiger mount, each hand holding divine weapon (trishul trident, sudarshan chakra, sword, bow, lotus, conch, mace, shield, thunderbolt, snake), glowing red silk saree with golden borders, elaborate golden crown and jewelry, divine feminine power and grace, fierce protective expression with compassionate eyes, killing buffalo demon Mahishasura beneath mount, battle victory aesthetic, divine feminine power, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, goddess-scale majesty",
  
  'kali': "Goddess Kali, fierce primal form of Shakti, terrifying yet liberating dark blue/black-skinned deity, wild unbound black hair flying, third eye blazing on forehead, blood-red tongue protruding, garland of fifty skulls (mundamala) representing Sanskrit alphabet, skirt of severed demon arms, four arms holding curved sword (khadga), severed demon head dripping blood, skull cup (kapala), blessing gesture abhaya mudra, standing on prone Shiva's chest, cremation ground (shmashana) setting, funeral pyres and jackals, naked or minimal cloth, primal destructive energy, divine feminine rage against evil, Indian mythological horror, dramatic low-key lighting, ultra-detailed 8K, hyper-real textures, terrifying goddess-scale",
  'goddess kali': "Goddess Kali, fierce primal form of Shakti, terrifying yet liberating dark blue/black-skinned deity, wild unbound black hair flying, third eye blazing on forehead, blood-red tongue protruding, garland of fifty skulls (mundamala) representing Sanskrit alphabet, skirt of severed demon arms, four arms holding curved sword (khadga), severed demon head dripping blood, skull cup (kapala), blessing gesture abhaya mudra, standing on prone Shiva's chest, cremation ground (shmashana) setting, funeral pyres and jackals, naked or minimal cloth, primal destructive energy, divine feminine rage against evil, Indian mythological horror, dramatic low-key lighting, ultra-detailed 8K, hyper-real textures, terrifying goddess-scale",
  'mahakali': "Goddess Mahakali, supreme cosmic form of Kali with ten heads and ten arms, each head wearing crown of skulls, weapons in each hand (sword, trident, skull cup, severed head, shield, bell, drum, bow, arrow, mace), standing on two figures representing Shiva's forms, universal destruction aesthetic, cosmic void background with galaxies, ultimate Shakti energy, Indian mythological cosmic horror, ultra-detailed 8K, goddess-scale infinity",
  
  'lakshmi': "Goddess Lakshmi, deity of wealth fortune and prosperity, radiantly beautiful four-armed golden-complexioned form, seated majestically on blooming pink lotus, hands showering golden coins (representing material wealth), holding lotus flowers (spiritual abundance), wearing resplendent red silk saree with heavy gold brocade borders, elaborate gold jewelry (necklaces, armlets, crown, earrings), white elephants Gaja showering water in background, owl vehicle (uluka) nearby, divine beauty and grace, abundance aura, Diwali festival aesthetic, Indian mythological art, warm golden lighting, ultra-detailed 8K, realistic textures, goddess-scale prosperity",
  'goddess lakshmi': "Goddess Lakshmi, deity of wealth fortune and prosperity, radiantly beautiful four-armed golden-complexioned form, seated majestically on blooming pink lotus, hands showering golden coins (representing material wealth), holding lotus flowers (spiritual abundance), wearing resplendent red silk saree with heavy gold brocade borders, elaborate gold jewelry (necklaces, armlets, crown, earrings), white elephants Gaja showering water in background, owl vehicle (uluka) nearby, divine beauty and grace, abundance aura, Diwali festival aesthetic, Indian mythological art, warm golden lighting, ultra-detailed 8K, realistic textures, goddess-scale prosperity",
  'mahalakshmi': "Goddess Mahalakshmi, supreme form with eight arms (Ashta Lakshmi), holding lotus, mace, arrow, book, bowl of nectar, bow, conch, chakra, seated on lotus throne with elephants and coins, embodying all eight forms of prosperity, cosmic wealth energy, Indian mythological art, radiant golden lighting, ultra-detailed 8K",
  
  'saraswati': "Goddess Saraswati, deity of knowledge music and arts, serene beautiful form with fair/white complexion symbolizing purity, four arms playing veena (divine lute) demonstrating mastery of arts, holding sacred Vedic texts (knowledge), crystal prayer beads (meditation), seated gracefully on white lotus or swan, wearing elegant white silk saree with subtle gold borders, minimal yet refined gold jewelry, peacock nearby, swan (hamsa) vehicle, sacred river flowing, scholarly temple setting, creative intellectual aura, pure serene expression, Indian mythological art, soft diffused lighting, ultra-detailed 8K, realistic textures, goddess-scale wisdom",
  'goddess saraswati': "Goddess Saraswati, deity of knowledge music and arts, serene beautiful form with fair/white complexion symbolizing purity, four arms playing veena (divine lute) demonstrating mastery of arts, holding sacred Vedic texts (knowledge), crystal prayer beads (meditation), seated gracefully on white lotus or swan, wearing elegant white silk saree with subtle gold borders, minimal yet refined gold jewelry, peacock nearby, swan (hamsa) vehicle, sacred river flowing, scholarly temple setting, creative intellectual aura, pure serene expression, Indian mythological art, soft diffused lighting, ultra-detailed 8K, realistic textures, goddess-scale wisdom",
  
  'parvati': "Goddess Parvati, divine consort of Shiva, daughter of Himavat (Himalayas), gentle nurturing beautiful form with golden-hued skin, loving maternal yet powerful expression, four arms holding lotus, trident, prayer beads, blessing gesture, wearing green silk saree with gold borders, elaborate gold jewelry, seated beside or with Shiva in Ardhanarishvara union, Mount Kailash Himalayan setting, snow peaks and forests, lions nearby, motherly divine energy, devotion personified, Indian mythological art, soft golden lighting, ultra-detailed 8K, realistic textures, goddess-scale grace",
  'goddess parvati': "Goddess Parvati, divine consort of Shiva, daughter of Himavat (Himalayas), gentle nurturing beautiful form with golden-hued skin, loving maternal yet powerful expression, four arms holding lotus, trident, prayer beads, blessing gesture, wearing green silk saree with gold borders, elaborate gold jewelry, seated beside or with Shiva in Ardhanarishvara union, Mount Kailash Himalayan setting, snow peaks and forests, lions nearby, motherly divine energy, devotion personified, Indian mythological art, soft golden lighting, ultra-detailed 8K, realistic textures, goddess-scale grace",
  
  'radha': "Radha, divine consort of Krishna, embodiment of supreme devotional love, extraordinarily beautiful gopi maiden with golden complexion, large expressive lotus eyes filled with divine love, adorned in blue/golden silk ghagra choli (contrasting Krishna's yellow), elaborate gold jewelry and flower garlands, peacock feather ornaments, standing in tribhanga pose with Krishna, Vrindavan Yamuna river forest setting, moonlit raas leela aesthetic, divine romantic union energy, longing devotion expression, Indian mythological romance, ethereal moonlit lighting, ultra-detailed 8K, realistic textures, divine beauty",
  'radharani': "Radha, divine consort of Krishna, embodiment of supreme devotional love, extraordinarily beautiful gopi maiden with golden complexion, large expressive lotus eyes filled with divine love, adorned in blue/golden silk ghagra choli (contrasting Krishna's yellow), elaborate gold jewelry and flower garlands, peacock feather ornaments, standing in tribhanga pose with Krishna, Vrindavan Yamuna river forest setting, moonlit raas leela aesthetic, divine romantic union energy, longing devotion expression, Indian mythological romance, ethereal moonlit lighting, ultra-detailed 8K, realistic textures, divine beauty",
  
  'sita': "Goddess Sita, incarnation of Lakshmi and consort of Rama, divine princess of Mithila born from earth, epitome of virtue and devotion, extraordinarily beautiful with golden complexion, large lotus eyes, graceful refined features, wearing elegant traditional silk saree (saffron/yellow/green), heavy gold temple jewelry, flower garlands, hair adorned with jasmine flowers, standing with Rama in devotion or alone in Ashoka Vatika grove, Ayodhya palace or Lanka forest setting, gentle steadfast expression, purity and strength personified, Indian mythological epic, warm golden lighting, ultra-detailed 8K, realistic textures, goddess-scale virtue",
  'goddess sita': "Goddess Sita, incarnation of Lakshmi and consort of Rama, divine princess of Mithila born from earth, epitome of virtue and devotion, extraordinarily beautiful with golden complexion, large lotus eyes, graceful refined features, wearing elegant traditional silk saree (saffron/yellow/green), heavy gold temple jewelry, flower garlands, hair adorned with jasmine flowers, standing with Rama in devotion or alone in Ashoka Vatika grove, Ayodhya palace or Lanka forest setting, gentle steadfast expression, purity and strength personified, Indian mythological epic, warm golden lighting, ultra-detailed 8K, realistic textures, goddess-scale virtue",
  
  'draupadi': "Draupadi, fire-born queen of the five Pandavas, Yajnaseni born from sacrificial flames, extraordinarily beautiful dusky complexion like blue lotus, fierce intelligent eyes, flowing unbound black hair (famously never tied after humiliation), wearing royal silk saree with elaborate gold borders, heavy royal jewelry (necklaces, earrings, armlets, maang tikka), commanding regal bearing, dignified yet fierce expression, Hastinapur palace or Kurukshetra setting, righteous anger aura, embodiment of dharmic vengeance and feminine strength, Indian mythological epic, dramatic lighting, ultra-detailed 8K, realistic textures, queen-scale dignity",
  
  'ganga': "Goddess Ganga, sacred river deity, ethereal beautiful form manifesting from flowing water, fair/blue-tinged divine complexion, holding water pot (kalasha), riding Makara (crocodile-like creature), wearing flowing blue-white garments like river rapids, aquatic flowers in hair, divine water cascading around her, descending from heaven through Shiva's locks, Himalayan source or Varanasi ghat setting, purifying divine energy, sacred aquatic aura, Indian mythological art, flowing water lighting effects, ultra-detailed 8K, realistic water textures, goddess-scale flow",
  
  'meenakshi': "Goddess Meenakshi, fish-eyed goddess of Madurai, extraordinarily beautiful warrior princess with green/emerald complexion, large fish-shaped eyes (hence the name), four arms holding parrot, lotus, sword, shield, wearing elaborate South Indian temple jewelry and gold silk saree, elaborate hair adorned with flowers, Madurai Meenakshi temple setting, queen and goddess combined, Tamil devotional aesthetic, Indian mythological art, temple lamp lighting, ultra-detailed 8K, realistic textures, goddess-scale beauty",

  // =====================================================
  // MAJOR DEVAS (Gods)
  // =====================================================
  'ganesha': "Lord Ganesha, elephant-headed remover of obstacles, beloved deity of wisdom and beginnings, portly lovable form with large elephant head, single broken tusk (Ekadanta), small wise eyes with divine knowing, large flapping ears, trunk curved gracefully, four arms holding broken tusk (for writing), modaka sweet (reward of devotion), noose (pasha) to capture difficulties, axe (parashu) to cut attachments, big prosperous belly (containing entire universe), wearing red/yellow silk dhoti, mouse Mushika vehicle nearby, lotus throne or standing pose, temple or doorway threshold setting, auspicious beginning energy, benevolent joyful aura, Indian mythological art, warm festive lighting, ultra-detailed 8K, realistic textures, god-scale blessing",
  'lord ganesha': "Lord Ganesha, elephant-headed remover of obstacles, beloved deity of wisdom and beginnings, portly lovable form with large elephant head, single broken tusk (Ekadanta), small wise eyes with divine knowing, large flapping ears, trunk curved gracefully, four arms holding broken tusk (for writing), modaka sweet (reward of devotion), noose (pasha) to capture difficulties, axe (parashu) to cut attachments, big prosperous belly (containing entire universe), wearing red/yellow silk dhoti, mouse Mushika vehicle nearby, lotus throne or standing pose, temple or doorway threshold setting, auspicious beginning energy, benevolent joyful aura, Indian mythological art, warm festive lighting, ultra-detailed 8K, realistic textures, god-scale blessing",
  'ganapati': "Lord Ganesha, elephant-headed remover of obstacles, beloved deity of wisdom and beginnings, portly lovable form with large elephant head, single broken tusk (Ekadanta), small wise eyes with divine knowing, large flapping ears, trunk curved gracefully, four arms holding broken tusk (for writing), modaka sweet (reward of devotion), noose (pasha) to capture difficulties, axe (parashu) to cut attachments, big prosperous belly (containing entire universe), wearing red/yellow silk dhoti, mouse Mushika vehicle nearby, lotus throne or standing pose, temple or doorway threshold setting, auspicious beginning energy, benevolent joyful aura, Indian mythological art, warm festive lighting, ultra-detailed 8K, realistic textures, god-scale blessing",
  
  'kartikeya': "Lord Kartikeya, god of war and commander of divine armies, also known as Murugan Skanda Subrahmanya, handsome youthful six-faced form (Shanmukha) each representing virtue, twelve arms holding divine spear Vel (his signature weapon), riding resplendent peacock Paravani, wearing red silk garments and golden armor, gem-studded crown on each head, fierce warrior yet divine youthful beauty, leading Deva armies against Tarakasura, South Indian temple or battlefield setting, victorious martial energy, Tamil devotional aesthetic, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, god-scale warrior",
  'murugan': "Lord Kartikeya, god of war and commander of divine armies, also known as Murugan Skanda Subrahmanya, handsome youthful six-faced form (Shanmukha) each representing virtue, twelve arms holding divine spear Vel (his signature weapon), riding resplendent peacock Paravani, wearing red silk garments and golden armor, gem-studded crown on each head, fierce warrior yet divine youthful beauty, leading Deva armies against Tarakasura, South Indian temple or battlefield setting, victorious martial energy, Tamil devotional aesthetic, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, god-scale warrior",
  'skanda': "Lord Kartikeya, god of war and commander of divine armies, also known as Murugan Skanda Subrahmanya, handsome youthful six-faced form (Shanmukha) each representing virtue, twelve arms holding divine spear Vel (his signature weapon), riding resplendent peacock Paravani, wearing red silk garments and golden armor, gem-studded crown on each head, fierce warrior yet divine youthful beauty, leading Deva armies against Tarakasura, South Indian temple or battlefield setting, victorious martial energy, Tamil devotional aesthetic, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, god-scale warrior",
  
  'hanuman': "Lord Hanuman, mighty monkey god and supreme devotee of Rama, divine vanara form with muscular powerful monkey body, face radiating devotion and strength, orange/golden fur-covered skin, long coiling tail, wearing golden crown, minimal loincloth, sacred thread, sandalwood tilak on forehead, heart opened to reveal Rama-Sita within, holding massive mace (gada) or lifting Dronagiri mountain, flying pose across ocean to Lanka, Sundarakanda heroic aesthetic, devoted warrior energy, Indian mythological epic, dynamic action lighting, ultra-detailed 8K, realistic fur and muscle textures, god-scale devotion and strength",
  'lord hanuman': "Lord Hanuman, mighty monkey god and supreme devotee of Rama, divine vanara form with muscular powerful monkey body, face radiating devotion and strength, orange/golden fur-covered skin, long coiling tail, wearing golden crown, minimal loincloth, sacred thread, sandalwood tilak on forehead, heart opened to reveal Rama-Sita within, holding massive mace (gada) or lifting Dronagiri mountain, flying pose across ocean to Lanka, Sundarakanda heroic aesthetic, devoted warrior energy, Indian mythological epic, dynamic action lighting, ultra-detailed 8K, realistic fur and muscle textures, god-scale devotion and strength",
  'bajrangbali': "Lord Hanuman, mighty monkey god and supreme devotee of Rama, divine vanara form with muscular powerful monkey body, face radiating devotion and strength, orange/golden fur-covered skin, long coiling tail, wearing golden crown, minimal loincloth, sacred thread, sandalwood tilak on forehead, heart opened to reveal Rama-Sita within, holding massive mace (gada) or lifting Dronagiri mountain, flying pose across ocean to Lanka, Sundarakanda heroic aesthetic, devoted warrior energy, Indian mythological epic, dynamic action lighting, ultra-detailed 8K, realistic fur and muscle textures, god-scale devotion and strength",
  
  'indra': "Lord Indra, king of Devas and god of thunder rain and heavens, majestic divine warrior sitting on throne or riding white elephant Airavata with four tusks, wielding thunderbolt Vajra crackling with lightning, wearing celestial golden armor and crown, thousand eyes on body, handsome powerful regal bearing, Amaravati heavenly palace or storm clouds setting, rainbows and rain clouds surrounding, king of gods authority aura, Indian mythological epic, dramatic storm lighting with lightning, ultra-detailed 8K, realistic textures, god-scale royalty",
  'lord indra': "Lord Indra, king of Devas and god of thunder rain and heavens, majestic divine warrior sitting on throne or riding white elephant Airavata with four tusks, wielding thunderbolt Vajra crackling with lightning, wearing celestial golden armor and crown, thousand eyes on body, handsome powerful regal bearing, Amaravati heavenly palace or storm clouds setting, rainbows and rain clouds surrounding, king of gods authority aura, Indian mythological epic, dramatic storm lighting with lightning, ultra-detailed 8K, realistic textures, god-scale royalty",
  
  'surya': "Lord Surya, the sun god, radiant divine form with golden/copper complexion glowing like molten gold, riding chariot pulled by seven horses (representing seven days/colors of light), charioteer Aruna in front, holding two lotus flowers, wearing crown radiating sun rays, golden garments blazing with light, illuminating entire sky, rising over eastern mountains or traversing sky dome, life-giving solar energy, Indian mythological art, blazing golden lighting from character, ultra-detailed 8K, realistic light and heat effects, god-scale radiance",
  'lord surya': "Lord Surya, the sun god, radiant divine form with golden/copper complexion glowing like molten gold, riding chariot pulled by seven horses (representing seven days/colors of light), charioteer Aruna in front, holding two lotus flowers, wearing crown radiating sun rays, golden garments blazing with light, illuminating entire sky, rising over eastern mountains or traversing sky dome, life-giving solar energy, Indian mythological art, blazing golden lighting from character, ultra-detailed 8K, realistic light and heat effects, god-scale radiance",
  
  'yama': "Lord Yama, god of death and dharma, judge of the dead, fearsome yet just divine form with dark green/blue complexion, riding black buffalo Mahisha, holding divine mace (gada) and noose (pasha) to catch souls, wearing crown and red garments, stern judging expression yet fair, accompanied by his scribe Chitragupta with records, gates of Yamaloka underworld setting, souls being judged, death and justice aura, Indian mythological dark fantasy, eerie underworld lighting, ultra-detailed 8K, realistic textures, god-scale judgment",
  'yamraj': "Lord Yama, god of death and dharma, judge of the dead, fearsome yet just divine form with dark green/blue complexion, riding black buffalo Mahisha, holding divine mace (gada) and noose (pasha) to catch souls, wearing crown and red garments, stern judging expression yet fair, accompanied by his scribe Chitragupta with records, gates of Yamaloka underworld setting, souls being judged, death and justice aura, Indian mythological dark fantasy, eerie underworld lighting, ultra-detailed 8K, realistic textures, god-scale judgment",

  // =====================================================
  // RAMAYANA CHARACTERS
  // =====================================================
  'lakshmana': "Lakshmana, devoted younger brother of Rama, loyal prince of Ayodhya, handsome fair-complexioned warrior, slightly younger than Rama, wielding bow and arrows, wearing yellow/green silk dhoti, golden crown smaller than Rama's, devoted protective expression, always at Rama's side, forest exile attire or Ayodhya royal attire, faithful shadow energy, Indian mythological epic, golden lighting, ultra-detailed 8K, realistic textures, prince-scale devotion",
  'lakshman': "Lakshmana, devoted younger brother of Rama, loyal prince of Ayodhya, handsome fair-complexioned warrior, slightly younger than Rama, wielding bow and arrows, wearing yellow/green silk dhoti, golden crown smaller than Rama's, devoted protective expression, always at Rama's side, forest exile attire or Ayodhya royal attire, faithful shadow energy, Indian mythological epic, golden lighting, ultra-detailed 8K, realistic textures, prince-scale devotion",
  
  'ravana': "Ravana, ten-headed demon king of Lanka, supreme antagonist, immensely powerful scholarly warrior, ten heads (representing mastery of four Vedas and six Shastras) each with crown and different expression, twenty arms holding various divine weapons (swords, maces, bows, tridents), massive muscular asura form, golden armor and elaborate Lankan jewelry, playing veena (great musician and devotee of Shiva), seated on golden throne in Lanka palace, arrogant genius expression, tragic villain energy combining great power with great flaws, Indian mythological dark fantasy, dramatic villain lighting, ultra-detailed 8K, realistic textures, demon-king scale magnificence",
  'ravan': "Ravana, ten-headed demon king of Lanka, supreme antagonist, immensely powerful scholarly warrior, ten heads (representing mastery of four Vedas and six Shastras) each with crown and different expression, twenty arms holding various divine weapons (swords, maces, bows, tridents), massive muscular asura form, golden armor and elaborate Lankan jewelry, playing veena (great musician and devotee of Shiva), seated on golden throne in Lanka palace, arrogant genius expression, tragic villain energy combining great power with great flaws, Indian mythological dark fantasy, dramatic villain lighting, ultra-detailed 8K, realistic textures, demon-king scale magnificence",
  
  'kumbhakarna': "Kumbhakarna, giant brother of Ravana, colossal demon warrior of Lanka, mountain-sized sleeping giant form, massive muscular asura body, single head with drowsy yet fierce expression, huge teeth and angry eyes when awakened, wielding enormous mace, wearing minimal armor, awakened from six-month sleep to fight in war, Lanka battlefield or sleeping chamber setting, tragically honorable warrior energy, Indian mythological dark fantasy, epic scale lighting, ultra-detailed 8K, realistic textures, giant-scale enormity",
  
  'meghanada': "Indrajit (Meghanada), son of Ravana, conqueror of Indra, greatest warrior of Lanka, handsome powerful demon prince, wielding divine weapons including Brahmastra, riding chariot through clouds invisible, wearing golden Lankan armor and crown, fierce arrogant warrior expression, Lanka battlefield or palace setting, undefeatable warrior energy until final battle with Lakshmana, Indian mythological dark fantasy, dramatic cloud and battle lighting, ultra-detailed 8K, realistic textures, prince-scale power",
  'indrajit': "Indrajit (Meghanada), son of Ravana, conqueror of Indra, greatest warrior of Lanka, handsome powerful demon prince, wielding divine weapons including Brahmastra, riding chariot through clouds invisible, wearing golden Lankan armor and crown, fierce arrogant warrior expression, Lanka battlefield or palace setting, undefeatable warrior energy until final battle with Lakshmana, Indian mythological dark fantasy, dramatic cloud and battle lighting, ultra-detailed 8K, realistic textures, prince-scale power",
  
  'jatayu': "Jatayu, divine vulture king, noble giant bird hero, enormous vulture with eagle-like majesty, golden-brown feathers, wise ancient eyes, wielding talons against Ravana's chariot to save Sita, mortally wounded and lying before Rama, friend of King Dasharatha, heroic sacrifice aesthetic, Indian mythological epic, dramatic dying hero lighting, ultra-detailed 8K, realistic feather and blood textures, heroic-scale nobility",
  
  'sugriva': "Sugriva, king of Vanaras at Kishkindha, monkey king allied with Rama, golden-furred vanara with crown, muscular warrior monkey form, grateful and loyal expression, jungle palace or battlefield setting, ally and friend energy, Indian mythological epic, forest lighting, ultra-detailed 8K, realistic fur textures, king-scale authority",

  // =====================================================
  // MAHABHARATA CHARACTERS
  // =====================================================
  'arjuna': "Arjuna, greatest archer and third Pandava, Savyasachi (ambidextrous), Vijaya (ever victorious), handsome divine-blessed warrior with fair complexion, wielding legendary bow Gandiva gifted by Agni, divine quiver Akshaya with inexhaustible arrows, wearing warrior armor over fine dhoti, golden earrings Kundala, crown and armlets, focused determined eyes, Kurukshetra chariot with Krishna as charioteer, or receiving Gita wisdom, master archer energy, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, hero-scale perfection",
  'arjun': "Arjuna, greatest archer and third Pandava, Savyasachi (ambidextrous), Vijaya (ever victorious), handsome divine-blessed warrior with fair complexion, wielding legendary bow Gandiva gifted by Agni, divine quiver Akshaya with inexhaustible arrows, wearing warrior armor over fine dhoti, golden earrings Kundala, crown and armlets, focused determined eyes, Kurukshetra chariot with Krishna as charioteer, or receiving Gita wisdom, master archer energy, Indian mythological epic, dramatic battle lighting, ultra-detailed 8K, realistic textures, hero-scale perfection",
  
  'bhima': "Bhima, second Pandava of terrifying strength, Vrikodara (wolf-bellied), massive muscular warrior form towering over others, dark complexion like thundercloud, fierce hungry eyes, wielding enormous mace (gada), minimal armor trusting in raw power, wild hair, killing pose crushing Dushasana or wrestling Jarasandha, Kurukshetra battlefield or forest setting, unstoppable fury and appetites energy, Indian mythological epic, dramatic powerful lighting, ultra-detailed 8K, realistic muscle textures, giant-warrior scale",
  'bheem': "Bhima, second Pandava of terrifying strength, Vrikodara (wolf-bellied), massive muscular warrior form towering over others, dark complexion like thundercloud, fierce hungry eyes, wielding enormous mace (gada), minimal armor trusting in raw power, wild hair, killing pose crushing Dushasana or wrestling Jarasandha, Kurukshetra battlefield or forest setting, unstoppable fury and appetites energy, Indian mythological epic, dramatic powerful lighting, ultra-detailed 8K, realistic muscle textures, giant-warrior scale",
  
  'yudhishthira': "Yudhishthira, eldest Pandava, Dharmaraj (lord of righteousness), noble dignified king with fair complexion, calm wise eyes showing inner turmoil, wearing white royal attire and simple crown, wielding spear, reluctant warrior on chariot, gambling hall or Kurukshetra setting, righteous yet flawed by gambling addiction energy, embodiment of dharmic conflict, Indian mythological epic, somber noble lighting, ultra-detailed 8K, realistic textures, king-scale dignity",
  
  'karna': "Karna, tragic hero and secret eldest Pandava, Suryaputra (son of sun god), radiant fair warrior with sun-like glow, born with golden armor Kavacha fused to skin and golden earrings Kundala (later donated to Indra), wielding bow Vijaya, charitable generous expression, Kurukshetra chariot as general of Kaurava army, facing Arjuna or donating to brahmin, tragic greatness energy, noble birth hidden in low caste life, Indian mythological dark tragedy, dramatic sun-touched lighting, ultra-detailed 8K, realistic golden armor textures, hero-scale tragedy",
  'suryaputra karna': "Karna, tragic hero and secret eldest Pandava, Suryaputra (son of sun god), radiant fair warrior with sun-like glow, born with golden armor Kavacha fused to skin and golden earrings Kundala (later donated to Indra), wielding bow Vijaya, charitable generous expression, Kurukshetra chariot as general of Kaurava army, facing Arjuna or donating to brahmin, tragic greatness energy, noble birth hidden in low caste life, Indian mythological dark tragedy, dramatic sun-touched lighting, ultra-detailed 8K, realistic golden armor textures, hero-scale tragedy",
  
  'duryodhana': "Duryodhana, crown prince of Kauravas, primary antagonist, powerful arrogant prince with dark commanding presence, master of mace warfare, wearing royal armor and elaborate crown, muscular warrior form, seated on throne or battling Bhima, Hastinapur palace or Kurukshetra setting, entitled jealous rage expression, villainy born of perceived injustice energy, Indian mythological dark drama, dramatic villain lighting, ultra-detailed 8K, realistic textures, prince-scale entitlement",
  
  'dronacharya': "Dronacharya, supreme martial teacher of Pandavas and Kauravas, brahmin warrior with aged dignified bearing, wise eyes with moral complexity, wielding divine weapons as teacher, wearing brahmin thread and warrior attire, reluctantly fighting for Kauravas, training ground or Kurukshetra setting, conflicted loyalty and pride energy, Indian mythological epic, aged wisdom lighting, ultra-detailed 8K, realistic textures, guru-scale mastery",
  'drona': "Dronacharya, supreme martial teacher of Pandavas and Kauravas, brahmin warrior with aged dignified bearing, wise eyes with moral complexity, wielding divine weapons as teacher, wearing brahmin thread and warrior attire, reluctantly fighting for Kauravas, training ground or Kurukshetra setting, conflicted loyalty and pride energy, Indian mythological epic, aged wisdom lighting, ultra-detailed 8K, realistic textures, guru-scale mastery",
  
  'bhishma': "Bhishma, grandsire patriarch of both Pandavas and Kauravas, Devavrata who took terrible vow of celibacy, ancient powerful warrior with white hair and beard yet youthful divine body (blessed with death by choice), lying on bed of arrows (Sharashayya) on Kurukshetra, or fighting with bow, wearing white royal warrior attire, tragic devotion to throne expression, embodiment of duty over desire energy, Indian mythological epic, tragic somber lighting, ultra-detailed 8K, realistic arrow bed textures, patriarch-scale sacrifice",
  'bhishma pitamah': "Bhishma, grandsire patriarch of both Pandavas and Kauravas, Devavrata who took terrible vow of celibacy, ancient powerful warrior with white hair and beard yet youthful divine body (blessed with death by choice), lying on bed of arrows (Sharashayya) on Kurukshetra, or fighting with bow, wearing white royal warrior attire, tragic devotion to throne expression, embodiment of duty over desire energy, Indian mythological epic, tragic somber lighting, ultra-detailed 8K, realistic arrow bed textures, patriarch-scale sacrifice",
  
  'abhimanyu': "Abhimanyu, teenage hero son of Arjuna, learned Chakravyuha penetration from womb, handsome brave youth wielding chariot wheel as final weapon, surrounded by Kaurava maharathis in deadly formation, tragic heroic last stand, Kurukshetra battlefield setting, doomed heroic youth energy, Indian mythological tragedy, dramatic death lighting, ultra-detailed 8K, realistic textures, tragic hero-scale",

  // =====================================================
  // SAGES AND RISHIS
  // =====================================================
  'narada': "Narada Muni, divine messenger and cosmic troublemaker, eternal wandering sage, lean ascetic form with topknot, holding veena (ektara) singing 'Narayana Narayana', wearing simple saffron robes, mischievous wise smile, flying through cosmic realms or walking in celestial courts, divine gossip who triggers cosmic events energy, Indian mythological art, ethereal traveling lighting, ultra-detailed 8K, realistic textures",
  'narad muni': "Narada Muni, divine messenger and cosmic troublemaker, eternal wandering sage, lean ascetic form with topknot, holding veena (ektara) singing 'Narayana Narayana', wearing simple saffron robes, mischievous wise smile, flying through cosmic realms or walking in celestial courts, divine gossip who triggers cosmic events energy, Indian mythological art, ethereal traveling lighting, ultra-detailed 8K, realistic textures",
  
  'vishwamitra': "Vishwamitra, royal sage who became brahmarshi through tapas, intense fiery-eyed sage with long matted hair, muscular ascetic body from warrior past, holding staff, wearing bark and deerskin, teaching Rama and Lakshmana divine weapons, forest ashram or confronting Vashishtha setting, fierce determination to transcend caste energy, Indian mythological epic, intense tapas lighting, ultra-detailed 8K, realistic textures, sage-scale power",
  
  'vyasa': "Vyasa, author of Mahabharata and compiler of Vedas, ancient dark-complexioned sage Krishna Dvaipayana, long matted hair and beard, intense all-knowing eyes seeing past-present-future, dictating Mahabharata to Ganesha, or meditating with cosmic visions, mountain cave or river bank setting, cosmic knowledge reservoir energy, Indian mythological art, prophetic vision lighting, ultra-detailed 8K, realistic textures, sage-scale omniscience",
  'ved vyasa': "Vyasa, author of Mahabharata and compiler of Vedas, ancient dark-complexioned sage Krishna Dvaipayana, long matted hair and beard, intense all-knowing eyes seeing past-present-future, dictating Mahabharata to Ganesha, or meditating with cosmic visions, mountain cave or river bank setting, cosmic knowledge reservoir energy, Indian mythological art, prophetic vision lighting, ultra-detailed 8K, realistic textures, sage-scale omniscience",

  // =====================================================
  // SINS AND ABSTRACT PERSONIFICATIONS (PAAP PURUSHA)
  // =====================================================
  'brahmahatya': "Brahmahatya, terrifying personification of the sin of killing a Brahmin, ghastly feminine form born from Indra's sin of slaying Vritra, emaciated skeletal body with rotting gray-green flesh, hollow sunken eyes weeping blood, matted filthy hair like corpse, wearing tattered funeral shrouds and garlands of withered flowers, clawed hands reaching for sinners, surrounded by miasma of death and decay, pustules and wounds covering body, aura of inescapable guilt and karmic horror, Naraka (hell) or haunting the living setting, absolute dread and karmic punishment energy, Indian mythological dark horror, sickly green-black hellish lighting, ultra-detailed 8K, realistic decay and horror textures, sin-personification scale terror",
  'brahmatya': "Brahmahatya, terrifying personification of the sin of killing a Brahmin, ghastly feminine form born from Indra's sin of slaying Vritra, emaciated skeletal body with rotting gray-green flesh, hollow sunken eyes weeping blood, matted filthy hair like corpse, wearing tattered funeral shrouds and garlands of withered flowers, clawed hands reaching for sinners, surrounded by miasma of death and decay, pustules and wounds covering body, aura of inescapable guilt and karmic horror, Naraka (hell) or haunting the living setting, absolute dread and karmic punishment energy, Indian mythological dark horror, sickly green-black hellish lighting, ultra-detailed 8K, realistic decay and horror textures, sin-personification scale terror",
  
  'kali_yuga': "Kali (Demon of Kali Yuga), terrifying personification of the darkest age, massive dark demonic form with multiple heads representing corruption, bloodshot malevolent eyes, black smoke emanating from body, wearing necklace of skulls and bones, carrying dice (gambling) and broken weapons, spreading adharma and chaos wherever he treads, burning cities and moral decay in background, aura of societal collapse and spiritual darkness, Kali Yuga apocalyptic wasteland setting, ultimate corruption and age of darkness energy, Indian mythological dark fantasy, apocalyptic red-black lighting, ultra-detailed 8K, realistic corruption textures, demon-age scale malevolence",
  
  'alakshmi': "Alakshmi (Jyeshtha), goddess of misfortune and elder sister of Lakshmi, gaunt elderly feminine form with sagging features, owl-like appearance with hooked nose, wearing dark tattered clothes, riding donkey or crow, carrying broom to sweep away prosperity, lingering near gambling dens and places of vice, aura of poverty, strife, and bad luck, slum or ruined household setting, misfortune and poverty personified energy, Indian mythological dark art, dim gloomy lighting, ultra-detailed 8K, realistic aged and worn textures",
  
  'mrityu': "Mrityu, personification of Death itself, skeletal or emaciated dark form with hollow eye sockets burning with cold fire, wearing garland of souls, carrying noose (pasha) to capture dying souls, riding black buffalo or walking with inexorable pace, Yama's realm or deathbed setting, inevitable mortality and cosmic order energy, Indian mythological dark fantasy, cold deathly lighting, ultra-detailed 8K, realistic skeletal textures, death-personification scale presence",
  
  'kama': "Kama (Kamadeva), god of desire and love, extraordinarily handsome youthful form with golden-red complexion, wielding sugarcane bow with bowstring of bees, flower-tipped arrows of desire, riding parrot or makara, being burned by Shiva's third eye or spreading love, spring garden or divine court setting, irresistible desire and romantic passion energy, Indian mythological fantasy, warm romantic golden lighting, ultra-detailed 8K, realistic textures, love-god scale beauty",
  
  'krodha': "Krodha, personification of Anger (one of Arishadvargas - six enemies), fierce red-skinned demonic form with bulging veins and bloodshot eyes, steam rising from body, clenched fists and bared teeth, surrounded by flames of rage, chains of karma binding, aura of destructive uncontrollable fury, battlefield or domestic strife setting, all-consuming rage and self-destruction energy, Indian mythological dark art, fiery red lighting, ultra-detailed 8K, realistic rage textures",
  
  'lobha': "Lobha, personification of Greed (Arishadvargas), bloated grotesque form with multiple grasping hands, golden jewelry covering every surface, bulging eyes reflecting coins and treasures, hoarding mountains of gold while starving, bottomless pit stomach, surrounded by treasures but eternally unsatisfied, treasury or merchant's den setting, insatiable greed and material obsession energy, Indian mythological dark fantasy, golden corrupt lighting, ultra-detailed 8K, realistic textures",
  
  'moha': "Moha, personification of Delusion/Attachment (Arishadvargas), hypnotic swirling form with faces that shift between loved ones, web-like tendrils of attachment binding victims, eyes like deep whirlpools, wearing garments that shimmer between reality and illusion, creating mirages of desire, maya-filled dreamscape setting, delusion and attachment trap energy, Indian mythological surreal art, hazy dreamlike lighting, ultra-detailed 8K, realistic illusion textures",
  
  'mada': "Mada, personification of Pride/Arrogance (Arishadvargas), towering imperious form with crown touching clouds, looking down with utter contempt, elaborately overdressed, standing on crushed opponents, refusing to bow even to gods, palatial throne setting with broken idols, destructive pride and narcissistic delusion energy, Indian mythological dark fantasy, harsh overhead lighting, ultra-detailed 8K, realistic regal corrupt textures",
  
  'matsarya': "Matsarya, personification of Jealousy/Envy (Arishadvargas), sickly green-tinged form with eyes fixed on others' possessions, emaciated despite abundance around, claws scratching at what belongs to others, venomous expression, surrounded by rotting versions of desired objects, aura of corrosive envy, competitive arena or household setting, poisonous jealousy and bitter envy energy, Indian mythological dark art, sickly green lighting, ultra-detailed 8K, realistic envious textures",
  
  'papa': "Papa Purusha, universal personification of all Sin, horrific amalgamation form combining aspects of all sins, multiple grotesque faces representing different transgressions, body covered in inscriptions of misdeeds, being burned away by Ekadashi vrata or prayers, chains of karma binding limbs, Naraka hell realm or within human heart setting, accumulated sin and karmic burden energy, Indian mythological dark horror, infernal lighting, ultra-detailed 8K, realistic horror textures, sin-incarnate scale terror",

  // =====================================================
  // DEMONS AND ASURAS
  // =====================================================
  'hiranyakashipu': "Hiranyakashipu, invincible demon king father of Prahlada, golden-armored massive asura form, arrogant cruel expression, elaborate demonic crown, wielding golden mace, demanding worship as god, golden Lanka-like palace or being torn apart by Narasimha setting, boon-granted invincibility hubris energy, Indian mythological dark fantasy, dramatic villain lighting, ultra-detailed 8K, realistic textures, demon-king scale arrogance",
  
  'mahishasura': "Mahishasura, buffalo demon king defeated by Durga, massive buffalo-headed asura form or shapeshifting between buffalo and warrior, powerful muscular form, wielding battle axe, being killed by Durga's trident, battlefield with Devi army setting, proud unstoppable power meeting divine feminine energy, Indian mythological dark fantasy, battle lighting, ultra-detailed 8K, realistic textures, demon-scale power",

  // =====================================================
  // CELESTIAL BEINGS
  // =====================================================
  'apsara': "Apsara, celestial nymph of Indra's court, extraordinarily beautiful divine dancer, ethereal grace and sensuality, wearing transparent celestial silks and elaborate gold jewelry, dancing in heavenly gardens or seducing sages, Indra's Swarga palace or earthly forest setting, divine seduction and artistic perfection energy, Indian mythological fantasy, ethereal heavenly lighting, ultra-detailed 8K, realistic textures, celestial beauty",
  
  'garuda': "Garuda, divine eagle vehicle of Vishnu, enormous golden eagle-like bird with human-like face, massive wings spanning horizons, carrying Vishnu or fighting Nagas, golden feathers blazing, enemy of serpents, sky or Vaikuntha setting, divine swift power energy, Indian mythological art, soaring golden lighting, ultra-detailed 8K, realistic feather textures, divine bird-scale majesty",
  
  'naga': "Naga, serpent deity, divine cobra with multiple hoods or half-human half-serpent form, crown of jewels, coiled around treasures or in underwater palace Patala, cobra hood with divine markings, serpentine wisdom and treasure guardian energy, Indian mythological fantasy, underwater jeweled lighting, ultra-detailed 8K, realistic scale textures",
  'vasuki': "Vasuki, king of Nagas worn by Shiva, enormous divine serpent with thousand jeweled hoods, used as rope in Samudra Manthan ocean churning, coiled around Mount Mandara or Shiva's neck, cosmic serpent king energy, Indian mythological epic, divine serpentine lighting, ultra-detailed 8K, realistic scale textures, serpent-king scale majesty",
  'shesha': "Shesha (Ananta), infinite serpent who supports universe and serves as Vishnu's bed, enormous multi-headed cobra with countless hoods, Vishnu reclining on coils in cosmic ocean, cosmic foundation energy, Indian mythological cosmic art, underwater cosmic lighting, ultra-detailed 8K, realistic textures, infinity-scale serpent",

  // =====================================================
  // OTHER WORLD MYTHOLOGY (Keep existing for reference)
  // =====================================================
  // Greek Mythology
  'zeus': "Zeus, king of Greek gods, muscular mature male deity, white toga, golden laurel wreath, wielding lightning bolt, majestic beard, thundercloud throne, eagle companion, divine authority, Greek mythological art, dramatic storm lighting, ultra-detailed 8K",
  'poseidon': "Poseidon, god of seas, wielding trident, sea-green robes, flowing beard, muscular aquatic deity, dolphins and horses, ocean wave aesthetic, Greek mythological art, underwater lighting, ultra-detailed 8K",
  'athena': "Athena, goddess of wisdom and war, golden Corinthian helmet, aegis shield with Medusa head, spear, Greek peplos dress, owl companion, strategic warrior goddess, Greek mythological art, strategic lighting, ultra-detailed 8K",
  'apollo': "Apollo, god of sun and music, youthful handsome deity, golden laurel crown, holding lyre, radiant sun aura, white toga, archery equipment, Greek mythological art, radiant golden lighting, ultra-detailed 8K",
  'hercules': "Hercules, divine hero, immense muscular form, lion skin cloak, wooden club, mortal-divine hybrid, legendary strength, Greek warrior aesthetic, Greek mythological art, heroic lighting, ultra-detailed 8K",
  
  // Egyptian Mythology  
  'ra': "Ra, Egyptian sun god, falcon head with sun disk crown, golden armor, holding ankh and was-scepter, solar boat, hieroglyphic aesthetic, Egyptian mythological art, blazing solar lighting, ultra-detailed 8K",
  'anubis': "Anubis, jackal-headed god of death, black jackal head, golden Egyptian collar and skirt, holding scales of judgment, underworld guide, Egyptian mythological art, underworld lighting, ultra-detailed 8K",
  'isis': "Isis, Egyptian goddess of magic, throne headdress, elegant Egyptian robes, golden jewelry, holding ankh, protective wings, Egyptian mythological art, mystical lighting, ultra-detailed 8K",
  
  // Norse Mythology
  'odin': "Odin, Norse All-Father, one-eyed elder god, long grey beard, horned or winged helmet, spear Gungnir, raven companions Huginn and Muninn, wolf companions, Norse mythological art, dramatic Nordic lighting, ultra-detailed 8K",
  'thor': "Thor, Norse thunder god, red beard, winged helmet, wielding hammer Mjolnir, chain mail and leather armor, thunderstorm background, muscular warrior, Norse mythological art, storm lightning, ultra-detailed 8K",
  'loki': "Loki, Norse trickster god, shapeshifter, green and gold robes, horned helmet, mischievous cunning expression, slender form, Norse mythological art, trickster dramatic lighting, ultra-detailed 8K",
};

// Concept type prefixes for isolated asset generation (ULTRA HIGH RESOLUTION)
// CRITICAL: These ensure the AI generates the ASSET ONLY in 8K quality, not scenes/storyboards
// Formula: Subject + Origin/Lore + Physical Traits + Materials/Textures + Mood/Aura + Lighting + Style + Camera + Detail Level
const TYPE_PREFIXES: Record<string, string> = {
  environment: "Production environment design sheet, single location architectural reference, establishing composition, set design quality, clean rendering, NO characters, NO action, spatial layout focus,",
  character: "Production character design sheet, single character on neutral grey studio background, full body centered, clean even studio lighting, NO dramatic shadows, NO scene context, NO other characters, design reference for 3D modelers,",
  costume: "Production costume design sheet, garment design reference, fabric and material details visible, clean white background, studio lighting, construction-ready detail level,",
  prop: "Production prop design sheet, single object study on clean white background, product-visualization quality, material detail showcase, multiple angle callouts, NO scene context, NO hands, NO characters,",
  set_architecture: "Production architectural design reference, set construction blueprint, single structure focus, scale reference included, material and construction details, NO characters,",
  vehicle: "Production vehicle design sheet, orthographic presentation, industrial design reference, clean background, material differentiation, NO characters, NO action,",
  creature: "Production creature design sheet, anatomy reference on neutral background, muscle and skin texture detail, biology reference quality, clean studio lighting,",
  fx_concept: "Production VFX element design reference, isolated effect visualization, particle and energy system concept, clean dark background,",
  facial_turnaround: "CRITICAL: Generate EXACTLY ONE SINGLE FACE per image. DO NOT create multiple heads, turnaround sheets, collages, or grid layouts. ONE HEAD ONLY. Must be COMPLETELY BALD. FORBIDDEN: multiple faces, hair, crown, helmet, jewelry. REQUIRED: Single bald head, extreme skin texture, neutral gray background. 3D sculpting reference.",
};

// Isolated asset modifiers - CRITICAL for ensuring focused asset generation
const ISOLATED_ASSET_MODIFIERS: Record<string, string> = {
  character: "Generate ONLY the single character isolated on neutral grey studio background. This is a production character design sheet - show design details, costume construction, and form. NOT a scene illustration or dramatic artwork.",
  prop: "Generate ONLY the single prop/object on clean white background. Show material details and construction. Multiple angle callouts preferred. This is a production prop reference sheet.",
  costume: "Generate ONLY the costume design. Show fabric construction, materials, accessories on mannequin or flat-lay. Clean white background. Production wardrobe reference.",
  environment: "Generate ONLY the environment as an architectural design reference. Focus on spatial layout, architecture, materials. May include small scale figures. Production set design reference.",
  creature: "Generate ONLY the creature design on neutral background. Show anatomy, proportions, skin/scale detail. Production creature design sheet for VFX team.",
  vehicle: "Generate ONLY the vehicle design. Orthographic presentation with material details. Production vehicle design reference.",
  facial_turnaround: "EXACTLY ONE SINGLE HEAD - not multiple heads, not a collage. ONE FACE ONLY. COMPLETELY BALD. Neutral gray background. 3D sculpting reference.",
};

// What-If variation modifiers
const WHATIF_MODIFIERS: Record<string, (params: Record<string, unknown>) => string> = {
  lighting: (p) => `${p.lightingType || 'dramatic'} lighting, ${p.intensity || 'high contrast'}`,
  time_of_day: (p) => `${p.time || 'golden hour'} atmosphere, ${p.time === 'night' ? 'moonlit, nocturnal' : 'sunlit'}`,
  weather: (p) => `${p.weather || 'rain'}, atmospheric ${p.weather}, wet surfaces, ${p.weather === 'rain' ? 'reflections on wet ground' : ''}`,
  genre: (p) => {
    const genres: Record<string, string> = {
      cyberpunk: "cyberpunk aesthetic, neon lights, high-tech low-life, blade runner inspired",
      noir: "film noir, high contrast shadows, venetian blinds lighting, 1940s atmosphere",
      horror: "horror atmosphere, unsettling, dark shadows, tension, dread",
      fantasy: "high fantasy, magical, ethereal lighting, enchanted",
      scifi: "science fiction, futuristic, sleek technology, space age",
    };
    return genres[p.genre as string] || genres.cyberpunk;
  },
  camera: (p) => {
    const angles: Record<string, string> = {
      low: "low angle shot, heroic perspective, looking up",
      high: "high angle shot, birds eye, overhead perspective",
      dutch: "dutch angle, tilted frame, dynamic tension",
      wideangle: "wide angle lens, distorted perspective, expansive view",
      closeup: "extreme close-up, intimate detail, macro perspective",
    };
    return angles[p.angle as string] || angles.low;
  },
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

function generateTechnicalSpecs(sceneContext: ConceptRequest['sceneContext']): {
  camera: { type: string; lens: string; movement: string; angle: string };
  lighting: { keyLight: string; intensity: string; mood: string; practicals: string[] };
} {
  const description = (sceneContext?.description || '').toLowerCase();
  const timeOfDay = sceneContext?.timeOfDay || 'day';
  const location = (sceneContext?.location || '').toLowerCase();
  
  // Camera recommendations based on scene analysis
  let cameraType = 'ARRI Alexa';
  let lens = '35mm prime';
  let movement = 'Static or subtle dolly';
  let angle = 'Eye level';
  
  // Analyze for camera type
  if (description.includes('action') || description.includes('chase') || description.includes('fight')) {
    cameraType = 'RED Komodo (handheld)';
    lens = '24mm wide angle';
    movement = 'Handheld with gimbal stabilization';
    angle = 'Dynamic, following action';
  } else if (description.includes('intimate') || description.includes('conversation') || description.includes('dialogue')) {
    cameraType = 'ARRI Alexa Mini';
    lens = '85mm portrait';
    movement = 'Static with subtle push-in';
    angle = 'Eye level, over-shoulder coverage';
  } else if (location.includes('ext') || description.includes('landscape') || description.includes('establishing')) {
    cameraType = 'ARRI Alexa LF';
    lens = '21mm ultra wide';
    movement = 'Slow crane or drone';
    angle = 'Wide establishing, high angle';
  } else if (description.includes('tense') || description.includes('suspense')) {
    cameraType = 'ARRI Alexa';
    lens = '50mm standard';
    movement = 'Slow tracking, deliberate';
    angle = 'Low angle for tension';
  }
  
  // Lighting recommendations based on scene
  let keyLight = 'Soft natural light';
  let intensity = 'Medium (balanced exposure)';
  let mood = 'Neutral';
  const practicals: string[] = [];
  
  // Time of day lighting
  if (timeOfDay === 'night') {
    keyLight = 'Tungsten key with blue fill';
    intensity = 'Low (high contrast, deep shadows)';
    mood = 'Moody, mysterious';
    practicals.push('Street lamps', 'Window light', 'Neon signs');
  } else if (timeOfDay === 'dawn' || timeOfDay === 'dusk') {
    keyLight = 'Warm golden hour light';
    intensity = 'Medium-low (soft, directional)';
    mood = 'Romantic, nostalgic';
    practicals.push('Practical lamps if interior');
  } else if (timeOfDay === 'day') {
    keyLight = 'Daylight HMI through diffusion';
    intensity = 'Medium-high (bright, open)';
    mood = 'Natural, clean';
  }
  
  // Scene-specific lighting adjustments
  if (description.includes('horror') || description.includes('scary')) {
    keyLight = 'Hard underlighting or sidelighting';
    intensity = 'Low (extreme contrast)';
    mood = 'Unsettling, dread';
    practicals.push('Flickering candles', 'Single bare bulb');
  } else if (description.includes('romantic') || description.includes('love')) {
    keyLight = 'Soft wraparound light';
    intensity = 'Medium (flattering)';
    mood = 'Warm, intimate';
    practicals.push('Candles', 'String lights');
  } else if (description.includes('action') || description.includes('battle')) {
    keyLight = 'High contrast, motivated sources';
    intensity = 'Variable (dynamic)';
    mood = 'Intense, energetic';
    practicals.push('Explosions', 'Muzzle flashes', 'Fire');
  }
  
  // Location-based practicals
  if (location.includes('office') || location.includes('hospital')) {
    practicals.push('Fluorescent overheads', 'Computer screens');
  } else if (location.includes('bar') || location.includes('club')) {
    practicals.push('Neon signs', 'Colored gels', 'Disco lights');
  } else if (location.includes('home') || location.includes('house')) {
    practicals.push('Table lamps', 'TV glow', 'Kitchen lights');
  }
  
  return {
    camera: { type: cameraType, lens, movement, angle },
    lighting: { keyLight, intensity, mood, practicals: practicals.slice(0, 4) },
  };
}

function buildIntelligentPrompt(request: ConceptRequest, scriptContext?: ScriptContext, creativeContext?: CreativeContextRules): string {
  const parts: string[] = [];
  
  // STEP 0: PRODUCTION DESIGN INTELLIGENCE - Build visual bible context FIRST
  const projectGenre = scriptContext?.projectGenre?.toLowerCase() || request.directorVision?.genre?.toLowerCase();
  const productionDesignIntel = buildProductionDesignIntelligence(scriptContext, creativeContext, projectGenre);
  if (productionDesignIntel) {
    parts.push(productionDesignIntel);
  }
  
  // STEP 0.5: CONCEPT SHEET COMPOSITION RULES - Enforce structured layout
  const conceptSheetType = request.subjectFocus?.type || request.conceptType || 'character';
  const sheetComposition = CONCEPT_SHEET_COMPOSITION[conceptSheetType as keyof typeof CONCEPT_SHEET_COMPOSITION] 
    || CONCEPT_SHEET_COMPOSITION.character;
  parts.push(sheetComposition);

  
  // PRIORITY 1: Apply Creative Context Rules FIRST as primary production canon
  // These are director-approved guidelines that must inform all generations
  // Character backstory rules are the HIGHEST priority for character generation
  if (creativeContext) {
    // For character generation, apply character backstory rules FIRST
    if ((request.conceptType === 'character' || request.subjectFocus?.type === 'character') && 
        creativeContext.characterRules.length > 0) {
      // Find rules matching the character name if specified
      const charName = request.subjectFocus?.name?.toLowerCase() || '';
      
      // Get ALL matching rules for this character - backstory is PRIMARY reference
      const matchingRules = creativeContext.characterRules.filter(r => 
        r.title.toLowerCase().includes(charName) || 
        r.description.toLowerCase().includes(charName)
      );
      
      if (matchingRules.length > 0) {
        // Apply up to 5 character-specific rules as PRIMARY reference
        const charDetails = matchingRules.slice(0, 5)
          .map(r => r.description.substring(0, 200))
          .join('. ');
        parts.push(`PRIMARY CHARACTER REFERENCE (from backstory documents): ${charDetails}`);
        console.log(`Applied ${matchingRules.length} character backstory rules for: ${charName}`);
      }
      
      // Also apply general character rules that might apply to all characters
      const generalCharRules = creativeContext.characterRules.filter(r => 
        !r.title.toLowerCase().includes(charName) && 
        !r.description.toLowerCase().includes(charName)
      ).slice(0, 2);
      
      if (generalCharRules.length > 0) {
        const generalDetails = generalCharRules
          .map(r => r.description.substring(0, 100))
          .join('. ');
        parts.push(`General character guidelines: ${generalDetails}`);
      }
    }
    
    // Apply visual style rules from creative documents
    if (creativeContext.visualStyleRules.length > 0) {
      const styleRules = creativeContext.visualStyleRules.slice(0, 3)
        .map(r => r.description.substring(0, 100))
        .join('. ');
      parts.push(`PRODUCTION VISUAL GUIDELINES: ${styleRules}`);
    }
    
    // Apply world/environment rules for environmental coherence
    if (creativeContext.worldRules.length > 0) {
      const worldRules = creativeContext.worldRules.slice(0, 2)
        .map(r => r.description.substring(0, 80))
        .join('. ');
      parts.push(`World context: ${worldRules}`);
    }
    
    // Apply environment rules for location concepts
    if ((request.conceptType === 'environment' || request.subjectFocus?.type === 'environment') && 
        creativeContext.environmentRules.length > 0) {
      const envRules = creativeContext.environmentRules.slice(0, 3)
        .map(r => r.description.substring(0, 120))
        .join('. ');
      parts.push(`ENVIRONMENT LORE: ${envRules}`);
    }
    
    // Apply symbolism rules for cultural accuracy
    if (creativeContext.symbolismRules.length > 0) {
      const symbolRules = creativeContext.symbolismRules.slice(0, 2)
        .map(r => r.description.substring(0, 80))
        .join('. ');
      parts.push(`Cultural symbolism: ${symbolRules}`);
    }
  }
  
  // Genre style direction (complement production design intel, not duplicate)
  if (projectGenre) {
    const genreStyle = GENRE_STYLE_DIRECTIONS[projectGenre] || 
                       GENRE_STYLE_DIRECTIONS[projectGenre.replace(/\s+/g, '_')] ||
                       GENRE_STYLE_DIRECTIONS[projectGenre.split(' ')[0]];
    
    if (genreStyle) {
      parts.push(`Genre visual direction: ${genreStyle}`);
    }
  }
  
  // Add script context for story coherence
  if (scriptContext) {
    if (scriptContext.projectTitle && scriptContext.projectGenre) {
      parts.push(`From the ${scriptContext.projectGenre} production "${scriptContext.projectTitle}"`);
    }
    if (scriptContext.projectDescription) {
      parts.push(`Story context: ${scriptContext.projectDescription.substring(0, 150)}`);
    }
  }
  
  // Determine if we're generating an isolated asset (defined at function scope)
  const isIsolated = request.isolatedAsset || !!request.subjectFocus;
  
  // Handle turnaround sheet mode
  if (request.turnaroundSheet) {
    const subjectName = request.subjectFocus?.name || 'subject';
    
    // Check for mythological character archetype
    const mythologicalStyle = getMythologicalCharacterStyle(subjectName);
    if (mythologicalStyle) {
      parts.push(`professional character turnaround sheet`);
      parts.push(mythologicalStyle);
      parts.push('front view, side view, back view, three-quarter view');
    } else {
      parts.push(`professional character turnaround sheet, ${subjectName}, front view, side view, back view, three-quarter view`);
    }
    parts.push('orthographic reference sheet, T-pose, neutral gray background, consistent lighting across all views');
    parts.push('production design quality, animation reference, model sheet format');
  } else {
    const focusType = request.subjectFocus?.type || request.conceptType;
    
    // Add concept type prefix
    const typePrefix = TYPE_PREFIXES[focusType] || TYPE_PREFIXES.environment;
    parts.push(typePrefix);
    
    // Add variation config (pose/angle) if provided
    if (request.variationConfig) {
      parts.push(request.variationConfig.pose);
      parts.push(request.variationConfig.angle);
    }
    
    // If we have a specific subject focus, handle it with priority logic
    if (request.subjectFocus) {
      const subjectName = request.subjectFocus.name;
      const isFacialTurnaround = request.subjectFocus.type === 'facial_turnaround' || request.conceptType === 'facial_turnaround';
      
      // CRITICAL: For facial turnarounds, SKIP mythological styling completely
      // We only want bald heads with facial structure, no crowns/jewelry/ornaments
      if (isFacialTurnaround) {
        // For facial turnaround, just use the name - no mythological decorations
        parts.push(`Facial reference for character: "${subjectName}"`);
        console.log(`Facial turnaround mode - skipping mythological styling for: ${subjectName}`);
      } else {
        // CRITICAL: Check if user provided a custom description
        // If so, prioritize the user's description over mythological archetypes
        const hasCustomDescription = request.useCustomDescription && 
          request.userPrompt && 
          request.userPrompt.trim().length > 0 &&
          request.userPrompt.toLowerCase() !== subjectName.toLowerCase();
        
        if (hasCustomDescription) {
          // User has provided a custom description - use it as the primary description
          // Just add the character name for reference, not the mythological archetype
          parts.push(`"${subjectName}" - character design`);
          console.log(`Using custom user description for: ${subjectName} (custom description provided)`);
        } else {
          // No custom description - check for mythological character archetype for auto-assist
          const mythologicalStyle = getMythologicalCharacterStyle(subjectName);
          if (mythologicalStyle) {
            // Use the detailed mythological description instead of just the name
            parts.push(mythologicalStyle);
            console.log(`Mythological character detected: ${subjectName}, applying archetype styling`);
          } else {
            parts.push(`"${subjectName}"`);
          }
        }
      }
      
      const isolationMod = ISOLATED_ASSET_MODIFIERS[request.subjectFocus.type] || ISOLATED_ASSET_MODIFIERS.prop;
      parts.push(isolationMod);
    }
  }
  
  // Apply style lock constraints
  if (request.styleLock?.extractedStyle) {
    const style = request.styleLock.extractedStyle;
    if (request.styleLock.lockColorPalette && style.colorPalette) {
      parts.push(`color palette: ${style.colorPalette.join(', ')}`);
    }
    if (request.styleLock.lockLighting && style.lightingType) {
      parts.push(`${style.lightingType} lighting, ${style.colorTemperature || 'neutral'} temperature`);
    }
    if (request.styleLock.lockMood && style.mood) {
      parts.push(`${style.mood} mood and atmosphere`);
    }
  }
  
  // Add user prompt if provided
  if (request.userPrompt) {
    parts.push(request.userPrompt);
  }
  
  // Add technical specs influence
  if (request.technicalSpecs) {
    const { camera, lighting } = request.technicalSpecs;
    parts.push(`${camera.lens} lens perspective, ${camera.angle}`);
    parts.push(`${lighting.keyLight}, ${lighting.intensity} intensity, ${lighting.mood} atmosphere`);
  }
  
  // Add character attributes as MANDATORY physical constraints (HIGHEST PRIORITY for appearance)
  // These OVERRIDE mythological archetype defaults for physical traits
  if (request.characterAttributes) {
    const attrs = request.characterAttributes;
    const charDetails: string[] = [];
    charDetails.push(`EXACTLY ${attrs.age} years old (NOT older, NOT younger)`);
    charDetails.push(`${attrs.gender} character`);
    charDetails.push(`${attrs.ethnicity} ethnicity with ${attrs.skinTone} skin tone`);
    charDetails.push(`${attrs.hairStyle} ${attrs.hairColor} hair`);
    charDetails.push(`${attrs.bodyBuild} body build`);
    if (attrs.distinguishingFeatures) {
      charDetails.push(`distinguishing features: ${attrs.distinguishingFeatures}`);
    }
    // Insert at beginning to ensure these take priority over defaults
    parts.unshift(`MANDATORY CHARACTER PHYSICAL APPEARANCE (MUST follow exactly): ${charDetails.join(', ')}`);
    console.log('Character attributes applied as MANDATORY:', charDetails.join(', '));
  }
  
  // Add scene context ONLY for lighting/mood reference - NOT for scene illustration
  // CRITICAL: Concept art is about the ASSET DESIGN, not about illustrating a scene
  if (request.sceneContext && !isIsolated) {
    const ctx = request.sceneContext;
    if (ctx.location) parts.push(`location reference: ${ctx.location}`);
    if (ctx.timeOfDay) parts.push(`${ctx.timeOfDay} lighting reference`);
    if (ctx.mood) parts.push(`${ctx.mood} mood reference`);
    // DO NOT include full scene description - it causes random scene illustrations
    // Only use props for context about what items exist in the scene
    if (ctx.props && ctx.props.length > 0) {
      parts.push(`relevant props: ${ctx.props.slice(0, 3).join(', ')}`);
    }
  } else if (request.sceneContext && isIsolated) {
    const ctx = request.sceneContext;
    if (ctx.timeOfDay) parts.push(`${ctx.timeOfDay} lighting reference`);
    if (ctx.mood) parts.push(`${ctx.mood} aesthetic`);
    // For isolated assets, NEVER include scene description or character lists
    // The asset should be generated based on its own description, not scene narrative
  }
  
  // Add director's vision (genre already handled at top, avoid duplication)
  if (request.directorVision) {
    const dv = request.directorVision;
    if (dv.mood) parts.push(`${dv.mood} tone`);
    if (dv.colorPalette && dv.colorPalette.length > 0) {
      parts.push(`color palette: ${dv.colorPalette.join(', ')}`);
    }
    if (dv.referenceMovies && dv.referenceMovies.length > 0) {
      parts.push(`inspired by ${dv.referenceMovies[0]}`);
    }
  }
  
  // Add reference influence from style DNA
  if (request.referenceInfluence?.styleDna) {
    const dna = request.referenceInfluence.styleDna;
    if (dna.lighting) parts.push(`${dna.lighting} lighting style`);
    if (dna.color) parts.push(`${dna.color} color grading`);
  }
  
  // Add tagged reference aspects from project references - STRONG enforcement
  if (request.referenceImages && request.referenceImages.length > 0) {
    const aspectDescriptions: string[] = [];
    const characterRefUrls: string[] = [];
    request.referenceImages.forEach(ref => {
      if (ref.lockedAspects && ref.lockedAspects.length > 0) {
        aspectDescriptions.push(`MUST maintain ${ref.lockedAspects.join(' and ')} exactly as shown in reference "${ref.title || ref.category || 'reference'}"`);
        // Track character design references for facial consistency
        if (ref.lockedAspects.includes('character_design') || ref.lockedAspects.includes('face')) {
          characterRefUrls.push(ref.url);
        }
      }
    });
    if (aspectDescriptions.length > 0) {
      // Insert near the top for high priority
      parts.unshift(`CRITICAL STYLE CONTINUITY REQUIREMENTS: ${aspectDescriptions.join('; ')}. These locked visual references are NON-NEGOTIABLE and must be faithfully reproduced.`);
      console.log(`Applied ${aspectDescriptions.length} locked reference aspect(s) with CRITICAL priority`);
    }
    if (characterRefUrls.length > 0) {
      parts.unshift(`FACIAL REFERENCE: Character face must match the reference image(s) exactly. Preserve facial structure, features, and identity.`);
    }
  }
  
  // Add What-If variations
  if (request.whatIfVariation) {
    const modifier = WHATIF_MODIFIERS[request.whatIfVariation.type];
    if (modifier) {
      parts.push(modifier(request.whatIfVariation.params));
    }
  }
  
  // Add art style modifiers (concept sheet variants)
  const styleModifier = STYLE_MODIFIERS[request.artStyle] || STYLE_MODIFIERS.painterly;
  parts.push(styleModifier);
  
  // CONCEPT SHEET QUALITY SUFFIX - production design focused, NOT cinematic
  parts.push(ULTRA_QUALITY_SUFFIX);
  
  // NEGATIVE CONSTRAINTS - prevent cinematic artwork style drift
  parts.push("NEGATIVE CONSTRAINTS: Do NOT generate dramatic cinematic compositions, movie poster layouts, action scenes, lens flare, bokeh, dramatic camera angles, narrative storytelling frames, or environmental context unless generating an environment design sheet");
  
  return parts.filter(Boolean).join(", ");
}

function analyzeShotRisk(sceneContext: ConceptRequest['sceneContext']): {
  overallRisk: string;
  vfxRisk: string;
  cameraRisk: string;
  factors: string[];
  recommendations: string;
} {
  const factors: string[] = [];
  let vfxScore = 0;
  let cameraScore = 0;
  
  if (sceneContext) {
    const description = (sceneContext.description || '').toLowerCase();
    const vfxKeywords = ['explosion', 'fire', 'water', 'crowd', 'cgi', 'destroy', 'transform', 'magic', 'flying'];
    vfxKeywords.forEach(kw => {
      if (description.includes(kw)) {
        vfxScore += 2;
        factors.push(`VFX-heavy element detected: "${kw}"`);
      }
    });
    
    const cameraKeywords = ['tracking', 'crane', 'aerial', 'dolly', 'steadicam', 'underwater', 'moving'];
    cameraKeywords.forEach(kw => {
      if (description.includes(kw)) {
        cameraScore += 2;
        factors.push(`Complex camera move: "${kw}"`);
      }
    });
    
    if (sceneContext.timeOfDay === 'night') {
      factors.push("Night shoot - increased lighting costs");
      vfxScore += 1;
    }
    
    if (sceneContext.characters && sceneContext.characters.length > 5) {
      factors.push(`Large cast (${sceneContext.characters.length} characters) - coordination complexity`);
      cameraScore += 1;
    }
  }
  
  const getRiskLevel = (score: number): string => {
    if (score <= 1) return 'low';
    if (score <= 3) return 'medium';
    if (score <= 5) return 'high';
    return 'critical';
  };
  
  const vfxRisk = getRiskLevel(vfxScore);
  const cameraRisk = getRiskLevel(cameraScore);
  const overallRisk = getRiskLevel(Math.max(vfxScore, cameraScore));
  
  let recommendations = "Shot appears manageable within standard production parameters.";
  if (overallRisk === 'high' || overallRisk === 'critical') {
    recommendations = "Consider pre-visualization, early VFX planning, or simplifying shot elements. Budget contingency recommended.";
  } else if (overallRisk === 'medium') {
    recommendations = "Plan adequate prep time. Consider backup coverage for complex elements.";
  }
  
  return { overallRisk, vfxRisk, cameraRisk, factors, recommendations };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const request: ConceptRequest & { action?: string } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle shot risk analysis request
    if (request.action === 'analyze_risk') {
      const riskAnalysis = analyzeShotRisk(request.sceneContext);
      return new Response(JSON.stringify({ success: true, riskAnalysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle technical specs generation request
    if (request.action === 'generate_technical_specs') {
      const technicalSpecs = generateTechnicalSpecs(request.sceneContext);
      return new Response(JSON.stringify({ success: true, technicalSpecs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle world module generation request
    if (request.action === 'generate_world_module') {
      const { 
        worldName, 
        description, 
        mythologicalContext, 
        styleDirection, 
        culturalReferences,
        moduleType,
        modulePrompt,
        promptIndex,
        resolution,
        projectId: reqProjectId
      } = request as ConceptRequest & { 
        worldName: string;
        description: string;
        mythologicalContext?: string;
        styleDirection?: string;
        culturalReferences?: string[];
        moduleType: string;
        modulePrompt: string;
        promptIndex: number;
        resolution?: string;
      };
      
      // Build ultra-high-res world module prompt
      // CRITICAL: Focus on ENVIRONMENT/LOCATION for SET MODELLERS - NO scene context
      const worldModulePromptParts: string[] = [
        `ULTRA HIGH RESOLUTION PRODUCTION SET DESIGN REFERENCE (8K quality)`,
        `ISOLATED ENVIRONMENT/LOCATION CONCEPT - FOR SET MODELLING, NOT SCENE ILLUSTRATION`,
        `Location/Environment: "${worldName}"`,
        `Module: ${moduleType.replace(/_/g, ' ').toUpperCase()}`,
        `IMPORTANT: Generate architectural and environmental reference for 3D modellers to build physical/virtual sets`,
        `NO characters, NO action, NO scene narrative - ONLY the environment/architecture design`,
      ];
      
      // Add style direction for visual theme
      if (styleDirection) {
        const styleMap: Record<string, string> = {
          mythological: 'ancient mythological architecture, sacred temple design, traditional structural forms, ornate architectural details, epic scale construction',
          fantasy: 'high fantasy architecture, magical realm structures, enchanted building designs, otherworldly construction',
          historical: 'historically accurate architecture, period-appropriate construction methods, archaeological reference quality',
          realistic: 'photorealistic architectural rendering, accurate building materials, natural construction elements',
          stylized: 'stylized architectural interpretation, distinctive structural language, unique design identity'
        };
        worldModulePromptParts.push(styleMap[styleDirection] || styleDirection);
      }
      
      // Add mythological context for architectural style reference (not narrative)
      if (mythologicalContext) {
        worldModulePromptParts.push(`Architectural period/style: ${mythologicalContext} era construction`);
      }
      
      // Add cultural references for design authenticity
      if (culturalReferences && culturalReferences.length > 0) {
        worldModulePromptParts.push(`Design influences: ${culturalReferences.join(', ')} architectural traditions`);
      }
      
      // Add description focusing on environment, strip any scene context
      // Remove scene-specific language from description
      const cleanDescription = description
        .replace(/scene\s*\d*/gi, '')
        .replace(/INT\.|EXT\./gi, '')
        .replace(/DAY|NIGHT|MORNING|EVENING/gi, '')
        .replace(/characters?|actors?/gi, '')
        .trim();
      worldModulePromptParts.push(`Environment description: ${cleanDescription}`);
      
      // Add the specific module prompt, ensuring it's about the environment not scenes
      worldModulePromptParts.push(modulePrompt);
      worldModulePromptParts.push('set design reference, architectural visualization, modeller reference, construction guide');
      
      // Add module-specific technical requirements - FOR SET MODELLERS, NOT SCENE ILLUSTRATION
      const moduleRequirements: Record<string, string> = {
        world_map: 'cartographic set layout, labeled regions for construction, geographic accuracy, top-down architectural plan, scale indicators for builders, NO characters NO action',
        topography: 'geological terrain model reference, elevation markers, cross-section for set construction, height map for terrain building, NO scene context',
        top_view: 'orthographic floor plan for set construction, clean technical linework, grid alignment, measurement annotations, architectural blueprint quality, NO figures NO action',
        elevations: 'architectural elevation drawing for builders, precise construction proportions, scale figures for reference only, measurement annotations, facade design reference, NO scene narrative',
        architecture_style: 'architectural style guide for set builders, pattern library, structural motif samples, design system documentation, construction reference, NO character scenes',
        entries: 'entrance/gateway architectural reference, structural design visualization, grand ceremonial scale design, construction detail focus, NO character action NO scenes',
        interiors: 'interior architecture for set construction, spatial layout reference, material and construction clarity, lighting design reference, NO characters NO action scenes',
        props: 'prop construction reference, multiple orthographic views for modelling, material callouts for building, scale reference for fabrication, ISOLATED objects only NO scenes',
        materials: 'texture and material reference for set dressing, high-detail samples for construction, color palette for painting, surface finishing variations, NO scene context',
        lighting: 'lighting design reference for set, atmosphere mood board, volumetric light effects guide, color temperature reference, NOT a scene illustration',
        vfx: 'VFX element reference for environment, particle system concepts for location, magical/energy visualization for set integration, ethereal effect guides, NO character scenes',
        scale: 'scale diagram for set construction, human silhouette comparison for builders, architectural proportions reference, construction measurement guide, NO action NO narrative',
        camera_guides: 'camera position planning for set, suggested angles for set design, framing guides for construction, shot composition reference for builders',
        continuity: 'production continuity reference, construction rules documentation, constraint annotations for set building, consistency guide for modellers'
      };
      
      worldModulePromptParts.push(moduleRequirements[moduleType] || 'professional production quality');
      
      // Add final quality modifiers
      worldModulePromptParts.push(
        resolution === 'ultra_high' 
          ? 'ultra high resolution 8K, extreme detail, professional production quality, clean composition, no watermarks'
          : 'high resolution 4K, detailed, professional quality'
      );
      
      const finalWorldPrompt = worldModulePromptParts.join(', ');
      console.log('World module prompt:', finalWorldPrompt.substring(0, 500));
      
      // Get image provider and generate
      const provider = await getImageProvider(supabase, reqProjectId);
      const result = await generateImage({ prompt: finalWorldPrompt, projectId: reqProjectId }, provider);
      
      if (result.error) {
        console.error("World module generation error:", result.error);
        throw new Error(result.error);
      }
      
      // Save to concept_arts table
      let conceptArtId: string | undefined;
      if (reqProjectId) {
        const { data: savedConcept, error: saveError } = await supabase
          .from('concept_arts')
          .insert({
            project_id: reqProjectId,
            title: `${worldName} - ${moduleType.replace(/_/g, ' ')} ${promptIndex + 1}`,
            concept_type: 'environment',
            art_style: 'matte',
            prompt: modulePrompt,
            generated_prompt: finalWorldPrompt,
            image_url: result.imageUrl,
            status: 'draft',
            metadata: {
              worldName,
              moduleType,
              promptIndex,
              styleDirection,
              mythologicalContext,
              isWorldModule: true
            }
          })
          .select('id')
          .single();
        
        if (!saveError && savedConcept) {
          conceptArtId = savedConcept.id;
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        imageUrl: result.imageUrl,
        generatedPrompt: finalWorldPrompt,
        seed: Math.floor(Math.random() * 1000000),
        provider: result.provider,
        conceptArtId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch full script context for story-synced generation
    let scriptContext: ScriptContext = {};
    let resolvedProjectId = request.projectId;
    
    // Get project ID from scene if not provided
    if (!resolvedProjectId && request.sceneId) {
      const { data: scene } = await supabase
        .from('scenes')
        .select('project_id')
        .eq('id', request.sceneId)
        .single();
      
      if (scene?.project_id) {
        resolvedProjectId = scene.project_id;
      }
    }
    
    // Fetch project and script context
    if (resolvedProjectId) {
      console.log('Fetching script context for concept art, project:', resolvedProjectId);
      
      // Fetch project details
      const { data: project } = await supabase
        .from('projects')
        .select('title, genre, description')
        .eq('id', resolvedProjectId)
        .single();
      
      if (project) {
        scriptContext.projectTitle = project.title;
        scriptContext.projectGenre = project.genre;
        scriptContext.projectDescription = project.description;
      }
      
      // Fetch all scenes for context
      const { data: scenes } = await supabase
        .from('scenes')
        .select('scene_number, slugline, description, characters, location')
        .eq('project_id', resolvedProjectId)
        .order('scene_number');
      
      if (scenes && scenes.length > 0) {
        scriptContext.allScenes = scenes.map((s: { scene_number: string; slugline: string; description?: string }) => ({
          scene_number: s.scene_number,
          slugline: s.slugline,
          description: s.description
        }));
        
        // Extract unique characters and locations from entire script
        const allCharacters = new Set<string>();
        const allLocations = new Set<string>();
        
        scenes.forEach((scene: { characters?: string[]; location?: string }) => {
          scene.characters?.forEach((char: string) => allCharacters.add(char));
          if (scene.location) allLocations.add(scene.location);
        });
        
        scriptContext.allCharacters = Array.from(allCharacters);
        scriptContext.allLocations = Array.from(allLocations);
      }
      
      console.log('Script context loaded:', {
        projectTitle: scriptContext.projectTitle,
        genre: scriptContext.projectGenre,
        sceneCount: scriptContext.allScenes?.length || 0,
        characterCount: scriptContext.allCharacters?.length || 0
      });
    }

    // CRITICAL: Fetch Creative Context Documents as PRIMARY production references
    // These are director-approved lore/world documents that guide all AI generations
    let creativeContext: CreativeContextRules = {
      characterRules: [],
      environmentRules: [],
      visualStyleRules: [],
      symbolismRules: [],
      worldRules: []
    };

    if (resolvedProjectId) {
      console.log('Fetching creative context rules for project:', resolvedProjectId);
      
      // Fetch approved creative context rules from the database
      const { data: contextRules, error: rulesError } = await supabase
        .from('creative_context_rules')
        .select('rule_title, rule_description, rule_type, source_excerpt, scope, is_mandatory, priority')
        .eq('project_id', resolvedProjectId)
        .order('priority', { ascending: false });
      
      if (!rulesError && contextRules && contextRules.length > 0) {
        console.log(`Found ${contextRules.length} creative context rules`);
        
        // Categorize rules by type for targeted application
        // Character backstory rules are HIGHEST PRIORITY for character generation
        contextRules.forEach((rule: any) => {
          const ruleEntry = {
            title: rule.rule_title,
            description: rule.rule_description,
            sourceExcerpt: rule.source_excerpt
          };
          
          const ruleType = rule.rule_type?.toLowerCase() || '';
          
          // PRIORITY: Character backstory rules are primary reference for character generation
          if (ruleType.includes('character') || ruleType.includes('backstory') || 
              ruleType.includes('personality') || ruleType.includes('design_constraint') ||
              ruleType.includes('do') || ruleType.includes('dont')) {
            creativeContext.characterRules.push(ruleEntry);
          } else if (ruleType.includes('environment') || ruleType.includes('location') || 
                     ruleType.includes('setting') || ruleType.includes('atmosphere')) {
            creativeContext.environmentRules.push(ruleEntry);
          } else if (ruleType.includes('visual') || ruleType.includes('style') || ruleType.includes('aesthetic')) {
            creativeContext.visualStyleRules.push(ruleEntry);
          } else if (ruleType.includes('symbol') || ruleType.includes('cultural') || 
                     ruleType.includes('motif') || ruleType.includes('cultural_logic')) {
            creativeContext.symbolismRules.push(ruleEntry);
          } else if (ruleType.includes('world') || ruleType.includes('lore') || ruleType.includes('mythology')) {
            creativeContext.worldRules.push(ruleEntry);
          } else if (ruleType.includes('visual_cue')) {
            // Visual cues are important for all generation types
            creativeContext.visualStyleRules.push(ruleEntry);
          } else {
            // Default to world rules for general context
            creativeContext.worldRules.push(ruleEntry);
          }
        });
        
        console.log('Creative context categorized:', {
          characterRules: creativeContext.characterRules.length,
          environmentRules: creativeContext.environmentRules.length,
          visualStyleRules: creativeContext.visualStyleRules.length,
          symbolismRules: creativeContext.symbolismRules.length,
          worldRules: creativeContext.worldRules.length
        });
      }
      
      // Also fetch raw document content for additional context if no rules exist
      if (contextRules?.length === 0 || !contextRules) {
        const { data: documents } = await supabase
          .from('creative_context_documents')
          .select('title, document_type, ai_interpretation, ai_summary, raw_content, scope')
          .eq('project_id', resolvedProjectId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (documents && documents.length > 0) {
          console.log(`Found ${documents.length} approved creative documents`);
          
          documents.forEach((doc: any) => {
            // Use AI interpretation if available, otherwise use summary
            const content = doc.ai_interpretation || doc.ai_summary || '';
            if (content) {
              creativeContext.worldRules.push({
                title: doc.title,
                description: content.substring(0, 300),
                sourceExcerpt: undefined
              });
            }
          });
        }
      }
    }

    // CRITICAL: Fetch tagged references from project references if not provided by client
    if (resolvedProjectId && (!request.referenceImages || request.referenceImages.length === 0)) {
      console.log('Fetching tagged references from project references...');
      const { data: taggedRefs } = await supabase
        .from('scene_references')
        .select('title, description, image_url, category, asset_tags, scene_id')
        .eq('project_id', resolvedProjectId)
        .not('asset_tags', 'is', null);
      
      if (taggedRefs && taggedRefs.length > 0) {
        const subjectName = request.subjectFocus?.name?.toLowerCase() || '';
        
        // Filter to relevant references: scene-specific, global, or character-name-matching
        const relevant = taggedRefs.filter((ref: any) => {
          const tags = ref.asset_tags || [];
          // Include if tagged to the selected character/subject
          if (subjectName && tags.some((t: string) => t.toLowerCase() === subjectName)) return true;
          // Include if has aspect locks (always relevant for style)
          if (tags.some((t: string) => t.startsWith('aspect:'))) {
            if (!request.sceneId) return true;
            return ref.scene_id === request.sceneId || !ref.scene_id;
          }
          // Include scene-specific or global refs
          if (!request.sceneId) return true;
          return ref.scene_id === request.sceneId || !ref.scene_id;
        });
        
        request.referenceImages = relevant.map((ref: any) => ({
          url: ref.image_url,
          title: ref.title || undefined,
          lockedAspects: (ref.asset_tags || [])
            .filter((t: string) => t.startsWith('aspect:'))
            .map((t: string) => t.replace('aspect:', '')),
          category: ref.category || undefined,
        }));
        
        console.log(`Found ${request.referenceImages.length} tagged references for generation (subject: "${subjectName || 'none'}")`);
      }
    }

    // Build the intelligent prompt with script context AND creative context for story coherence
    const generatedPrompt = buildIntelligentPrompt(request, scriptContext, creativeContext);
    console.log("Generated prompt:", generatedPrompt);
    console.log("Variation config:", request.variationConfig);
    console.log("Workflow config:", request.workflowConfig ? "Present" : "Not provided");

    // Build workflow-enhanced prompt if workflow config is provided
    let enhancedPrompt = generatedPrompt;
    let workflowMetadata: Record<string, unknown> = {};

    if (request.workflowConfig) {
      const wf = request.workflowConfig;
      
      // Add workflow parameters to prompt for better generation
      const workflowModifiers: string[] = [];
      
      // Sampler/scheduler influence on style
      if (wf.sampler.includes('euler')) {
        workflowModifiers.push('smooth gradients, soft transitions');
      } else if (wf.sampler.includes('dpm')) {
        workflowModifiers.push('sharp details, crisp edges');
      }
      
      // CFG scale influence
      if (wf.cfgScale > 10) {
        workflowModifiers.push('highly stylized, strong prompt adherence');
      } else if (wf.cfgScale < 5) {
        workflowModifiers.push('creative interpretation, loose prompt following');
      }
      
      // LoRA influences
      const activeLoRAs = wf.loras.filter(l => l.enabled);
      if (activeLoRAs.length > 0) {
        workflowModifiers.push(`styled with ${activeLoRAs.map(l => l.name).join(', ')}`);
      }
      
      // ControlNet influences
      const activeCNs = wf.controlNets.filter(c => c.enabled);
      activeCNs.forEach(cn => {
        if (cn.type === 'canny') workflowModifiers.push('precise edge details');
        if (cn.type === 'depth') workflowModifiers.push('accurate depth perception');
        if (cn.type === 'pose') workflowModifiers.push('anatomically correct pose');
        if (cn.type === 'lineart') workflowModifiers.push('clean linework');
      });
      
      // Hires fix
      if (wf.hiresFixEnabled) {
        workflowModifiers.push('ultra high resolution, fine details');
      }
      
      // Upscaler
      if (wf.upscaler !== 'none') {
        workflowModifiers.push('enhanced resolution');
      }
      
      if (workflowModifiers.length > 0) {
        enhancedPrompt = `${generatedPrompt}, ${workflowModifiers.join(', ')}`;
      }
      
      // Store workflow metadata for response
      workflowMetadata = {
        checkpoint: wf.checkpoint,
        sampler: wf.sampler,
        scheduler: wf.scheduler,
        steps: wf.steps,
        cfgScale: wf.cfgScale,
        resolution: `${wf.width}x${wf.height}`,
        seed: wf.seedLocked ? wf.seed : -1,
        activeLoRAs: activeLoRAs.map(l => l.name),
        activeControlNets: activeCNs.map(c => c.type),
        hiresFixEnabled: wf.hiresFixEnabled,
        upscaler: wf.upscaler
      };
      
      console.log("Enhanced prompt with workflow:", enhancedPrompt);
      console.log("Workflow metadata:", JSON.stringify(workflowMetadata));
    }

    // Get the configured image provider
    const provider = await getImageProvider(supabase, resolvedProjectId);
    console.log('Using image provider:', provider);

    // Collect actual reference image URLs to pass to the AI model visually
    const referenceImageUrls: string[] = [];
    if (request.referenceImages && request.referenceImages.length > 0) {
      for (const ref of request.referenceImages) {
        if (ref.url) {
          referenceImageUrls.push(ref.url);
        }
      }
      console.log(`Passing ${referenceImageUrls.length} reference image URLs to AI model for visual matching`);
    }

    // Generate image using configured provider
    // CRITICAL: Concept art is a DESIGN REFERENCE for 3D modelers and production artists
    // It must show the DESIGN of ONE specific asset - NOT a random scene illustration
    let finalPrompt: string;
    if (request.isolatedAsset || request.subjectFocus) {
      const assetType = request.subjectFocus?.type || request.conceptType || 'asset';
      const assetName = request.subjectFocus?.name || 'subject';
      
      // Build reference image context describing what to match
      let referenceContext = '';
      if (request.referenceImages && request.referenceImages.length > 0) {
        const refDescriptions = request.referenceImages.map(ref => {
          const aspects = ref.lockedAspects.length > 0 
            ? `(locked aspects: ${ref.lockedAspects.join(', ')})` 
            : '';
          return `- "${ref.title || 'Reference'}" ${aspects}`;
        }).join('\n');
        
        const hasFaceLock = request.referenceImages.some(r => 
          r.lockedAspects.some(a => a.toLowerCase().includes('face') || a.toLowerCase().includes('identity'))
        );
        
        referenceContext = `\nCRITICAL VISUAL REFERENCE: The attached reference images MUST be used as the primary visual guide.
Generate artwork that closely matches the style, appearance, and visual identity shown in these references.
${hasFaceLock ? 'FACE IDENTITY LOCK: The generated character MUST have the EXACT same facial features, face shape, and identity as shown in the reference images. Preserve facial identity precisely.' : ''}
Reference details:\n${refDescriptions}\n`;
      }
      
      finalPrompt = `PROFESSIONAL FILM PRODUCTION CONCEPT SHEET (MANDATORY FORMAT):

OUTPUT FORMAT: This must look like a concept sheet from a professional film studio's art department.
- NOT a cinematic movie frame, NOT a dramatic painting, NOT a poster, NOT an illustration.
- Think: Weta Workshop character sheet, ILM creature design board, production design reference plate.

CONCEPT SHEET RULES:
- Single isolated ${assetType} design for "${assetName}" on neutral studio background.
- Clean, even studio lighting. NO dramatic rim lighting, NO lens flare, NO bokeh.
- Design details must be READABLE - materials, textures, construction visible.
- Character sheets: centered figure, 70-80% frame height, clear silhouette, neutral pose unless specified.
- Environment sheets: wide establishing view, scale reference figures, architectural clarity.
- Prop sheets: object centered, white background, multiple angle callouts if possible.
- Background: Light grey (#D0D0D0) for characters/creatures, white for props/costumes, simple gradient for environments.

PURPOSE: Production artists, 3D modelers, costume designers, and set builders will use this as a BUILD REFERENCE.
${referenceContext}

ASSET DESIGN SPECIFICATION:
${enhancedPrompt}`;
    } else {
      // Non-isolated: still enforce concept sheet format
      let referenceContext = '';
      if (request.referenceImages && request.referenceImages.length > 0) {
        const refDescriptions = request.referenceImages.map(ref => {
          const aspects = ref.lockedAspects.length > 0 
            ? `(locked: ${ref.lockedAspects.join(', ')})` 
            : '';
          return `"${ref.title || 'Reference'}" ${aspects}`;
        }).join(', ');
        referenceContext = `\nVISUAL REFERENCE: Match style, palette, and design language of: [${refDescriptions}].\n`;
      }
      finalPrompt = `PROFESSIONAL CONCEPT SHEET: This is a DESIGN REFERENCE for production departments. Output must look like a professional film studio concept sheet - clean composition, neutral lighting, design-focused, NOT a cinematic frame or dramatic painting. ${referenceContext}${enhancedPrompt}`;
    }
    
    console.log('Final prompt for generation:', finalPrompt.substring(0, 500));
    console.log('Reference images being sent to model:', referenceImageUrls.length);
    const result = await generateImage({ prompt: finalPrompt, projectId: resolvedProjectId, referenceImages: referenceImageUrls.length > 0 ? referenceImageUrls : undefined }, provider);

    if (result.error) {
      console.error("Image generation error:", result.error);
      
      if (result.error.includes('Rate limit')) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (result.error.includes('credits')) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(result.error);
    }

    // Also generate shot risk analysis
    const riskAnalysis = analyzeShotRisk(request.sceneContext);

    // Use workflow seed if provided and locked, otherwise generate random
    const outputSeed = request.workflowConfig?.seedLocked && request.workflowConfig.seed > 0 
      ? request.workflowConfig.seed 
      : Math.floor(Math.random() * 1000000);

    return new Response(JSON.stringify({
      success: true,
      imageUrl: result.imageUrl,
      generatedPrompt: request.workflowConfig ? enhancedPrompt : generatedPrompt,
      riskAnalysis,
      seed: outputSeed,
      provider: result.provider,
      workflowMetadata: Object.keys(workflowMetadata).length > 0 ? workflowMetadata : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-concept-art:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});