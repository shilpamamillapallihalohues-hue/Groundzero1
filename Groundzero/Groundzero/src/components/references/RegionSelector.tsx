import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Crop, Save, X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegionData {
  x: number; y: number; width: number; height: number;
}

interface RegionSelectorProps {
  imageUrl: string;
  isActive: boolean;
  onToggle: () => void;
  onSaveRegion: (region: RegionData, label: string) => Promise<void>;
  existingRegions?: { label: string; region_data: RegionData }[];
}

export default function RegionSelector({ imageUrl, isActive, onToggle, onSaveRegion, existingRegions = [] }: RegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRegion, setCurrentRegion] = useState<RegionData | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setStartPos(pos);
    setIsDrawing(true);
    setCurrentRegion(null);
  }, [isActive, getRelativePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPos) return;
    const pos = getRelativePos(e);
    setCurrentRegion({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  }, [isDrawing, startPos, getRelativePos]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setStartPos(null);
  }, []);

  const handleSave = async () => {
    if (!currentRegion || !label.trim()) return;
    setSaving(true);
    try {
      await onSaveRegion(currentRegion, label.trim());
      setCurrentRegion(null);
      setLabel('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn("relative", isActive && "cursor-crosshair")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img src={imageUrl} alt="Reference" className="w-full h-auto" />
        
        {/* Existing regions */}
        {existingRegions.map((r, i) => (
          <div
            key={i}
            className="absolute border-2 border-primary/70 bg-primary/10 pointer-events-none"
            style={{
              left: `${r.region_data.x}%`,
              top: `${r.region_data.y}%`,
              width: `${r.region_data.width}%`,
              height: `${r.region_data.height}%`,
            }}
          >
            <span className="absolute -top-5 left-0 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm whitespace-nowrap">
              {r.label}
            </span>
          </div>
        ))}

        {/* Current selection */}
        {currentRegion && (
          <div
            className="absolute border-2 border-primary bg-primary/20 animate-pulse"
            style={{
              left: `${currentRegion.x}%`,
              top: `${currentRegion.y}%`,
              width: `${currentRegion.width}%`,
              height: `${currentRegion.height}%`,
            }}
          />
        )}
      </div>

      {/* Save region panel */}
      {currentRegion && !isDrawing && (
        <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <p className="text-xs font-medium text-primary">Region Selected</p>
          <div className="flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Crown design, Trident detail)"
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" className="h-8 gap-1.5" onClick={handleSave} disabled={!label.trim() || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setCurrentRegion(null); setLabel(''); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
