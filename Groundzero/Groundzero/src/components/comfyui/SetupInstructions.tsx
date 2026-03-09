import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Terminal, 
  Globe, 
  Link2, 
  CheckCircle2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface SetupInstructionsProps {
  isConnected: boolean;
}

export function SetupInstructions({ isConnected }: SetupInstructionsProps) {
  const [isExpanded, setIsExpanded] = useState(!isConnected);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      title: 'Install ComfyUI',
      description: 'Download and install ComfyUI on your local machine',
      command: 'git clone https://github.com/comfyanonymous/ComfyUI.git',
      link: 'https://github.com/comfyanonymous/ComfyUI',
      icon: Download,
    },
    {
      title: 'Start ComfyUI Server',
      description: 'Run ComfyUI with the listen flag to accept external connections',
      command: 'python main.py --listen 0.0.0.0 --port 8188',
      icon: Terminal,
    },
    {
      title: 'Install & Run ngrok',
      description: 'Create a secure tunnel to expose your local ComfyUI server',
      command: 'ngrok http 8188',
      link: 'https://ngrok.com/download',
      icon: Globe,
    },
    {
      title: 'Connect to SceneCraft',
      description: 'Copy your ngrok URL (e.g., https://xxxx.ngrok-free.app) and paste it above',
      icon: Link2,
    },
  ];

  return (
    <Card className={`transition-all duration-300 ${isConnected ? 'border-success/30 bg-success/5' : 'border-primary/20'}`}>
      <CardHeader 
        className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {isConnected ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Terminal className="h-5 w-5 text-primary" />
              )}
              Local Setup Instructions
            </CardTitle>
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Connected' : '4 Steps'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isLastStep = index === steps.length - 1;
              
              return (
                <div 
                  key={index} 
                  className={`relative pl-8 pb-4 ${!isLastStep ? 'border-l-2 border-border ml-3' : 'ml-3'}`}
                >
                  {/* Step Number Circle */}
                  <div className={`absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isConnected && index < 4 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {isConnected ? <Check className="h-3 w-3" /> : index + 1}
                  </div>

                  {/* Step Content */}
                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <StepIcon className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      {step.link && (
                        <a 
                          href={step.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                    
                    {step.command && (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto">
                          {step.command}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(step.command!, index);
                          }}
                        >
                          {copiedStep === index ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Tips */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium text-sm mb-2">💡 Tips</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Make sure Python 3.10+ is installed on your system</li>
              <li>• For GPU acceleration, install CUDA (NVIDIA) or ROCm (AMD)</li>
              <li>• Download models from <a href="https://civitai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CivitAI</a> or <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Hugging Face</a></li>
              <li>• Place models in <code className="bg-muted px-1 rounded">ComfyUI/models/checkpoints/</code></li>
              <li>• Export workflows using "Save (API Format)" for best compatibility</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
