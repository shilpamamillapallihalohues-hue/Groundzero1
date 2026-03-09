import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, User, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AIGenerationDisclaimerProps {
  stage: 'script' | 'concept_art' | 'storyboard' | 'edit_lineup' | 'animatic' | 'technical_planning';
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
}

const STAGE_INFO = {
  script: {
    aiDoes: ['Parse script structure', 'Extract scenes & characters', 'Identify props & locations', 'Suggest scene titles'],
    humanDoes: ['Edit scene descriptions', 'Merge/split scenes', 'Rename scenes', 'Add/remove characters', 'Override AI decisions'],
    important: 'AI output is a draft. All scene data must be human-reviewed before locking.',
  },
  concept_art: {
    aiDoes: ['Generate environment concepts', 'Create character drafts', 'Suggest prop designs', 'Apply style directions'],
    humanDoes: ['Accept, modify, or reject AI concepts', 'Upload manual concepts', 'Combine AI + human art', 'Approve visual reference'],
    important: 'AI concepts are suggestions only. Approved concepts become binding visual reference.',
  },
  storyboard: {
    aiDoes: ['Suggest shot list per scene', 'Recommend shot types & angles', 'Estimate durations', 'Suggest camera movements'],
    humanDoes: ['Modify shot descriptions', 'Delete AI-generated shots', 'Add new shots', 'Change camera language', 'Redraw panels'],
    important: 'Shot IDs are frozen after approval. All production must use approved shot IDs.',
  },
  edit_lineup: {
    aiDoes: ['Suggest pacing issues', 'Flag abrupt transitions', 'Analyze narrative flow'],
    humanDoes: ['Reorder shots', 'Remove/add shots', 'Lock narrative flow', 'Final approval'],
    important: 'This is primarily a human-driven stage. AI provides suggestions only.',
  },
  animatic: {
    aiDoes: ['Generate rough animatic', 'Suggest camera moves', 'Place temp dialogue', 'Suggest timings'],
    humanDoes: ['Adjust timing', 'Change camera paths', 'Replace AI animatic', 'Manually animate sequences'],
    important: 'Timing and camera intent are locked after approval. Animation must follow this.',
  },
  technical_planning: {
    aiDoes: ['Estimate render time', 'Suggest pipeline type', 'Flag heavy FX scenes'],
    humanDoes: ['Define final pipeline', 'Choose software stack', 'Set render strategy', 'Assess budget feasibility'],
    important: 'Production remains LOCKED until Technical Planning is approved. This is the final gate.',
  },
};

export function AIGenerationDisclaimer({ stage, variant = 'banner', className }: AIGenerationDisclaimerProps) {
  const info = STAGE_INFO[stage];

  if (variant === 'compact') {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <span className="font-medium">AI generates drafts.</span> Humans review, modify, and approve.
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-muted-foreground">{info.important}</p>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">AI + Human Collaboration</p>
            <p className="text-xs text-muted-foreground">AI accelerates. Humans control.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* AI Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              AI Generates
            </div>
            <ul className="space-y-1">
              {info.aiDoes.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary/60">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Human Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <User className="w-4 h-4" />
              Humans Control
            </div>
            <ul className="space-y-1">
              {info.humanDoes.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500/60 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Important notice */}
        <div className="mt-4 pt-3 border-t flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600">{info.important}</p>
        </div>
      </CardContent>
    </Card>
  );
}