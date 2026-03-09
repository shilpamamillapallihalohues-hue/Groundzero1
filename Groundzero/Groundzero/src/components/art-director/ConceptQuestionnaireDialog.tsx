import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Wand2, Sparkles, User, Package, MapPin, Shirt, Car, Bug } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuestionnaireData {
  // Character-specific
  characterAge?: string;
  characterGender?: string;
  characterEthnicity?: string;
  characterAttire?: string;
  characterAccessories?: string;
  characterPose?: string;
  characterExpression?: string;
  characterDistinguishingFeatures?: string;
  characterMythological?: boolean;
  characterDeityType?: string;
  
  // Prop-specific
  propMaterial?: string;
  propSize?: string;
  propCondition?: string;
  propEra?: string;
  propFunction?: string;
  propDetails?: string;
  
  // Environment-specific
  envTimeOfDay?: string;
  envWeather?: string;
  envScale?: string;
  envArchitectureStyle?: string;
  envMood?: string;
  envKeyElements?: string;
  
  // Costume-specific
  costumeEra?: string;
  costumeFabric?: string;
  costumeColors?: string;
  costumeAccessories?: string;
  costumeCondition?: string;
  
  // Vehicle-specific
  vehicleType?: string;
  vehicleEra?: string;
  vehicleCondition?: string;
  vehiclePropulsion?: string;
  vehicleSpecialFeatures?: string;
  
  // Creature-specific
  creatureType?: string;
  creatureSize?: string;
  creatureFeatures?: string;
  creatureBehavior?: string;
  creatureOrigin?: string;
  
  // Common
  additionalDetails?: string;
  styleReference?: string;
}

interface ConceptQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptType: string;
  assetName: string;
  scriptDescription: string;
  onSubmit: (data: QuestionnaireData, generatedDescription: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  character: <User className="h-5 w-5" />,
  prop: <Package className="h-5 w-5" />,
  environment: <MapPin className="h-5 w-5" />,
  costume: <Shirt className="h-5 w-5" />,
  vehicle: <Car className="h-5 w-5" />,
  creature: <Bug className="h-5 w-5" />,
};

const MYTHOLOGICAL_KEYWORDS = [
  'vishnu', 'shiva', 'brahma', 'krishna', 'rama', 'hanuman', 'ganesha', 'durga', 
  'lakshmi', 'saraswati', 'parvati', 'kali', 'indra', 'kartikeya', 'ravana', 'sita',
  'lakshmana', 'arjuna', 'bhima', 'draupadi', 'karna', 'zeus', 'poseidon', 'athena',
  'apollo', 'hercules', 'ra', 'anubis', 'isis', 'odin', 'thor', 'loki', 'andhaka',
  'mahishasura', 'narasimha', 'varaha', 'vamana', 'parashurama', 'kurma', 'matsya'
];

