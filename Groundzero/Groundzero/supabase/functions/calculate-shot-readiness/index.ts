import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReadinessRequest {
  storyboardId: string;
  linkedAssets: Array<{
    id: string;
    status: string;
    complexityScore: number;
  }>;
  shotDetails: {
    vfxRequired?: boolean;
    vfxComplexity?: string;
    action?: string;
    lighting?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { storyboardId, linkedAssets, shotDetails }: ReadinessRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Calculating readiness for shot: ${storyboardId}`);

    // Calculate asset readiness
    const totalAssets = linkedAssets.length;
    const readyAssets = linkedAssets.filter(a => 
      a.status === 'approved' || a.status === 'completed'
    ).length;
    const assetReadinessPct = totalAssets > 0 ? Math.round((readyAssets / totalAssets) * 100) : 100;

    // Calculate missing assets
    const missingAssets = linkedAssets
      .filter(a => a.status === 'identified' || a.status === 'blocked')
      .map(a => a.id);

    // Calculate FX complexity score
    let fxComplexityScore = 0;
    if (shotDetails.vfxRequired) {
      switch (shotDetails.vfxComplexity) {
        case 'extreme': fxComplexityScore = 100; break;
        case 'high': fxComplexityScore = 75; break;
        case 'medium': fxComplexityScore = 50; break;
        case 'low': fxComplexityScore = 25; break;
        default: fxComplexityScore = 10;
      }
    }

    // Calculate animation difficulty from action description
    let animationDifficultyScore = 0;
    const action = (shotDetails.action || '').toLowerCase();
    const difficultKeywords = ['fight', 'chase', 'explosion', 'crowd', 'flying', 'transform', 'morph'];
    const mediumKeywords = ['walk', 'run', 'talk', 'gesture', 'move'];
    
    difficultKeywords.forEach(kw => {
      if (action.includes(kw)) animationDifficultyScore += 20;
    });
    mediumKeywords.forEach(kw => {
      if (action.includes(kw)) animationDifficultyScore += 10;
    });
    animationDifficultyScore = Math.min(100, animationDifficultyScore);

    // Calculate lighting cost score
    let lightingCostScore = 0;
    const lighting = (shotDetails.lighting || '').toLowerCase();
    if (lighting.includes('night')) lightingCostScore += 30;
    if (lighting.includes('volumetric') || lighting.includes('god ray')) lightingCostScore += 25;
    if (lighting.includes('practical')) lightingCostScore += 15;
    if (lighting.includes('complex') || lighting.includes('multiple')) lightingCostScore += 20;
    lightingCostScore = Math.min(100, lightingCostScore);

    // Generate risk flags
    const riskFlags: string[] = [];
    if (assetReadinessPct < 50) riskFlags.push('Low asset readiness');
    if (missingAssets.length > 3) riskFlags.push('Multiple missing assets');
    if (fxComplexityScore > 75) riskFlags.push('High VFX complexity');
    if (animationDifficultyScore > 60) riskFlags.push('Complex animation required');
    if (lightingCostScore > 50) riskFlags.push('Expensive lighting setup');

    // Calculate average complexity from linked assets
    const avgComplexity = linkedAssets.length > 0
      ? linkedAssets.reduce((sum, a) => sum + a.complexityScore, 0) / linkedAssets.length
      : 0;
    if (avgComplexity > 70) riskFlags.push('High-complexity assets');

    // Determine overall status
    let overallStatus = 'ready';
    const overallScore = (assetReadinessPct * 0.4) + 
      ((100 - fxComplexityScore) * 0.2) + 
      ((100 - animationDifficultyScore) * 0.2) + 
      ((100 - lightingCostScore) * 0.2);

    if (missingAssets.length > 0 && assetReadinessPct < 30) {
      overallStatus = 'blocked';
    } else if (riskFlags.length >= 3 || overallScore < 50) {
      overallStatus = 'risky';
    } else if (overallScore >= 70) {
      overallStatus = 'ready';
    } else {
      overallStatus = 'risky';
    }

    // Generate AI recommendations
    let aiRecommendations = '';
    if (overallStatus === 'blocked') {
      aiRecommendations = 'Shot is blocked due to missing critical assets. Prioritize asset completion before proceeding.';
    } else if (overallStatus === 'risky') {
      const risks = riskFlags.join(', ');
      aiRecommendations = `Shot flagged as risky due to: ${risks}. Consider pre-visualization, additional prep time, or scope reduction.`;
    } else {
      aiRecommendations = 'Shot is ready for production. All assets available and complexity is manageable.';
    }

    console.log(`Shot readiness calculated: ${overallStatus} (${Math.round(overallScore)}%)`);

    return new Response(JSON.stringify({
      success: true,
      readiness: {
        storyboardId,
        assetReadinessPct,
        fxComplexityScore,
        animationDifficultyScore,
        lightingCostScore,
        overallStatus,
        missingAssets,
        riskFlags,
        aiRecommendations,
        calculatedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-shot-readiness:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
