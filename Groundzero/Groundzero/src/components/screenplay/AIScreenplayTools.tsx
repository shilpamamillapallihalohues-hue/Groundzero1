import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Camera, MessageSquareText, Link2, Eye, StickyNote,
  Loader2, ChevronRight, Sparkles, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIScreenplayToolsProps {
  projectId: string;
  currentSceneContent?: string;
  currentSceneSlugline?: string;
  onClose: () => void;
}

type AITool = 'scene-breakdown' | 'dialogue-assist' | 'continuity' | 'visual-elements' | 'director-notes';

const AI_TOOLS: { id: AITool; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'scene-breakdown', label: 'Scene Breakdown', icon: <Camera className="h-4 w-4" />, description: 'Analyze shots, angles, lighting & mood' },
  { id: 'dialogue-assist', label: 'Dialogue Assistant', icon: <MessageSquareText className="h-4 w-4" />, description: 'Improve tone, rewrites & consistency' },
  { id: 'continuity', label: 'Continuity Check', icon: <Link2 className="h-4 w-4" />, description: 'Verify scene logic & connections' },
  { id: 'visual-elements', label: 'Visual Elements', icon: <Eye className="h-4 w-4" />, description: 'Suggest props, environments & cues' },
  { id: 'director-notes', label: 'Director Notes', icon: <StickyNote className="h-4 w-4" />, description: 'Generate directing notes from context' },
];

export function AIScreenplayTools({ projectId, currentSceneContent, currentSceneSlugline, onClose }: AIScreenplayToolsProps) {
  const [activeTool, setActiveTool] = useState<AITool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runAITool = async (tool: AITool) => {
    if (!currentSceneContent) {
      toast.error('Select a scene with content first');
      return;
    }
    
    setActiveTool(tool);
    setIsLoading(true);
    setResult(null);

    const prompts: Record<AITool, string> = {
      'scene-breakdown': `Analyze this screenplay scene and provide a production breakdown including: suggested shots, camera angles, lighting mood, and shot types. Be concise and practical.\n\nScene: ${currentSceneSlugline || ''}\n\n${currentSceneContent}`,
      'dialogue-assist': `Review the dialogue in this scene. Suggest improvements for tone, character voice consistency, and natural flow. Provide 2-3 specific rewrite suggestions.\n\nScene: ${currentSceneSlugline || ''}\n\n${currentSceneContent}`,
      'continuity': `Check this scene for continuity issues. Identify any logical gaps, timeline inconsistencies, or character behavior that seems inconsistent. Note props and wardrobe that need tracking.\n\nScene: ${currentSceneSlugline || ''}\n\n${currentSceneContent}`,
      'visual-elements': `Identify key visual elements for this scene that production needs to prepare. List props, set dressing, environmental elements, and visual cues that enhance the storytelling.\n\nScene: ${currentSceneSlugline || ''}\n\n${currentSceneContent}`,
      'director-notes': `Generate concise directing notes for this scene. Include guidance on: emotional beats, pacing, actor direction, and key moments to emphasize. Write as if you're a film director leaving notes for yourself.\n\nScene: ${currentSceneSlugline || ''}\n\n${currentSceneContent}`,
    };

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || supabaseKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-screenplay-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ prompt: prompts[tool], tool }),
      });

      if (!response.ok) {
        // Fallback: show a helpful placeholder
        setResult(`AI analysis is not yet configured for this project. To enable AI tools, ensure the edge function 'ai-screenplay-tools' is deployed.\n\nIn the meantime, here's what this tool would analyze for "${currentSceneSlugline || 'this scene'}":\n\n${tool === 'scene-breakdown' ? '• Shot list with camera angles\n• Lighting setup recommendations\n• Mood & atmosphere notes\n• Coverage plan' : tool === 'dialogue-assist' ? '• Dialogue tone analysis\n• Character voice consistency\n• Rewrite suggestions\n• Pacing improvements' : tool === 'continuity' ? '• Timeline consistency\n• Prop/wardrobe tracking\n• Character positioning\n• Logical flow verification' : tool === 'visual-elements' ? '• Key props needed\n• Set dressing requirements\n• Environmental elements\n• Visual storytelling cues' : '• Emotional beat mapping\n• Actor direction notes\n• Pacing guidance\n• Key moments to emphasize'}`);
        return;
      }

      const data = await response.json();
      setResult(data.result || 'No analysis available.');
    } catch (err: any) {
      console.error('AI tool error:', err);
      setResult(`Unable to connect to AI service. The tool would provide analysis for: ${AI_TOOLS.find(t => t.id === tool)?.description}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Tools</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Tool buttons */}
          {AI_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => runAITool(tool.id)}
              disabled={isLoading}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all group',
                activeTool === tool.id
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'p-1.5 rounded-md',
                  activeTool === tool.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                )}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{tool.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{tool.description}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          ))}

          {/* Result */}
          {(isLoading || result) && (
            <div className="mt-3 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="text-xs font-medium text-primary">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {AI_TOOLS.find(t => t.id === activeTool)?.label}
                    </Badge>
                  </>
                )}
              </div>
              {result && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {result}
                </div>
              )}
            </div>
          )}

          {!currentSceneContent && (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Select a scene to use AI tools</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