export function ConceptQuestionnaireDialog({
  open,
  onOpenChange,
  conceptType,
  assetName,
  scriptDescription,
  onSubmit,
}: ConceptQuestionnaireDialogProps) {
  const [data, setData] = useState<QuestionnaireData>({});
  
  // Detect if this is likely a mythological character
  const isMythological = MYTHOLOGICAL_KEYWORDS.some(kw => 
    assetName.toLowerCase().includes(kw)
  );

  useEffect(() => {
    if (isMythological && conceptType === 'character') {
      setData(prev => ({ ...prev, characterMythological: true }));
    }
  }, [isMythological, conceptType]);

  const updateData = (key: keyof QuestionnaireData, value: string | boolean) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const generateDescription = (): string => {
    const parts: string[] = [];
    
    // Add asset name prominently
    parts.push(`"${assetName}"`);
    
    switch (conceptType) {
      case 'character':
        if (data.characterMythological) {
          parts.push('mythological/divine character design');
          if (data.characterDeityType) parts.push(data.characterDeityType);
        }
        if (data.characterAge) parts.push(`${data.characterAge} age appearance`);
        if (data.characterGender) parts.push(data.characterGender);
        if (data.characterEthnicity) parts.push(`${data.characterEthnicity} features`);
        if (data.characterAttire) parts.push(`wearing ${data.characterAttire}`);
        if (data.characterAccessories) parts.push(`with ${data.characterAccessories}`);
        if (data.characterPose) parts.push(`${data.characterPose} pose`);
        if (data.characterExpression) parts.push(`${data.characterExpression} expression`);
        if (data.characterDistinguishingFeatures) parts.push(data.characterDistinguishingFeatures);
        parts.push('isolated character design, neutral background, concept art sheet');
        break;
        
      case 'prop':
        parts.push('isolated prop design sheet');
        if (data.propMaterial) parts.push(`made of ${data.propMaterial}`);
        if (data.propSize) parts.push(`${data.propSize} size`);
        if (data.propCondition) parts.push(`${data.propCondition} condition`);
        if (data.propEra) parts.push(`${data.propEra} era styling`);
        if (data.propFunction) parts.push(`functional as ${data.propFunction}`);
        if (data.propDetails) parts.push(data.propDetails);
        parts.push('clean white background, multiple angles, product visualization style');
        break;
        
      case 'environment':
        parts.push('environment concept art');
        if (data.envTimeOfDay) parts.push(`${data.envTimeOfDay} lighting`);
        if (data.envWeather) parts.push(`${data.envWeather} weather`);
        if (data.envScale) parts.push(`${data.envScale} scale`);
        if (data.envArchitectureStyle) parts.push(`${data.envArchitectureStyle} architecture`);
        if (data.envMood) parts.push(`${data.envMood} mood`);
        if (data.envKeyElements) parts.push(`featuring ${data.envKeyElements}`);
        parts.push('establishing shot, wide view, matte painting quality');
        break;
        
      case 'costume':
        parts.push('costume design reference sheet');
        if (data.costumeEra) parts.push(`${data.costumeEra} period`);
        if (data.costumeFabric) parts.push(`${data.costumeFabric} fabric`);
        if (data.costumeColors) parts.push(`${data.costumeColors} color scheme`);
        if (data.costumeAccessories) parts.push(`with ${data.costumeAccessories}`);
        if (data.costumeCondition) parts.push(`${data.costumeCondition} condition`);
        parts.push('fashion illustration style, multiple angles, fabric detail callouts');
        break;
        
      case 'vehicle':
        parts.push('vehicle design sheet');
        if (data.vehicleType) parts.push(data.vehicleType);
        if (data.vehicleEra) parts.push(`${data.vehicleEra} era`);
        if (data.vehicleCondition) parts.push(`${data.vehicleCondition} condition`);
        if (data.vehiclePropulsion) parts.push(`${data.vehiclePropulsion} powered`);
        if (data.vehicleSpecialFeatures) parts.push(data.vehicleSpecialFeatures);
        parts.push('orthographic views, industrial design, clean background');
        break;
        
      case 'creature':
        parts.push('creature design concept art');
        if (data.creatureType) parts.push(data.creatureType);
        if (data.creatureSize) parts.push(`${data.creatureSize} size`);
        if (data.creatureFeatures) parts.push(data.creatureFeatures);
        if (data.creatureBehavior) parts.push(`${data.creatureBehavior} behavior`);
        if (data.creatureOrigin) parts.push(`from ${data.creatureOrigin}`);
        parts.push('anatomy study, creature sheet, neutral background');
        break;
    }
    
    if (data.additionalDetails) {
      parts.push(data.additionalDetails);
    }
    
    if (data.styleReference) {
      parts.push(`style inspired by ${data.styleReference}`);
    }
    
    return parts.filter(Boolean).join(', ');
  };

  const handleSubmit = () => {
    const generatedDescription = generateDescription();
    onSubmit(data, generatedDescription);
    onOpenChange(false);
  };

  const renderQuestions = () => {
    switch (conceptType) {
      case 'character':
        return (
          <div className="space-y-4">
            {isMythological && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                  <Sparkles className="h-4 w-4" />
                  Mythological Character Detected
                </div>
                <p className="text-xs text-muted-foreground">
                  "{assetName}" appears to be a mythological figure. The system will apply traditional iconography.
                </p>
                <div className="mt-2">
                  <Label className="text-xs">Deity/Character Type</Label>
                  <Select value={data.characterDeityType || ''} onValueChange={v => updateData('characterDeityType', v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hindu_deity">Hindu Deity</SelectItem>
                      <SelectItem value="epic_hero">Epic Hero (Ramayana/Mahabharata)</SelectItem>
                      <SelectItem value="demon_asura">Demon/Asura</SelectItem>
                      <SelectItem value="celestial_being">Celestial Being (Apsara/Gandharva)</SelectItem>
                      <SelectItem value="sage_rishi">Sage/Rishi</SelectItem>
                      <SelectItem value="greek_god">Greek God/Goddess</SelectItem>
                      <SelectItem value="norse_god">Norse God</SelectItem>
                      <SelectItem value="egyptian_god">Egyptian God</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Age Appearance</Label>
                <Select value={data.characterAge || ''} onValueChange={v => updateData('characterAge', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child (5-12)</SelectItem>
                    <SelectItem value="teen">Teen (13-19)</SelectItem>
                    <SelectItem value="young_adult">Young Adult (20-35)</SelectItem>
                    <SelectItem value="middle_aged">Middle Aged (36-55)</SelectItem>
                    <SelectItem value="elderly">Elderly (55+)</SelectItem>
                    <SelectItem value="ageless">Ageless/Divine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Gender Presentation</Label>
                <Select value={data.characterGender || ''} onValueChange={v => updateData('characterGender', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="androgynous">Androgynous</SelectItem>
                    <SelectItem value="non_human">Non-Human</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Attire / Costume Description</Label>
              <Textarea 
                className="h-16 text-xs"
                placeholder="Describe the character's clothing, armor, robes, jewelry..."
                value={data.characterAttire || ''}
                onChange={e => updateData('characterAttire', e.target.value)}
              />
            </div>
            
            <div>
              <Label className="text-xs">Accessories / Props</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="Weapons, jewelry, items they carry..."
                value={data.characterAccessories || ''}
                onChange={e => updateData('characterAccessories', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pose</Label>
                <Select value={data.characterPose || ''} onValueChange={v => updateData('characterPose', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standing_neutral">Standing Neutral</SelectItem>
                    <SelectItem value="action_pose">Action Pose</SelectItem>
                    <SelectItem value="seated">Seated</SelectItem>
                    <SelectItem value="heroic_stance">Heroic Stance</SelectItem>
                    <SelectItem value="meditative">Meditative</SelectItem>
                    <SelectItem value="dynamic_movement">Dynamic Movement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Expression</Label>
                <Select value={data.characterExpression || ''} onValueChange={v => updateData('characterExpression', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serene">Serene/Peaceful</SelectItem>
                    <SelectItem value="fierce">Fierce/Intense</SelectItem>
                    <SelectItem value="wise">Wise/Contemplative</SelectItem>
                    <SelectItem value="joyful">Joyful</SelectItem>
                    <SelectItem value="menacing">Menacing</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Distinguishing Features</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="Scars, tattoos, unique physical traits..."
                value={data.characterDistinguishingFeatures || ''}
                onChange={e => updateData('characterDistinguishingFeatures', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 'prop':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Material</Label>
                <Select value={data.propMaterial || ''} onValueChange={v => updateData('propMaterial', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metal">Metal</SelectItem>
                    <SelectItem value="wood">Wood</SelectItem>
                    <SelectItem value="stone">Stone</SelectItem>
                    <SelectItem value="bone">Bone</SelectItem>
                    <SelectItem value="gold">Gold/Precious Metal</SelectItem>
                    <SelectItem value="ceramic">Ceramic/Clay</SelectItem>
                    <SelectItem value="fabric">Fabric/Leather</SelectItem>
                    <SelectItem value="crystal">Crystal/Glass</SelectItem>
                    <SelectItem value="mixed">Mixed Materials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Size</Label>
                <Select value={data.propSize || ''} onValueChange={v => updateData('propSize', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiny">Tiny (palm-sized)</SelectItem>
                    <SelectItem value="small">Small (handheld)</SelectItem>
                    <SelectItem value="medium">Medium (arm's length)</SelectItem>
                    <SelectItem value="large">Large (human-sized)</SelectItem>
                    <SelectItem value="massive">Massive (larger than human)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Condition</Label>
                <Select value={data.propCondition || ''} onValueChange={v => updateData('propCondition', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pristine">Pristine/New</SelectItem>
                    <SelectItem value="well_used">Well Used</SelectItem>
                    <SelectItem value="weathered">Weathered</SelectItem>
                    <SelectItem value="ancient">Ancient/Relic</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="magical">Magical/Glowing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Era/Style</Label>
                <Select value={data.propEra || ''} onValueChange={v => updateData('propEra', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ancient">Ancient</SelectItem>
                    <SelectItem value="medieval">Medieval</SelectItem>
                    <SelectItem value="mythological">Mythological</SelectItem>
                    <SelectItem value="victorian">Victorian</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="futuristic">Futuristic</SelectItem>
                    <SelectItem value="tribal">Tribal/Primitive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Function / Purpose</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="What is this prop used for in the story?"
                value={data.propFunction || ''}
                onChange={e => updateData('propFunction', e.target.value)}
              />
            </div>
            
            <div>
              <Label className="text-xs">Additional Details</Label>
              <Textarea 
                className="h-16 text-xs"
                placeholder="Engravings, symbols, unique features, story significance..."
                value={data.propDetails || ''}
                onChange={e => updateData('propDetails', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 'environment':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Time of Day</Label>
                <Select value={data.envTimeOfDay || ''} onValueChange={v => updateData('envTimeOfDay', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dawn">Dawn</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="noon">High Noon</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="golden_hour">Golden Hour</SelectItem>
                    <SelectItem value="dusk">Dusk</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="moonlit">Moonlit Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Weather</Label>
                <Select value={data.envWeather || ''} onValueChange={v => updateData('envWeather', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">Clear Sky</SelectItem>
                    <SelectItem value="cloudy">Cloudy/Overcast</SelectItem>
                    <SelectItem value="rain">Rainy</SelectItem>
                    <SelectItem value="storm">Stormy</SelectItem>
                    <SelectItem value="fog">Foggy/Misty</SelectItem>
                    <SelectItem value="snow">Snowy</SelectItem>
                    <SelectItem value="dusty">Dusty/Sandy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Scale</Label>
                <Select value={data.envScale || ''} onValueChange={v => updateData('envScale', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intimate">Intimate (room-sized)</SelectItem>
                    <SelectItem value="medium">Medium (building)</SelectItem>
                    <SelectItem value="large">Large (city block)</SelectItem>
                    <SelectItem value="epic">Epic (landscape)</SelectItem>
                    <SelectItem value="vast">Vast (kingdom-scale)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Architecture Style</Label>
                <Select value={data.envArchitectureStyle || ''} onValueChange={v => updateData('envArchitectureStyle', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indian_temple">Indian Temple</SelectItem>
                    <SelectItem value="palace">Royal Palace</SelectItem>
                    <SelectItem value="ancient_ruins">Ancient Ruins</SelectItem>
                    <SelectItem value="natural">Natural/Wilderness</SelectItem>
                    <SelectItem value="village">Village/Rural</SelectItem>
                    <SelectItem value="mythological">Mythological Realm</SelectItem>
                    <SelectItem value="cave">Cave/Underground</SelectItem>
                    <SelectItem value="celestial">Celestial/Heavenly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Mood / Atmosphere</Label>
              <Select value={data.envMood || ''} onValueChange={v => updateData('envMood', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sacred">Sacred/Divine</SelectItem>
                  <SelectItem value="peaceful">Peaceful/Serene</SelectItem>
                  <SelectItem value="ominous">Ominous/Foreboding</SelectItem>
                  <SelectItem value="majestic">Majestic/Grand</SelectItem>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="desolate">Desolate/Abandoned</SelectItem>
                  <SelectItem value="lush">Lush/Vibrant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs">Key Elements</Label>
              <Textarea 
                className="h-16 text-xs"
                placeholder="Important landmarks, vegetation, water features, architectural details..."
                value={data.envKeyElements || ''}
                onChange={e => updateData('envKeyElements', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 'costume':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Era/Period</Label>
                <Select value={data.costumeEra || ''} onValueChange={v => updateData('costumeEra', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ancient_indian">Ancient Indian</SelectItem>
                    <SelectItem value="mythological">Mythological</SelectItem>
                    <SelectItem value="medieval">Medieval</SelectItem>
                    <SelectItem value="royal">Royal/Palace</SelectItem>
                    <SelectItem value="tribal">Tribal</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Fabric Type</Label>
                <Select value={data.costumeFabric || ''} onValueChange={v => updateData('costumeFabric', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="silk">Silk</SelectItem>
                    <SelectItem value="cotton">Cotton</SelectItem>
                    <SelectItem value="brocade">Brocade</SelectItem>
                    <SelectItem value="leather">Leather</SelectItem>
                    <SelectItem value="armor">Armor/Metal</SelectItem>
                    <SelectItem value="divine">Divine/Ethereal</SelectItem>
                    <SelectItem value="animal_skin">Animal Skin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Color Scheme</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="Primary colors, patterns, embroidery..."
                value={data.costumeColors || ''}
                onChange={e => updateData('costumeColors', e.target.value)}
              />
            </div>
            
            <div>
              <Label className="text-xs">Accessories</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="Jewelry, headwear, footwear, belts..."
                value={data.costumeAccessories || ''}
                onChange={e => updateData('costumeAccessories', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 'vehicle':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vehicle Type</Label>
                <Select value={data.vehicleType || ''} onValueChange={v => updateData('vehicleType', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chariot">Chariot</SelectItem>
                    <SelectItem value="flying_vehicle">Flying Vehicle (Vimana)</SelectItem>
                    <SelectItem value="boat">Boat/Ship</SelectItem>
                    <SelectItem value="palanquin">Palanquin</SelectItem>
                    <SelectItem value="mount">Divine Mount (Vahana)</SelectItem>
                    <SelectItem value="cart">Cart/Wagon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Era</Label>
                <Select value={data.vehicleEra || ''} onValueChange={v => updateData('vehicleEra', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mythological">Mythological</SelectItem>
                    <SelectItem value="ancient">Ancient</SelectItem>
                    <SelectItem value="medieval">Medieval</SelectItem>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Special Features</Label>
              <Textarea 
                className="h-16 text-xs"
                placeholder="Ornate decorations, divine symbols, special abilities..."
                value={data.vehicleSpecialFeatures || ''}
                onChange={e => updateData('vehicleSpecialFeatures', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 'creature':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Creature Type</Label>
                <Select value={data.creatureType || ''} onValueChange={v => updateData('creatureType', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divine_animal">Divine Animal</SelectItem>
                    <SelectItem value="demon">Demon/Asura</SelectItem>
                    <SelectItem value="serpent">Serpent/Naga</SelectItem>
                    <SelectItem value="hybrid">Hybrid Creature</SelectItem>
                    <SelectItem value="spirit">Spirit/Ghost</SelectItem>
                    <SelectItem value="monster">Monster</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Size</Label>
                <Select value={data.creatureSize || ''} onValueChange={v => updateData('creatureSize', v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="human_sized">Human-sized</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="massive">Massive</SelectItem>
                    <SelectItem value="colossal">Colossal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-xs">Key Features</Label>
              <Textarea 
                className="h-16 text-xs"
                placeholder="Physical features, colors, textures, special abilities..."
                value={data.creatureFeatures || ''}
                onChange={e => updateData('creatureFeatures', e.target.value)}
              />
            </div>
            
            <div>
              <Label className="text-xs">Origin / Nature</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="Where does this creature come from? Divine, demonic, natural..."
                value={data.creatureOrigin || ''}
                onChange={e => updateData('creatureOrigin', e.target.value)}
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {TYPE_ICONS[conceptType] || <Package className="h-5 w-5" />}
            Concept Details: {assetName}
          </DialogTitle>
          <DialogDescription>
            Answer these questions to generate a more accurate concept art
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {scriptDescription && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Script Context</Label>
                <p className="text-sm mt-1">{scriptDescription}</p>
              </div>
            )}
            
            {renderQuestions()}
            
            {/* Common fields */}
            <div className="pt-2 border-t">
              <Label className="text-xs">Style Reference (optional)</Label>
              <Input 
                className="h-8 text-xs"
                placeholder="Reference movies, artists, or specific visual styles..."
                value={data.styleReference || ''}
                onChange={e => updateData('styleReference', e.target.value)}
              />
            </div>
            
            <div>
              <Label className="text-xs">Additional Notes</Label>
              <Textarea 
                className="h-16 text-xs"
                placeholder="Any other details important for the concept..."
                value={data.additionalDetails || ''}
                onChange={e => updateData('additionalDetails', e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Generate with Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
