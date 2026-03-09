import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SEQUENCE_METHOD_STEPS } from '@/types/storyFrameworks';
import { AlertTriangle } from 'lucide-react';

interface SequenceTensionCurveProps {
  sequenceData: {
    sequenceId: string;
    tension: number;
    sceneCount: number;
    hasPayoff: boolean;
  }[];
}

export function SequenceTensionCurve({ sequenceData }: SequenceTensionCurveProps) {
  const chartData = SEQUENCE_METHOD_STEPS.map((seq, index) => {
    const data = sequenceData.find(d => d.sequenceId === seq.id);
    return {
      name: `Seq ${index + 1}`,
      fullName: seq.name,
      tension: data?.tension || 0,
      sceneCount: data?.sceneCount || 0,
      hasPayoff: data?.hasPayoff ?? false,
      color: seq.color,
    };
  });

  // Identify flat sequences (low tension change between sequences)
  const flatSequences = chartData.filter((seq, index) => {
    if (index === 0) return false;
    const prevTension = chartData[index - 1].tension;
    return Math.abs(seq.tension - prevTension) < 10 && seq.tension < 50;
  });

  // Identify sequences without payoff
  const noPayoffSequences = chartData.filter(seq => !seq.hasPayoff && seq.tension > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.fullName}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-muted-foreground">
              Tension Level: <span className="text-foreground font-medium">{data.tension}%</span>
            </p>
            <p className="text-muted-foreground">
              Scenes: <span className="text-foreground font-medium">{data.sceneCount}</span>
            </p>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Payoff:</span>
              {data.hasPayoff ? (
                <Badge variant="default" className="text-xs">Yes</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Missing</Badge>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sequence Tension Curve</CardTitle>
          {(flatSequences.length > 0 || noPayoffSequences.length > 0) && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {flatSequences.length + noPayoffSequences.length} Issues Found
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="tensionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="Midpoint" />
              <Area 
                type="monotone" 
                dataKey="tension" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#tensionGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Issues Summary */}
        {(flatSequences.length > 0 || noPayoffSequences.length > 0) && (
          <div className="mt-4 pt-4 border-t space-y-2">
            {flatSequences.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">Flat Sequences Detected</p>
                  <p className="text-muted-foreground">
                    {flatSequences.map(s => s.fullName).join(', ')} - Consider adding tension escalation
                  </p>
                </div>
              </div>
            )}
            {noPayoffSequences.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Missing Payoffs</p>
                  <p className="text-muted-foreground">
                    {noPayoffSequences.map(s => s.fullName).join(', ')} - Sequences should resolve tension
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
