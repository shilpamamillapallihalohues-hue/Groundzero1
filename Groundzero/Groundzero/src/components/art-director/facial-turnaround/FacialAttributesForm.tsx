import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

export interface FacialAttributes {
  characterName: string;
  gender: 'male' | 'female' | 'neutral' | '';
  ageRange: 'child' | 'young_adult' | 'adult' | 'middle_aged' | 'elderly' | '';
  ethnicityHints: string;
  skinTone: string;
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond' | '';
  eyeShape: string;
  eyeColor: string;
  noseType: string;
  lipShape: string;
  hairStyle: string;
  hairColor: string;
  facialHair: string;
  distinguishingFeatures: string[];
}

interface FacialAttributesFormProps {
  attributes: FacialAttributes;
  onChange: (attributes: FacialAttributes) => void;
}

export function FacialAttributesForm({ attributes, onChange }: FacialAttributesFormProps) {
  const [newFeature, setNewFeature] = useState('');

  const handleChange = <K extends keyof FacialAttributes>(key: K, value: FacialAttributes[K]) => {
    onChange({ ...attributes, [key]: value });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      handleChange('distinguishingFeatures', [...attributes.distinguishingFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    handleChange('distinguishingFeatures', attributes.distinguishingFeatures.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Character Name */}
      <div className="space-y-2">
        <Label htmlFor="characterName">Character Name *</Label>
        <Input
          id="characterName"
          value={attributes.characterName}
          onChange={(e) => handleChange('characterName', e.target.value)}
          placeholder="e.g., Shiva, Parvati"
        />
      </div>

      {/* Basic Attributes Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={attributes.gender} onValueChange={(v) => handleChange('gender', v as FacialAttributes['gender'])}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="neutral">Neutral/Androgynous</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Age Range</Label>
          <Select value={attributes.ageRange} onValueChange={(v) => handleChange('ageRange', v as FacialAttributes['ageRange'])}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="child">Child (5-12)</SelectItem>
              <SelectItem value="young_adult">Young Adult (18-30)</SelectItem>
              <SelectItem value="adult">Adult (30-45)</SelectItem>
              <SelectItem value="middle_aged">Middle-Aged (45-60)</SelectItem>
              <SelectItem value="elderly">Elderly (60+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Face Shape</Label>
          <Select value={attributes.faceShape} onValueChange={(v) => handleChange('faceShape', v as FacialAttributes['faceShape'])}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oval">Oval</SelectItem>
              <SelectItem value="round">Round</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="heart">Heart</SelectItem>
              <SelectItem value="oblong">Oblong</SelectItem>
              <SelectItem value="diamond">Diamond</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ethnicity & Skin */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Ethnicity Hints</Label>
          <Input
            value={attributes.ethnicityHints}
            onChange={(e) => handleChange('ethnicityHints', e.target.value)}
            placeholder="e.g., South Asian, Mediterranean"
          />
        </div>
        <div className="space-y-2">
          <Label>Skin Tone</Label>
          <Input
            value={attributes.skinTone}
            onChange={(e) => handleChange('skinTone', e.target.value)}
            placeholder="e.g., Warm brown, Fair, Olive"
          />
        </div>
      </div>

      {/* Eye Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Eye Shape</Label>
          <Input
            value={attributes.eyeShape}
            onChange={(e) => handleChange('eyeShape', e.target.value)}
            placeholder="e.g., Almond, Round, Hooded"
          />
        </div>
        <div className="space-y-2">
          <Label>Eye Color</Label>
          <Input
            value={attributes.eyeColor}
            onChange={(e) => handleChange('eyeColor', e.target.value)}
            placeholder="e.g., Dark brown, Amber"
          />
        </div>
      </div>

      {/* Nose & Lips */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Nose Type</Label>
          <Input
            value={attributes.noseType}
            onChange={(e) => handleChange('noseType', e.target.value)}
            placeholder="e.g., Aquiline, Straight, Button"
          />
        </div>
        <div className="space-y-2">
          <Label>Lip Shape</Label>
          <Input
            value={attributes.lipShape}
            onChange={(e) => handleChange('lipShape', e.target.value)}
            placeholder="e.g., Full, Thin, Bow-shaped"
          />
        </div>
      </div>

      {/* Hair */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Hair Style</Label>
          <Input
            value={attributes.hairStyle}
            onChange={(e) => handleChange('hairStyle', e.target.value)}
            placeholder="e.g., Long wavy, Short cropped, Bald"
          />
        </div>
        <div className="space-y-2">
          <Label>Hair Color</Label>
          <Input
            value={attributes.hairColor}
            onChange={(e) => handleChange('hairColor', e.target.value)}
            placeholder="e.g., Black, Grey streaks, White"
          />
        </div>
      </div>

      {/* Facial Hair */}
      <div className="space-y-2">
        <Label>Facial Hair</Label>
        <Input
          value={attributes.facialHair}
          onChange={(e) => handleChange('facialHair', e.target.value)}
          placeholder="e.g., Full beard, Clean shaven, Stubble"
        />
      </div>

      {/* Distinguishing Features */}
      <div className="space-y-2">
        <Label>Distinguishing Features</Label>
        <div className="flex gap-2">
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="e.g., Scar on left cheek, Third eye mark"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
          />
          <Button type="button" size="icon" variant="outline" onClick={addFeature}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {attributes.distinguishingFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {attributes.distinguishingFeatures.map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="pr-1">
                {feature}
                <button 
                  onClick={() => removeFeature(idx)}
                  className="ml-1.5 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
