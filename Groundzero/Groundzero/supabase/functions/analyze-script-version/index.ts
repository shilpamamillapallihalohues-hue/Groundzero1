import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { newContent, existingContent, projectTitle } = await req.json();
    if (!newContent) throw new Error("No new content provided");

    const systemPrompt = `You are a professional script analyst. Compare the NEW script version against the EXISTING script and produce a detailed analysis.

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "summary": "Brief overview of all changes",
  "totalNewScenes": 0,
  "totalModifiedScenes": 0,
  "totalRemovedScenes": 0,
  "scenes": [
    {
      "slugline": "INT. LOCATION - TIME",
      "status": "new" | "modified" | "unchanged" | "removed",
      "description": "What this scene is about",
      "characters": ["CHARACTER1", "CHARACTER2"],
      "changeDetails": "What specifically changed (if modified)",
      "content": "The full scene content from the new version",
      "fitScore": 85,
      "aiNotes": "Why this scene works or what to consider"
    }
  ]
}

RULES:
1. Match scenes by slugline (INT./EXT. headings)
2. For "new" scenes: provide fitScore (0-100) based on narrative coherence
3. For "modified" scenes: describe exact changes (dialogue changes, action changes, etc.)
4. For "removed" scenes: note what was in the old version
5. Extract all character names mentioned in each scene
6. Be thorough - capture every scene from both versions`;

    const userPrompt = `PROJECT: ${projectTitle || 'Untitled'}

EXISTING SCRIPT:
${existingContent || '(No existing script - this is the first version)'}

NEW SCRIPT VERSION:
${newContent}

Analyze all changes between these versions.`;

    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Clean markdown fences
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    
    const analysis = JSON.parse(content);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Script analysis error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
