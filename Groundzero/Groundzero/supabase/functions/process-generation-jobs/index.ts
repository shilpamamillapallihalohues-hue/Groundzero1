/**
 * Background Worker: Process Generation Jobs
 * 
 * This edge function acts as a job worker that:
 * 1. Polls pending jobs from generation_jobs table
 * 2. Dispatches to appropriate generation functions
 * 3. Updates job status and stores results
 * 
 * Designed to be called on a schedule (cron) or manually.
 * Does NOT modify the frontend submitJob() API.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch up to 3 pending jobs ordered by priority then creation time
    const { data: jobs, error: fetchError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(3);

    if (fetchError) {
      console.error('Failed to fetch jobs:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending jobs', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const job of jobs) {
      // Mark as processing
      await supabase
        .from('generation_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString(), progress: 10 })
        .eq('id', job.id);

      try {
        // Load visual memory for continuity
        const visualMemory = await loadVisualMemory(supabase, job.project_id, job.input_data);

        // Dispatch to the appropriate generation function
        const result = await dispatchJob(supabaseUrl, serviceKey, job, visualMemory);

        // Update progress
        await supabase
          .from('generation_jobs')
          .update({ progress: 90 })
          .eq('id', job.id);

        // Store visual memory from result if applicable
        if (result.visualMemoryUpdate) {
          await storeVisualMemory(supabase, job.project_id, result.visualMemoryUpdate);
        }

        // Mark completed
        await supabase
          .from('generation_jobs')
          .update({
            status: 'completed',
            progress: 100,
            output_data: result.output,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'completed' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
        console.error(`Job ${job.id} failed:`, errorMessage);

        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'failed', error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ error: 'Worker processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Load relevant visual memory for continuity enforcement.
 */
async function loadVisualMemory(
  supabase: any,
  projectId: string,
  inputData: Record<string, any>,
): Promise<Record<string, any>> {
  try {
    const memoryTypes = [];
    if (inputData?.characters?.length) memoryTypes.push('character');
    if (inputData?.sceneId) memoryTypes.push('environment', 'lighting', 'camera_angle');
    if (memoryTypes.length === 0) memoryTypes.push('character', 'environment');

    const { data: memories } = await supabase
      .from('visual_memory')
      .select('*')
      .eq('project_id', projectId)
      .in('memory_type', memoryTypes);

    if (!memories?.length) return {};

    const memoryMap: Record<string, any> = {};
    for (const mem of memories) {
      const key = `${mem.memory_type}:${mem.entity_name}`;
      memoryMap[key] = mem.memory_data;
    }
    return memoryMap;
  } catch (e) {
    console.error('Failed to load visual memory:', e);
    return {};
  }
}

/**
 * Store visual continuity data after generation.
 */
async function storeVisualMemory(
  supabase: any,
  projectId: string,
  updates: Array<{ memory_type: string; entity_name: string; memory_data: any }>,
) {
  for (const update of updates) {
    await supabase
      .from('visual_memory')
      .upsert(
        {
          project_id: projectId,
          memory_type: update.memory_type,
          entity_name: update.entity_name,
          memory_data: update.memory_data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,memory_type,entity_name' }
      );
  }
}

/**
 * Dispatch a job to the appropriate edge function.
 */
async function dispatchJob(
  supabaseUrl: string,
  serviceKey: string,
  job: any,
  visualMemory: Record<string, any>,
): Promise<{ output: any; visualMemoryUpdate?: any[] }> {
  const functionMap: Record<string, string> = {
    concept_art: 'generate-concept-art',
    storyboard: 'generate-storyboard',
    shot_generation: 'generate-storyboard',
    visual_analysis: 'scene-intelligence',
    reference_extraction: 'analyze-reference',
  };

  const functionName = functionMap[job.job_type];
  if (!functionName) {
    throw new Error(`Unknown job type: ${job.job_type}`);
  }

  // Enrich input with visual memory context
  const enrichedInput = {
    ...job.input_data,
    visualMemoryContext: visualMemory,
    jobId: job.id,
    projectId: job.project_id,
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceKey,
    },
    body: JSON.stringify(enrichedInput),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${functionName} failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const output = await response.json();

  // Extract visual memory updates if the generation produced character/env data
  const visualMemoryUpdate: any[] = [];
  if (output.characterData) {
    visualMemoryUpdate.push({
      memory_type: 'character',
      entity_name: output.characterData.name || 'unknown',
      memory_data: output.characterData,
    });
  }
  if (output.environmentData) {
    visualMemoryUpdate.push({
      memory_type: 'environment',
      entity_name: output.environmentData.name || job.input_data?.sceneId || 'unknown',
      memory_data: output.environmentData,
    });
  }

  return { output, visualMemoryUpdate: visualMemoryUpdate.length > 0 ? visualMemoryUpdate : undefined };
}
