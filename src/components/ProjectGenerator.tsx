
import React, { useState } from "react";
import { Project } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { CharacterControlState } from "./CharacterControls";
import { ContentSource, processContentSource } from "@/utils/contentSourceProcessing";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CharacterControls from "./CharacterControls";
import ContentSourceInput from "./ContentSourceInput";

interface ProjectGeneratorProps {
  project: Project;
  onGenerateStart: () => void;
  onGenerateSuccess: () => void;
  onGenerateError: (error: string) => void;
}

const ProjectGenerator: React.FC<ProjectGeneratorProps> = ({
  project,
  onGenerateStart,
  onGenerateSuccess,
  onGenerateError
}) => {
  const { user, session } = useAuth();
  const [isProcessingSource, setIsProcessingSource] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentSource, setContentSource] = useState<ContentSource | null>(null);
  const [characterControls, setCharacterControls] = useState<CharacterControlState>({
    expressiveness: 70,
    gestureIntensity: 50,
    speakingPace: 60,
    autoGestures: true,
    eyeContact: true,
  });
  const { toast } = useToast();

  const handleSourceSelected = async (source: ContentSource) => {
    try {
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to process content",
          variant: "destructive"
        });
        return;
      }

      setIsProcessingSource(true);
      setContentSource(source);

      // Process the content source to get script text
      const processedContent = await processContentSource(source, user.id);
      
      // Update the project with the processed content as script
      const { error } = await supabase
        .from('projects')
        .update({ 
          script: processedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Content processed",
        description: "Your content has been processed and is ready for podcast generation",
      });
      
    } catch (error) {
      console.error("Error processing content source:", error);
      toast({
        title: "Processing error",
        description: "Failed to process content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingSource(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!user || !session || !project.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to generate a podcast",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    onGenerateStart();
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvfqcvytoobplgracobg.supabase.co';
      
      console.log("Generating podcast with URL:", `${supabaseUrl}/functions/v1/generate-podcast`);
      console.log("Project ID:", project.id);
      console.log("Character controls:", characterControls);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          projectId: project.id,
          characterControls
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate podcast';
        
        try {
          const errorText = await response.text();
          console.error("Error response text:", errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch (jsonError) {
            errorMessage = errorText || errorMessage;
          }
        } catch (textError) {
          console.error("Could not read error response text:", textError);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("Generation response:", data);
      
      toast({
        title: "Podcast generation started",
        description: "Your AI podcast is being generated. This may take a few minutes.",
      });
      
      onGenerateSuccess();
      
    } catch (error) {
      console.error("Error generating podcast:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate podcast";
      
      toast({
        title: "Generation error",
        description: errorMessage,
        variant: "destructive"
      });
      
      onGenerateError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleControlsChange = (controls: CharacterControlState) => {
    setCharacterControls(controls);
  };
  
  return (
    <div className="space-y-6">
      <ContentSourceInput 
        onSourceSelected={handleSourceSelected}
        isProcessing={isProcessingSource}
      />
      
      <CharacterControls onControlsChange={handleControlsChange} />
      
      <div className="mt-6">
        <button
          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleGeneratePodcast}
          disabled={isGenerating || !project.script}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating your AI podcast...
            </div>
          ) : (
            "Generate AI Podcast"
          )}
        </button>
      </div>
    </div>
  );
};

export default ProjectGenerator;
