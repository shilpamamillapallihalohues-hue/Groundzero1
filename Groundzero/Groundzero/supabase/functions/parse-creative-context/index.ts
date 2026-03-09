import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper to convert array buffer to base64 in chunks to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

// Extract text from DOCX/PDF using Vision API
async function extractDocumentViaVision(arrayBuffer: ArrayBuffer, mimeType: string, apiKey: string): Promise<string> {
  console.log(`Extracting document via Vision API, mime: ${mimeType}, size: ${arrayBuffer.byteLength}`);
  
  const base64Data = arrayBufferToBase64(arrayBuffer);
  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  
  const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a document extraction specialist. Extract ALL text content from this document. This is a creative context document for a film/animation production. 

Preserve the structure and formatting as much as possible. Include:
- All headings and sections
- Character descriptions and names
- World/environment descriptions  
- Visual style notes
- Any rules or guidelines mentioned
- Story elements and narrative details

Return ONLY the extracted text content, nothing else. Do not summarize - extract the full text.`
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl }
            }
          ]
        }
      ],
      max_tokens: 16000
    }),
  });

  if (!extractionResponse.ok) {
    const errorText = await extractionResponse.text();
    console.error('Vision extraction error:', extractionResponse.status, errorText);
    if (extractionResponse.status === 429) throw new Error('Rate limit exceeded. Please try again in a moment.');
    if (extractionResponse.status === 402) throw new Error('API credits exhausted.');
    throw new Error(`Document extraction failed: ${extractionResponse.status}`);
  }

  const extractionResult = await extractionResponse.json();
  const content = extractionResult.choices?.[0]?.message?.content || '';
  console.log('Vision-extracted content length:', content.length);
  
  if (content.length < 20) {
    throw new Error('Could not extract meaningful text from document');
  }
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { documentId, rawContent, documentType, scope, projectId, fileUrl, fileType } = await req.json();
    
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let contentToAnalyze = rawContent || '';

    // If we have a file URL and no raw content, extract text from the document
    if (fileUrl && (!contentToAnalyze || contentToAnalyze.trim() === '')) {
      console.log('Processing file:', fileUrl, 'type:', fileType);
      
      try {
        console.log('Downloading file for processing...');
        
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.status}`);
        }
        
        const arrayBuffer = await fileResponse.arrayBuffer();
        console.log('File downloaded, size:', arrayBuffer.byteLength, 'bytes');

        const isDocx = fileType === 'docx' || fileType === 'doc' || fileUrl.includes('.docx') || fileUrl.includes('.doc');
        const isTextFile = fileType === 'txt' || fileType === 'md' || fileType === 'rtf' || 
                           fileUrl.includes('.txt') || fileUrl.includes('.md') || fileUrl.includes('.rtf');
        const isPdf = fileType === 'pdf' || fileUrl.includes('.pdf');
        const isPptx = fileType === 'pptx' || fileType === 'ppt' || fileUrl.includes('.pptx') || fileUrl.includes('.ppt');

        if (isTextFile) {
          // Plain text files - just decode directly
          console.log('Reading plain text file...');
          const decoder = new TextDecoder('utf-8');
          contentToAnalyze = decoder.decode(arrayBuffer);
          console.log('Text content length:', contentToAnalyze.length);

        } else if (isDocx) {
          // DOCX files - use Vision API (Gemini supports document extraction)
          console.log('Extracting text from DOCX via Vision API...');
          contentToAnalyze = await extractDocumentViaVision(arrayBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', LOVABLE_API_KEY);

        } else if (isPdf) {
          // PDF files - use Vision API
          console.log('Extracting text from PDF via Vision API...');
          contentToAnalyze = await extractDocumentViaVision(arrayBuffer, 'application/pdf', LOVABLE_API_KEY);

        } else if (isPptx) {
          // PPTX files - use Vision API
          console.log('Extracting text from PPTX via Vision API...');
          contentToAnalyze = await extractDocumentViaVision(arrayBuffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', LOVABLE_API_KEY);

        } else {
          // Unknown file type - try reading as text first
          console.log('Unknown file type, attempting text decode...');
          const decoder = new TextDecoder('utf-8', { fatal: false });
          contentToAnalyze = decoder.decode(arrayBuffer);
        }
        
        if (!contentToAnalyze || contentToAnalyze.length < 20) {
          throw new Error('Could not extract meaningful text from the document. The document may be empty, corrupted, or in an unsupported format.');
        }

        // Update the document with extracted raw content
        await supabase
          .from('creative_context_documents')
          .update({ raw_content: contentToAnalyze.substring(0, 100000) })
          .eq('id', documentId);

      } catch (extractError) {
        console.error('File extraction error:', extractError);
        
        // Update status to reflect error
        await supabase
          .from('creative_context_documents')
          .update({ status: 'rejected' })
          .eq('id', documentId);
          
        throw new Error(`Failed to extract content from file: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim() === '') {
      throw new Error('No content to analyze. Please provide text content or upload a readable document.');
    }

    // Valid rule types according to database constraint
    const VALID_RULE_TYPES = ['visual_cue', 'design_constraint', 'cultural_logic', 'symbolism', 'do', 'dont', 'color_palette', 'material', 'proportion', 'lighting', 'atmosphere'];
    
    // Build the AI prompt for parsing creative context
    const systemPrompt = `You are an expert creative director and world-builder analyzing production documents for film/TV/animation projects.

Your task is to:
1. Summarize the document concisely (2-3 paragraphs)
2. Extract structured creative rules that artists must follow
3. Identify ALL characters mentioned with their physical descriptions, personality traits, and visual design notes
4. Identify ALL worlds/environments with their visual characteristics
5. Identify visual cues, design constraints, cultural logic, and symbolism
6. Flag any "Do's and Don'ts" explicitly or implicitly mentioned
7. Maintain mythological/cultural accuracy

Document Type: ${documentType}
Scope: ${scope}

IMPORTANT: For rule_type, you MUST ONLY use these exact values: visual_cue, design_constraint, cultural_logic, symbolism, do, dont, color_palette, material, proportion, lighting, atmosphere

Respond in JSON format:
{
  "summary": "Concise summary of the document...",
  "interpretation": "How this should be applied in production...",
  "characters": [
    {
      "name": "Character Name",
      "description": "Full physical and personality description",
      "visual_notes": "Specific visual design notes for artists"
    }
  ],
  "worlds": [
    {
      "name": "World/Environment Name",
      "description": "Full description of the environment",
      "visual_notes": "Specific visual design notes for artists"
    }
  ],
  "rules": [
    {
      "rule_type": "visual_cue|design_constraint|cultural_logic|symbolism|do|dont|color_palette|material|proportion|lighting|atmosphere",
      "rule_title": "Short title",
      "rule_description": "Detailed description for artists",
      "applies_to": ["entity names if specific"],
      "priority": 1-10,
      "is_mandatory": true/false,
      "source_excerpt": "Quote from document",
      "confidence_score": 0.0-1.0
    }
  ]
}`;

    console.log('Sending content to AI for analysis, length:', contentToAnalyze.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this creative context document and extract all characters, worlds, and creative rules:\n\n${contentToAnalyze.substring(0, 80000)}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limit exceeded. Please try again in a moment.');
      if (response.status === 402) throw new Error('API credits exhausted.');
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content in AI response');

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('AI parsed:', {
      summary: parsed.summary?.substring(0, 100),
      charactersCount: parsed.characters?.length || 0,
      worldsCount: parsed.worlds?.length || 0,
      rulesCount: parsed.rules?.length || 0
    });

    // Build comprehensive interpretation including characters and worlds
    let fullInterpretation = parsed.interpretation || '';
    
    if (parsed.characters && parsed.characters.length > 0) {
      fullInterpretation += '\n\n## Characters Found:\n';
      for (const char of parsed.characters) {
        fullInterpretation += `\n### ${char.name}\n${char.description}\n**Visual Notes:** ${char.visual_notes || 'N/A'}\n`;
      }
    }
    
    if (parsed.worlds && parsed.worlds.length > 0) {
      fullInterpretation += '\n\n## Worlds/Environments Found:\n';
      for (const world of parsed.worlds) {
        fullInterpretation += `\n### ${world.name}\n${world.description}\n**Visual Notes:** ${world.visual_notes || 'N/A'}\n`;
      }
    }

    // Update the document with AI summary and interpretation
    const { error: updateError } = await supabase
      .from('creative_context_documents')
      .update({
        ai_summary: parsed.summary,
        ai_interpretation: fullInterpretation,
        status: 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      throw updateError;
    }

    // Build rules from explicit rules + character/world descriptions
    const allRules: any[] = [];
    
    const validateRuleType = (type: string): string => {
      if (VALID_RULE_TYPES.includes(type)) return type;
      if (type === 'character_description' || type === 'character') return 'design_constraint';
      if (type === 'world_description' || type === 'world' || type === 'environment') return 'atmosphere';
      return 'visual_cue';
    };
    
    if (parsed.characters && parsed.characters.length > 0) {
      for (const char of parsed.characters) {
        allRules.push({
          document_id: documentId,
          project_id: projectId,
          rule_type: 'design_constraint',
          rule_title: `Character: ${char.name}`,
          rule_description: `${char.description}\n\nVisual Notes: ${char.visual_notes || 'N/A'}`,
          scope: 'character',
          applies_to: [char.name],
          priority: 8,
          is_mandatory: true,
          confidence_score: 0.9,
          source_excerpt: char.description?.substring(0, 500)
        });
      }
    }
    
    if (parsed.worlds && parsed.worlds.length > 0) {
      for (const world of parsed.worlds) {
        allRules.push({
          document_id: documentId,
          project_id: projectId,
          rule_type: 'atmosphere',
          rule_title: `World: ${world.name}`,
          rule_description: `${world.description}\n\nVisual Notes: ${world.visual_notes || 'N/A'}`,
          scope: 'world',
          applies_to: [world.name],
          priority: 8,
          is_mandatory: true,
          confidence_score: 0.9,
          source_excerpt: world.description?.substring(0, 500)
        });
      }
    }

    if (parsed.rules && parsed.rules.length > 0) {
      for (const rule of parsed.rules) {
        allRules.push({
          document_id: documentId,
          project_id: projectId,
          rule_type: validateRuleType(rule.rule_type || 'visual_cue'),
          rule_title: rule.rule_title,
          rule_description: rule.rule_description,
          scope: scope,
          applies_to: rule.applies_to || [],
          priority: Math.min(Math.max(rule.priority || 5, 1), 10),
          is_mandatory: rule.is_mandatory ?? true,
          confidence_score: rule.confidence_score || 0.8,
          source_excerpt: rule.source_excerpt
        });
      }
    }

    if (allRules.length > 0) {
      const { error: rulesError } = await supabase
        .from('creative_context_rules')
        .insert(allRules);
      if (rulesError) {
        console.error('Error inserting rules:', rulesError);
        throw rulesError;
      }
    }

    console.log('Successfully parsed document:', {
      documentId,
      charactersFound: parsed.characters?.length || 0,
      worldsFound: parsed.worlds?.length || 0,
      rulesExtracted: allRules.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: parsed.summary,
        interpretation: fullInterpretation,
        charactersFound: parsed.characters?.length || 0,
        worldsFound: parsed.worlds?.length || 0,
        rulesCount: allRules.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-creative-context:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
