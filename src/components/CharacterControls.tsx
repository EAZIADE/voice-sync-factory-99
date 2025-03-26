
import React, { useState } from "react";
import { GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Toggle } from "./ui/toggle";

interface CharacterControlsProps {
  onControlsChange: (controls: CharacterControlState) => void;
}

export interface CharacterControlState {
  expressiveness: number;
  gestureIntensity: number;
  speakingPace: number;
  autoGestures: boolean;
  eyeContact: boolean;
}

const CharacterControls = ({ onControlsChange }: CharacterControlsProps) => {
  const [controls, setControls] = useState<CharacterControlState>({
    expressiveness: 70,
    gestureIntensity: 50,
    speakingPace: 60,
    autoGestures: true,
    eyeContact: true,
  });

  const handleControlChange = <K extends keyof CharacterControlState>(
    key: K,
    value: CharacterControlState[K]
  ) => {
    const newControls = { ...controls, [key]: value };
    setControls(newControls);
    onControlsChange(newControls);
  };

  return (
    <GlassPanel className="p-6">
      <h3 className="text-lg font-semibold mb-4">Character Animation Controls</h3>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="expressiveness">Expressiveness</Label>
            <span className="text-sm text-muted-foreground">{controls.expressiveness}%</span>
          </div>
          <Slider 
            id="expressiveness"
            min={0} 
            max={100} 
            step={1}
            value={[controls.expressiveness]} 
            onValueChange={([value]) => handleControlChange('expressiveness', value)} 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="gestureIntensity">Gesture Intensity</Label>
            <span className="text-sm text-muted-foreground">{controls.gestureIntensity}%</span>
          </div>
          <Slider 
            id="gestureIntensity"
            min={0} 
            max={100} 
            step={1}
            value={[controls.gestureIntensity]} 
            onValueChange={([value]) => handleControlChange('gestureIntensity', value)} 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="speakingPace">Speaking Pace</Label>
            <span className="text-sm text-muted-foreground">{controls.speakingPace}%</span>
          </div>
          <Slider 
            id="speakingPace"
            min={0} 
            max={100} 
            step={1}
            value={[controls.speakingPace]} 
            onValueChange={([value]) => handleControlChange('speakingPace', value)} 
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <Toggle 
              pressed={controls.autoGestures}
              onPressedChange={(value) => handleControlChange('autoGestures', value)}
            />
            <Label htmlFor="autoGestures">Auto Gestures</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Toggle 
              pressed={controls.eyeContact}
              onPressedChange={(value) => handleControlChange('eyeContact', value)}
            />
            <Label htmlFor="eyeContact">Eye Contact</Label>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

export default CharacterControls;
