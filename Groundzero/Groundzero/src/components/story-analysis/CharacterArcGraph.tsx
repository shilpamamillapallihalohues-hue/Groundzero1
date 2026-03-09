import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useState } from 'react';
import { CharacterArcPoint } from '@/types/storyFrameworks';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CharacterArcGraphProps {
  characters: string[];
  arcData: CharacterArcPoint[];
}

export function CharacterArcGraph({ characters, arcData }: CharacterArcGraphProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string>(characters[0] || '');

  const characterData = arcData
    .filter(point => point.characterName === selectedCharacter)
    .sort((a, b) => a.sceneNumber - b.sceneNumber);

  const chartData = characterData.map(point => ({
    scene: `Scene ${point.sceneNumber}`,
    growth: point.growthIndicator,
    state: point.emotionalState,
  }));

  // Calculate overall arc trend
  const getArcTrend = () => {
    if (chartData.length < 2) return 'flat';
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b.growth, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.growth, 0) / secondHalf.length;
    
    if (secondAvg - firstAvg > 20) return 'positive';
    if (firstAvg - secondAvg > 20) return 'negative';
    return 'flat';
  };

  const trend = getArcTrend();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            Growth: <span className={payload[0].value > 0 ? 'text-green-500' : payload[0].value < 0 ? 'text-red-500' : ''}>
              {payload[0].value > 0 ? '+' : ''}{payload[0].value}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            State: {payload[0].payload.state}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Character Arc
            {trend === 'positive' && (
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                <TrendingUp className="h-3 w-3 mr-1" /> Positive Arc
              </Badge>
            )}
            {trend === 'negative' && (
              <Badge variant="default" className="bg-red-500/10 text-red-500 border-red-500/20">
                <TrendingDown className="h-3 w-3 mr-1" /> Negative Arc
              </Badge>
            )}
            {trend === 'flat' && (
              <Badge variant="secondary">
                <Minus className="h-3 w-3 mr-1" /> Flat Arc
              </Badge>
            )}
          </CardTitle>
          <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select character" />
            </SelectTrigger>
            <SelectContent>
              {characters.map(char => (
                <SelectItem key={char} value={char}>{char}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="scene" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[-100, 100]} 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => value > 0 ? `+${value}` : value}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="growth" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Select a character to view their arc</p>
          </div>
        )}

        {/* Arc Analysis */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-500">
              {chartData.filter(d => d.growth > 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Positive Moments</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {chartData.filter(d => d.growth === 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Neutral Moments</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">
              {chartData.filter(d => d.growth < 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Struggle Moments</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
