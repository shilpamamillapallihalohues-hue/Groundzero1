// ComfyUI Workflow Parser - Extracts input nodes for dynamic UI generation

export interface WorkflowNode {
  id: string;
  type: string;
  title?: string;
  inputs: Record<string, any>;
  widgets_values?: any[];
  class_type?: string;
}

export interface ParsedInput {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  inputName: string;
  inputType: 'text' | 'number' | 'slider' | 'select' | 'image' | 'boolean' | 'seed';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  widgetIndex?: number;
}

export interface ParsedWorkflow {
  name: string;
  inputs: ParsedInput[];
  rawWorkflow: any;
  outputNodeId?: string;
}

// Node types that have user-configurable inputs
const INPUT_NODE_TYPES: Record<string, { inputs: { name: string; type: ParsedInput['inputType']; min?: number; max?: number; step?: number }[] }> = {
  // === Samplers ===
  'KSampler': {
    inputs: [
      { name: 'seed', type: 'seed' },
      { name: 'steps', type: 'slider', min: 1, max: 150, step: 1 },
      { name: 'cfg', type: 'slider', min: 1, max: 30, step: 0.5 },
      { name: 'denoise', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },
  'KSamplerAdvanced': {
    inputs: [
      { name: 'noise_seed', type: 'seed' },
      { name: 'steps', type: 'slider', min: 1, max: 150, step: 1 },
      { name: 'cfg', type: 'slider', min: 1, max: 30, step: 0.5 },
      { name: 'start_at_step', type: 'slider', min: 0, max: 150, step: 1 },
      { name: 'end_at_step', type: 'slider', min: 0, max: 150, step: 1 },
    ]
  },
  'SamplerCustom': {
    inputs: [
      { name: 'add_noise', type: 'boolean' },
      { name: 'noise_seed', type: 'seed' },
      { name: 'cfg', type: 'slider', min: 1, max: 30, step: 0.5 },
    ]
  },
  'SamplerCustomAdvanced': {
    inputs: [
      { name: 'noise_seed', type: 'seed' },
    ]
  },

  // === Text Encoders ===
  'CLIPTextEncode': {
    inputs: [
      { name: 'text', type: 'text' }
    ]
  },
  'CLIPTextEncodeSDXL': {
    inputs: [
      { name: 'text_g', type: 'text' },
      { name: 'text_l', type: 'text' },
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'crop_w', type: 'slider', min: 0, max: 4096, step: 64 },
      { name: 'crop_h', type: 'slider', min: 0, max: 4096, step: 64 },
      { name: 'target_width', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'target_height', type: 'slider', min: 64, max: 4096, step: 64 },
    ]
  },
  'CLIPTextEncodeFlux': {
    inputs: [
      { name: 'clip_l', type: 'text' },
      { name: 't5xxl', type: 'text' },
      { name: 'guidance', type: 'slider', min: 0, max: 100, step: 0.5 },
    ]
  },
  'ConditioningCombine': {
    inputs: []
  },
  'ConditioningAverage': {
    inputs: [
      { name: 'conditioning_to_strength', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },
  'ConditioningSetArea': {
    inputs: [
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'x', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'y', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'strength', type: 'slider', min: 0, max: 10, step: 0.01 },
    ]
  },
  'ConditioningSetMask': {
    inputs: [
      { name: 'strength', type: 'slider', min: 0, max: 10, step: 0.01 },
      { name: 'set_cond_area', type: 'select' },
    ]
  },

  // === Latent Nodes ===
  'EmptyLatentImage': {
    inputs: [
      { name: 'width', type: 'slider', min: 64, max: 2048, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 2048, step: 64 },
      { name: 'batch_size', type: 'slider', min: 1, max: 16, step: 1 },
    ]
  },
  'EmptySD3LatentImage': {
    inputs: [
      { name: 'width', type: 'slider', min: 64, max: 2048, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 2048, step: 64 },
      { name: 'batch_size', type: 'slider', min: 1, max: 16, step: 1 },
    ]
  },
  'LatentUpscale': {
    inputs: [
      { name: 'upscale_method', type: 'select' },
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'crop', type: 'select' },
    ]
  },
  'LatentUpscaleBy': {
    inputs: [
      { name: 'upscale_method', type: 'select' },
      { name: 'scale_by', type: 'slider', min: 0.1, max: 8, step: 0.1 },
    ]
  },
  'LatentComposite': {
    inputs: [
      { name: 'x', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'y', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'feather', type: 'slider', min: 0, max: 1024, step: 8 },
    ]
  },
  'LatentBlend': {
    inputs: [
      { name: 'blend_factor', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },
  'LatentFromBatch': {
    inputs: [
      { name: 'batch_index', type: 'slider', min: 0, max: 64, step: 1 },
      { name: 'length', type: 'slider', min: 1, max: 64, step: 1 },
    ]
  },
  'RepeatLatentBatch': {
    inputs: [
      { name: 'amount', type: 'slider', min: 1, max: 64, step: 1 },
    ]
  },

  // === Image Nodes ===
  'LoadImage': {
    inputs: [
      { name: 'image', type: 'image' }
    ]
  },
  'SaveImage': {
    inputs: [
      { name: 'filename_prefix', type: 'text' },
    ]
  },
  'PreviewImage': {
    inputs: []
  },
  'ImageScale': {
    inputs: [
      { name: 'upscale_method', type: 'select' },
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'crop', type: 'select' },
    ]
  },
  'ImageScaleBy': {
    inputs: [
      { name: 'upscale_method', type: 'select' },
      { name: 'scale_by', type: 'slider', min: 0.1, max: 8, step: 0.1 },
    ]
  },
  'ImageScaleToTotalPixels': {
    inputs: [
      { name: 'upscale_method', type: 'select' },
      { name: 'megapixels', type: 'slider', min: 0.1, max: 16, step: 0.1 },
    ]
  },
  'ImageInvert': {
    inputs: []
  },
  'ImageBatch': {
    inputs: []
  },
  'ImagePadForOutpaint': {
    inputs: [
      { name: 'left', type: 'slider', min: 0, max: 1024, step: 8 },
      { name: 'top', type: 'slider', min: 0, max: 1024, step: 8 },
      { name: 'right', type: 'slider', min: 0, max: 1024, step: 8 },
      { name: 'bottom', type: 'slider', min: 0, max: 1024, step: 8 },
      { name: 'feathering', type: 'slider', min: 0, max: 256, step: 8 },
    ]
  },
  'ImageCrop': {
    inputs: [
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 8 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 8 },
      { name: 'x', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'y', type: 'slider', min: 0, max: 4096, step: 8 },
    ]
  },
  'ImageBlend': {
    inputs: [
      { name: 'blend_factor', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'blend_mode', type: 'select' },
    ]
  },
  'ImageBlur': {
    inputs: [
      { name: 'blur_radius', type: 'slider', min: 1, max: 31, step: 2 },
      { name: 'sigma', type: 'slider', min: 0.1, max: 10, step: 0.1 },
    ]
  },
  'ImageQuantize': {
    inputs: [
      { name: 'colors', type: 'slider', min: 2, max: 256, step: 1 },
      { name: 'dither', type: 'select' },
    ]
  },
  'ImageSharpen': {
    inputs: [
      { name: 'sharpen_radius', type: 'slider', min: 1, max: 31, step: 2 },
      { name: 'sigma', type: 'slider', min: 0.1, max: 10, step: 0.1 },
      { name: 'alpha', type: 'slider', min: 0, max: 5, step: 0.1 },
    ]
  },

  // === Model Loaders ===
  'CheckpointLoaderSimple': {
    inputs: [
      { name: 'ckpt_name', type: 'select' }
    ]
  },
  'UNETLoader': {
    inputs: [
      { name: 'unet_name', type: 'select' },
      { name: 'weight_dtype', type: 'select' },
    ]
  },
  'DualCLIPLoader': {
    inputs: [
      { name: 'clip_name1', type: 'select' },
      { name: 'clip_name2', type: 'select' },
      { name: 'type', type: 'select' },
    ]
  },
  'TripleCLIPLoader': {
    inputs: [
      { name: 'clip_name1', type: 'select' },
      { name: 'clip_name2', type: 'select' },
      { name: 'clip_name3', type: 'select' },
    ]
  },
  'CLIPLoader': {
    inputs: [
      { name: 'clip_name', type: 'select' },
      { name: 'type', type: 'select' },
    ]
  },
  'VAELoader': {
    inputs: [
      { name: 'vae_name', type: 'select' }
    ]
  },
  'LoraLoader': {
    inputs: [
      { name: 'lora_name', type: 'select' },
      { name: 'strength_model', type: 'slider', min: -2, max: 2, step: 0.01 },
      { name: 'strength_clip', type: 'slider', min: -2, max: 2, step: 0.01 },
    ]
  },
  'LoraLoaderModelOnly': {
    inputs: [
      { name: 'lora_name', type: 'select' },
      { name: 'strength_model', type: 'slider', min: -2, max: 2, step: 0.01 },
    ]
  },
  'UpscaleModelLoader': {
    inputs: [
      { name: 'model_name', type: 'select' }
    ]
  },
  'ControlNetLoader': {
    inputs: [
      { name: 'control_net_name', type: 'select' }
    ]
  },
  'StyleModelLoader': {
    inputs: [
      { name: 'style_model_name', type: 'select' }
    ]
  },
  'CLIPVisionLoader': {
    inputs: [
      { name: 'clip_name', type: 'select' }
    ]
  },
  'GLIGENLoader': {
    inputs: [
      { name: 'gligen_name', type: 'select' }
    ]
  },
  'HypernetworkLoader': {
    inputs: [
      { name: 'hypernetwork_name', type: 'select' },
      { name: 'strength', type: 'slider', min: -2, max: 2, step: 0.01 },
    ]
  },

  // === VAE ===
  'VAEEncode': {
    inputs: []
  },
  'VAEDecode': {
    inputs: []
  },
  'VAEEncodeTiled': {
    inputs: [
      { name: 'tile_size', type: 'slider', min: 256, max: 4096, step: 64 },
    ]
  },
  'VAEDecodeTiled': {
    inputs: [
      { name: 'tile_size', type: 'slider', min: 256, max: 4096, step: 64 },
    ]
  },

  // === ControlNet ===
  'ControlNetApply': {
    inputs: [
      { name: 'strength', type: 'slider', min: 0, max: 2, step: 0.01 },
    ]
  },
  'ControlNetApplyAdvanced': {
    inputs: [
      { name: 'strength', type: 'slider', min: 0, max: 2, step: 0.01 },
      { name: 'start_percent', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'end_percent', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },
  'ControlNetApplySD3': {
    inputs: [
      { name: 'strength', type: 'slider', min: 0, max: 2, step: 0.01 },
      { name: 'start_percent', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'end_percent', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },

  // === Upscale ===
  'ImageUpscaleWithModel': {
    inputs: []
  },

  // === Masks ===
  'LoadImageMask': {
    inputs: [
      { name: 'image', type: 'image' },
      { name: 'channel', type: 'select' },
    ]
  },
  'MaskToImage': {
    inputs: []
  },
  'ImageToMask': {
    inputs: [
      { name: 'channel', type: 'select' },
    ]
  },
  'SolidMask': {
    inputs: [
      { name: 'value', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 8 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 8 },
    ]
  },
  'InvertMask': {
    inputs: []
  },
  'CropMask': {
    inputs: [
      { name: 'x', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'y', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 8 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 8 },
    ]
  },
  'MaskComposite': {
    inputs: [
      { name: 'x', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'y', type: 'slider', min: 0, max: 4096, step: 8 },
      { name: 'operation', type: 'select' },
    ]
  },
  'FeatherMask': {
    inputs: [
      { name: 'left', type: 'slider', min: 0, max: 256, step: 1 },
      { name: 'top', type: 'slider', min: 0, max: 256, step: 1 },
      { name: 'right', type: 'slider', min: 0, max: 256, step: 1 },
      { name: 'bottom', type: 'slider', min: 0, max: 256, step: 1 },
    ]
  },
  'GrowMask': {
    inputs: [
      { name: 'expand', type: 'slider', min: -256, max: 256, step: 1 },
      { name: 'tapered_corners', type: 'boolean' },
    ]
  },
  'ThresholdMask': {
    inputs: [
      { name: 'value', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },

  // === IP-Adapter ===
  'IPAdapterApply': {
    inputs: [
      { name: 'weight', type: 'slider', min: 0, max: 2, step: 0.01 },
      { name: 'start_at', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'end_at', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },
  'IPAdapterUnifiedLoader': {
    inputs: [
      { name: 'preset', type: 'select' },
    ]
  },

  // === Flux Specific ===
  'FluxGuidance': {
    inputs: [
      { name: 'guidance', type: 'slider', min: 0, max: 100, step: 0.5 },
    ]
  },
  'ModelSamplingFlux': {
    inputs: [
      { name: 'max_shift', type: 'slider', min: 0, max: 100, step: 0.1 },
      { name: 'base_shift', type: 'slider', min: 0, max: 100, step: 0.1 },
      { name: 'width', type: 'slider', min: 64, max: 4096, step: 64 },
      { name: 'height', type: 'slider', min: 64, max: 4096, step: 64 },
    ]
  },

  // === Noise ===
  'RandomNoise': {
    inputs: [
      { name: 'noise_seed', type: 'seed' },
    ]
  },
  'BasicScheduler': {
    inputs: [
      { name: 'scheduler', type: 'select' },
      { name: 'steps', type: 'slider', min: 1, max: 150, step: 1 },
      { name: 'denoise', type: 'slider', min: 0, max: 1, step: 0.01 },
    ]
  },
  'KarrasScheduler': {
    inputs: [
      { name: 'steps', type: 'slider', min: 1, max: 150, step: 1 },
      { name: 'sigma_max', type: 'slider', min: 0, max: 1000, step: 0.1 },
      { name: 'sigma_min', type: 'slider', min: 0, max: 10, step: 0.001 },
      { name: 'rho', type: 'slider', min: 0.1, max: 100, step: 0.1 },
    ]
  },
  'BasicGuider': {
    inputs: []
  },
  'CFGGuider': {
    inputs: [
      { name: 'cfg', type: 'slider', min: 1, max: 30, step: 0.5 },
    ]
  },

  // === Inpainting ===
  'SetLatentNoiseMask': {
    inputs: []
  },
  'InpaintModelConditioning': {
    inputs: []
  },

  // === Model Patches ===
  'FreeU': {
    inputs: [
      { name: 'b1', type: 'slider', min: 0, max: 3, step: 0.01 },
      { name: 'b2', type: 'slider', min: 0, max: 3, step: 0.01 },
      { name: 's1', type: 'slider', min: 0, max: 3, step: 0.01 },
      { name: 's2', type: 'slider', min: 0, max: 3, step: 0.01 },
    ]
  },
  'FreeU_V2': {
    inputs: [
      { name: 'b1', type: 'slider', min: 0, max: 3, step: 0.01 },
      { name: 'b2', type: 'slider', min: 0, max: 3, step: 0.01 },
      { name: 's1', type: 'slider', min: 0, max: 3, step: 0.01 },
      { name: 's2', type: 'slider', min: 0, max: 3, step: 0.01 },
    ]
  },
  'PatchModelAddDownscale': {
    inputs: [
      { name: 'block_number', type: 'slider', min: 1, max: 32, step: 1 },
      { name: 'downscale_factor', type: 'slider', min: 1, max: 9, step: 0.1 },
      { name: 'start_percent', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'end_percent', type: 'slider', min: 0, max: 1, step: 0.01 },
      { name: 'downscale_after_skip', type: 'boolean' },
    ]
  },
  'PerturbedAttentionGuidance': {
    inputs: [
      { name: 'scale', type: 'slider', min: 0, max: 100, step: 0.1 },
    ]
  },
  'SelfAttentionGuidance': {
    inputs: [
      { name: 'scale', type: 'slider', min: -2, max: 5, step: 0.1 },
      { name: 'blur_sigma', type: 'slider', min: 0, max: 10, step: 0.01 },
    ]
  },

  // === Video (AnimateDiff, etc.) ===
  'VHS_VideoCombine': {
    inputs: [
      { name: 'frame_rate', type: 'slider', min: 1, max: 60, step: 1 },
      { name: 'loop_count', type: 'slider', min: 0, max: 100, step: 1 },
      { name: 'filename_prefix', type: 'text' },
      { name: 'format', type: 'select' },
      { name: 'pingpong', type: 'boolean' },
      { name: 'save_output', type: 'boolean' },
    ]
  },
  'SaveAnimatedWEBP': {
    inputs: [
      { name: 'filename_prefix', type: 'text' },
      { name: 'fps', type: 'slider', min: 1, max: 60, step: 0.1 },
      { name: 'lossless', type: 'boolean' },
      { name: 'quality', type: 'slider', min: 0, max: 100, step: 1 },
      { name: 'method', type: 'select' },
    ]
  },
  'SaveAnimatedPNG': {
    inputs: [
      { name: 'filename_prefix', type: 'text' },
      { name: 'fps', type: 'slider', min: 1, max: 60, step: 0.1 },
      { name: 'compress_level', type: 'slider', min: 0, max: 9, step: 1 },
    ]
  },

  // === Primitive & Utility Nodes ===
  'PrimitiveNode': {
    inputs: [
      { name: 'value', type: 'text' }
    ]
  },
  'Note': {
    inputs: []
  },
  'Reroute': {
    inputs: []
  },
};

// Output node types to identify where results come from
const OUTPUT_NODE_TYPES = ['SaveImage', 'PreviewImage', 'SaveAnimatedWEBP', 'VHS_VideoCombine'];

export function parseComfyUIWorkflow(workflowJson: any, name: string = 'Custom Workflow'): ParsedWorkflow {
  const inputs: ParsedInput[] = [];
  let outputNodeId: string | undefined;

  // Handle both API format and workflow format
  const nodes = workflowJson.nodes || workflowJson;
  const isAPIFormat = !workflowJson.nodes;

  if (isAPIFormat) {
    // API format: { "1": { class_type: "...", inputs: {...} }, ... }
    Object.entries(nodes).forEach(([nodeId, nodeData]: [string, any]) => {
      const classType = nodeData.class_type;
      
      // Check for output node
      if (OUTPUT_NODE_TYPES.includes(classType)) {
        outputNodeId = nodeId;
      }

      const nodeConfig = INPUT_NODE_TYPES[classType];
      if (nodeConfig) {
        nodeConfig.inputs.forEach((inputDef, index) => {
          const currentValue = nodeData.inputs?.[inputDef.name];
          // Skip if it's a link reference (array like [nodeId, outputIndex])
          if (Array.isArray(currentValue)) return;

          inputs.push({
            nodeId,
            nodeType: classType,
            nodeTitle: nodeData._meta?.title || classType,
            inputName: inputDef.name,
            inputType: inputDef.type,
            defaultValue: currentValue ?? getDefaultValue(inputDef.type),
            min: inputDef.min,
            max: inputDef.max,
            step: inputDef.step,
            widgetIndex: index,
          });
        });
      }
    });
  } else {
    // Workflow format (from "Save" in ComfyUI): { nodes: [...], links: [...] }
    (nodes as any[]).forEach((node: any) => {
      const classType = node.type;
      
      // Check for output node
      if (OUTPUT_NODE_TYPES.includes(classType)) {
        outputNodeId = String(node.id);
      }

      const nodeConfig = INPUT_NODE_TYPES[classType];
      if (nodeConfig && node.widgets_values) {
        nodeConfig.inputs.forEach((inputDef, index) => {
          const widgetValue = node.widgets_values[index];
          if (widgetValue === undefined) return;

          inputs.push({
            nodeId: String(node.id),
            nodeType: classType,
            nodeTitle: node.title || classType,
            inputName: inputDef.name,
            inputType: inputDef.type,
            defaultValue: widgetValue,
            min: inputDef.min,
            max: inputDef.max,
            step: inputDef.step,
            widgetIndex: index,
          });
        });
      }
    });
  }

  return {
    name,
    inputs,
    rawWorkflow: workflowJson,
    outputNodeId,
  };
}

function getDefaultValue(type: ParsedInput['inputType']): any {
  switch (type) {
    case 'text': return '';
    case 'number': return 0;
    case 'slider': return 0;
    case 'seed': return -1;
    case 'boolean': return false;
    case 'image': return null;
    case 'select': return '';
    default: return '';
  }
}

export function applyInputsToWorkflow(
  workflow: any, 
  inputs: Record<string, any>,
  parsedInputs: ParsedInput[]
): any {
  const result = JSON.parse(JSON.stringify(workflow));
  const isAPIFormat = !workflow.nodes;

  parsedInputs.forEach(input => {
    const key = `${input.nodeId}_${input.inputName}`;
    const value = inputs[key];
    
    if (value === undefined) return;

    if (isAPIFormat) {
      // API format
      if (result[input.nodeId]?.inputs) {
        result[input.nodeId].inputs[input.inputName] = value;
      }
    } else {
      // Workflow format
      const node = result.nodes?.find((n: any) => String(n.id) === input.nodeId);
      if (node && input.widgetIndex !== undefined) {
        node.widgets_values[input.widgetIndex] = value;
      }
    }
  });

  return result;
}

export function groupInputsByNode(inputs: ParsedInput[]): Map<string, ParsedInput[]> {
  const grouped = new Map<string, ParsedInput[]>();
  
  inputs.forEach(input => {
    const key = `${input.nodeId}_${input.nodeType}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(input);
  });

  return grouped;
}
