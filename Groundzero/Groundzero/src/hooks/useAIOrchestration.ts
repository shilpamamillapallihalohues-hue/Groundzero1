import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AIModel, 
  AITaskDefinition, 
  ProjectAISettings, 
  TaskContext, 
  ModelSelectionResult,
  AI_MODELS,
  AIModelId,
  ModelType,
  CostTier,
  SpeedTier,
  SafetySettings
} from '@/types/aiOrchestration';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export function useAIOrchestration(projectId?: string) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [taskDefinitions, setTaskDefinitions] = useState<AITaskDefinition[]>([]);
  const [projectSettings, setProjectSettings] = useState<ProjectAISettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all models
  useEffect(() => {
    const fetchModels = async () => {
      const { data, error } = await supabase
        .from('ai_model_registry')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching models:', error);
        return;
      }
      
      // Map to typed AIModel
      const typedModels: AIModel[] = (data || []).map(m => ({
        id: m.id,
        model_id: m.model_id,
        display_name: m.display_name,
        provider: m.provider,
        model_type: m.model_type as ModelType,
        strengths: m.strengths || [],
        limitations: m.limitations || [],
        supported_tasks: m.supported_tasks || [],
        cost_tier: m.cost_tier as CostTier,
        speed_tier: m.speed_tier as SpeedTier,
        is_active: m.is_active ?? true,
        config: (m.config as Record<string, unknown>) || {}
      }));
      
      setModels(typedModels);
    };

    fetchModels();
  }, []);

  // Fetch task definitions
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('ai_task_definitions')
        .select('*');
      
      if (error) {
        console.error('Error fetching task definitions:', error);
        return;
      }
      
      const typedTasks: AITaskDefinition[] = (data || []).map(t => ({
        id: t.id,
        task_key: t.task_key,
        task_name: t.task_name,
        description: t.description,
        task_category: t.task_category as 'analysis' | 'generation' | 'validation',
        recommended_model_ids: t.recommended_model_ids || [],
        alternative_model_ids: t.alternative_model_ids || [],
        auto_select_criteria: (t.auto_select_criteria as Record<string, unknown>) || {},
        requires_vision: t.requires_vision ?? false,
        requires_image_gen: t.requires_image_gen ?? false
      }));
      
      setTaskDefinitions(typedTasks);
    };

    fetchTasks();
  }, []);

  // Fetch project-specific settings
  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    const fetchProjectSettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('project_ai_settings')
        .select('*')
        .eq('project_id', projectId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching project AI settings:', error);
      }
      
      if (data) {
        const safetySettings = data.safety_settings as Record<string, boolean> | null;
        const settings: ProjectAISettings = {
          id: data.id,
          project_id: data.project_id,
          auto_mode: data.auto_mode ?? true,
          default_text_model: data.default_text_model || 'google/gemini-2.5-flash',
          default_image_model: data.default_image_model || 'google/gemini-2.5-flash-image',
          task_model_overrides: (data.task_model_overrides as Record<string, string>) || {},
          safety_settings: {
            prevent_face_likeness: safetySettings?.prevent_face_likeness ?? true,
            prevent_style_drift: safetySettings?.prevent_style_drift ?? true,
            enforce_look_lock: safetySettings?.enforce_look_lock ?? true
          }
        };
        setProjectSettings(settings);
      }
      
      setIsLoading(false);
    };

    fetchProjectSettings();
  }, [projectId]);

  // Auto-select model based on task context
  const autoSelectModel = useCallback((context: TaskContext): ModelSelectionResult => {
    const taskDef = taskDefinitions.find(t => t.task_key === context.task_key);
    const warnings: string[] = [];
    
    // Get recommended models for this task
    const recommendedIds = taskDef?.recommended_model_ids || ['google/gemini-2.5-flash'];
    const alternativeIds = taskDef?.alternative_model_ids || [];
    
    // Check for task overrides in project settings
    const overrideModelId = projectSettings?.task_model_overrides?.[context.task_key];
    
    // Filter available models
    const availableModels = models.filter(m => 
      [...recommendedIds, ...alternativeIds].includes(m.model_id)
    );
    
    let selectedModel: AIModel | undefined;
    let selectionReason = '';
    let isOptimal = true;

    // If there's an override, use it
    if (overrideModelId) {
      selectedModel = models.find(m => m.model_id === overrideModelId);
      if (selectedModel) {
        selectionReason = 'User-configured model override';
        if (!recommendedIds.includes(overrideModelId)) {
          warnings.push('Selected model is not recommended for this task');
          isOptimal = false;
        }
      }
    }

    // Auto-selection logic
    if (!selectedModel && projectSettings?.auto_mode !== false) {
      // Priority-based selection
      if (context.requires_accuracy) {
        // Prefer premium models for accuracy
        selectedModel = availableModels.find(m => m.cost_tier === 'premium');
        selectionReason = 'Selected for high accuracy requirement';
      } else if (context.budget_conscious) {
        // Prefer low-cost models
        selectedModel = availableModels.find(m => m.cost_tier === 'low');
        selectionReason = 'Selected for cost efficiency';
      } else if (context.complexity === 'low') {
        // Simple tasks get fast models
        selectedModel = availableModels.find(m => m.speed_tier === 'fast');
        selectionReason = 'Selected for fast processing';
      }

      // Check for vision/image requirements
      if (context.has_vision_input && !selectedModel) {
        selectedModel = availableModels.find(m => 
          m.model_type === 'multimodal' || m.model_type === 'vision'
        );
        selectionReason = 'Selected for vision capability';
      }

      if (context.needs_image_output && !selectedModel) {
        selectedModel = availableModels.find(m => m.model_type === 'image');
        selectionReason = 'Selected for image generation';
      }

      // Project phase consideration
      if (context.project_phase === 'locked' && !selectedModel) {
        // Locked phase = prefer consistency over experimentation
        selectedModel = availableModels.find(m => recommendedIds.includes(m.model_id));
        selectionReason = 'Selected for production consistency';
      }
    }

    // Fallback to first recommended model
    if (!selectedModel) {
      selectedModel = availableModels[0] || models.find(m => m.model_id === 'google/gemini-2.5-flash');
      selectionReason = selectionReason || 'Default recommendation';
    }

    // Build alternatives list
    const alternatives = availableModels.filter(m => m.id !== selectedModel?.id);

    // Create a default model if none found
    const defaultModel: AIModel = {
      id: 'default',
      model_id: 'google/gemini-2.5-flash',
      display_name: 'Gemini 2.5 Flash',
      provider: 'Google',
      model_type: 'multimodal',
      strengths: ['General purpose'],
      limitations: [],
      supported_tasks: [],
      cost_tier: 'medium',
      speed_tier: 'fast',
      is_active: true,
      config: {}
    };

    return {
      selected_model: selectedModel || defaultModel,
      selection_reason: selectionReason,
      alternatives,
      is_optimal: isOptimal,
      warnings
    };
  }, [models, taskDefinitions, projectSettings]);

  // Update project AI settings
  const updateProjectSettings = async (settings: Partial<ProjectAISettings>) => {
    if (!projectId) return;

    // Convert to database format
    const dbSettings: Record<string, unknown> = {};
    if (settings.auto_mode !== undefined) dbSettings.auto_mode = settings.auto_mode;
    if (settings.default_text_model) dbSettings.default_text_model = settings.default_text_model;
    if (settings.default_image_model) dbSettings.default_image_model = settings.default_image_model;
    if (settings.task_model_overrides) dbSettings.task_model_overrides = settings.task_model_overrides as Json;
    if (settings.safety_settings) dbSettings.safety_settings = settings.safety_settings as unknown as Json;

    const { data: existing } = await supabase
      .from('project_ai_settings')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('project_ai_settings')
        .update(dbSettings)
        .eq('project_id', projectId);
      
      if (error) {
        toast({ title: 'Error updating AI settings', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('project_ai_settings')
        .insert({ project_id: projectId, ...dbSettings });
      
      if (error) {
        toast({ title: 'Error creating AI settings', variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'AI settings updated' });
    setProjectSettings(prev => prev ? { ...prev, ...settings } : null);
  };

  // Log AI task output for traceability
  const logTaskOutput = async (
    taskKey: string,
    modelId: string,
    inputData: Record<string, unknown>,
    outputData: Record<string, unknown>,
    params: {
      seed?: number;
      executionTimeMs?: number;
      tokenUsage?: Record<string, number>;
      status?: 'completed' | 'failed';
      errorMessage?: string;
    } = {}
  ) => {
    const { error } = await supabase
      .from('ai_task_outputs')
      .insert({
        project_id: projectId || null,
        task_key: taskKey,
        model_id: modelId,
        input_data: inputData as Json,
        output_data: outputData as Json,
        seed: params.seed || null,
        execution_time_ms: params.executionTimeMs || null,
        token_usage: (params.tokenUsage || {}) as Json,
        status: params.status || 'completed',
        error_message: params.errorMessage || null
      });

    if (error) {
      console.error('Error logging task output:', error);
    }
  };

  // Get model info from static registry
  const getModelInfo = (modelId: AIModelId) => {
    return AI_MODELS[modelId] || null;
  };

  // Get models for a specific task
  const getModelsForTask = (taskKey: string) => {
    const taskDef = taskDefinitions.find(t => t.task_key === taskKey);
    if (!taskDef) return models;

    const allTaskModels = [...taskDef.recommended_model_ids, ...taskDef.alternative_model_ids];
    return models.filter(m => allTaskModels.includes(m.model_id));
  };

  return {
    models,
    taskDefinitions,
    projectSettings,
    isLoading,
    autoSelectModel,
    updateProjectSettings,
    logTaskOutput,
    getModelInfo,
    getModelsForTask
  };
}
