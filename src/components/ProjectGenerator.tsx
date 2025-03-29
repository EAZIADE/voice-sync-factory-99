
import React, { useState, useEffect } from "react";
import { Project } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { CharacterControlState } from "./CharacterControls";
import { ContentSource, processContentSource } from "@/utils/contentSourceProcessing";
import { supabase, refreshSession } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CharacterControls from "./CharacterControls";
import ContentSourceInput from "./ContentSourceInput";
import { toast } from "sonner";
import { fetchElevenLabsApiKeys } from "@/services/api";

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
  const [hasActiveApiKey, setHasActiveApiKey] = useState(false);
  const { toast: hookToast } = useToast();

  useEffect(() => {
    // Check if user has active ElevenLabs API key
    const checkApiKey = async () => {
      if (!user) return;
      
      try {
        const keys = await fetchElevenLabsApiKeys(user.id);
        const hasKey = keys.some(key => key.is_active && key.quota_remaining > 0);
        setHasActiveApiKey(hasKey);
      } catch (error) {
        console.error("Error checking API key:", error);
      }
    };
    
    checkApiKey();
  }, [user]);

  const handleSourceSelected = async (source: ContentSource) => {
    try {
      if (!user) {
        toast("Not authenticated", {
          description: "Please log in to process content"
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
        } as any)
        .eq('id', project.id as any);
        
      if (error) {
        throw error;
      }
      
      toast("Content processed", {
        description: "Your content has been processed and is ready for podcast generation"
      });
      
    } catch (error) {
      console.error("Error processing content source:", error);
      toast("Processing error", {
        description: "Failed to process content. Please try again."
      });
    } finally {
      setIsProcessingSource(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!user || !session || !project.id) {
      toast("Not authenticated", {
        description: "Please log in to generate a podcast"
      });
      return;
    }

    if (!hasActiveApiKey) {
      toast("API Key Required", {
        description: "Please add a valid ElevenLabs API key with available character quota in your dashboard settings."
      });
      return;
    }
    
    // Make sure the selected hosts are valid
    if (!project.selected_hosts || project.selected_hosts.length === 0) {
      toast("Host Required", {
        description: "Please select at least one host for your podcast."
      });
      return;
    }
    
    // Make sure we have a valid session token
    const isValid = await refreshSession();
    if (!isValid) {
      toast("Session expired", {
        description: "Your session has expired. Please log in again."
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
      console.log("Selected hosts:", project.selected_hosts);
      console.log("Session access token:", session.access_token ? "Present" : "Missing");
      
      // First check if we are authenticated properly and force a session refresh
      const { data: authData, error: authError } = await supabase.auth.refreshSession();
      if (authError || !authData.session) {
        console.error("Auth refresh failed:", authError);
        throw new Error("Authentication refresh failed. Please try logging in again.");
      }
      
      const currentSession = authData.session;
      
      // Explicitly log the token we're about to use
      console.log("Using refreshed access token:", currentSession.access_token ? "Present and refreshed" : "Missing after refresh");
      
      // Try direct fetch with explicit authentication from the refreshed session
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
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
      
      toast("Podcast generation started", {
        description: "Your AI podcast is being generated. This may take a few minutes."
      });
      
      onGenerateSuccess();
      
    } catch (error) {
      console.error("Error generating podcast:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate podcast";
      
      toast("Generation error", {
        description: errorMessage
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
          disabled={isGenerating || !project.script || !hasActiveApiKey || !project.selected_hosts || project.selected_hosts.length === 0}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating your AI podcast...
            </div>
          ) : !hasActiveApiKey ? (
            "Add ElevenLabs API Key to Generate Podcast"
          ) : !project.selected_hosts || project.selected_hosts.length === 0 ? (
            "Select at least one host"
          ) : (
            "Generate AI Podcast"
          )}
        </button>
        
        {!hasActiveApiKey && (
          <p className="text-sm text-amber-500 mt-2 text-center">
            You need to add a valid ElevenLabs API key with available character quota in your dashboard settings.
          </p>
        )}
        
        {(!project.selected_hosts || project.selected_hosts.length === 0) && hasActiveApiKey && (
          <p className="text-sm text-amber-500 mt-2 text-center">
            Please select at least one host for your podcast in the host selection step.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectGenerator;
