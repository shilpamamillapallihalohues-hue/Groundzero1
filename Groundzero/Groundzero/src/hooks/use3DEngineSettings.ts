import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Engine3DConfig {
  default_engine: 'meshy' | 'tripo' | 'comfyui';
  comfyui_enabled: boolean;
  comfyui_url: string | null;
  meshy_enabled: boolean;
  tripo_enabled: boolean;
}

const DEFAULT_CONFIG: Engine3DConfig = {
  default_engine: 'tripo',
  comfyui_enabled: true,
  comfyui_url: null,
  meshy_enabled: true,
  tripo_enabled: true,
};

export function use3DEngineSettings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-settings-3d'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', '3d_engine_config')
        .single();
      
      if (error) {
        console.error('Error fetching 3D engine settings:', error);
        return DEFAULT_CONFIG;
      }
      
      return (data?.setting_value as unknown as Engine3DConfig) || DEFAULT_CONFIG;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    settings: data || DEFAULT_CONFIG,
    isLoading,
    error,
    refetch,
    defaultEngine: data?.default_engine || 'tripo',
    isTripoEnabled: data?.tripo_enabled ?? true,
    isMeshyEnabled: data?.meshy_enabled ?? true,
    isComfyUIEnabled: data?.comfyui_enabled ?? true,
    comfyuiUrl: data?.comfyui_url || null,
  };
}
