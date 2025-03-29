
import React, { useState, useEffect } from "react";
import { Project } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { CharacterControlState } from "./CharacterControls";
import { ContentSource, processContentSource } from "@/utils/contentSourceProcessing";
import { supabase } from "@/integrations/supabase/client";
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

      const processedContent = await processContentSource(source, user.id);
      
      // Update project with processed content
      const { error } = await supabase
        .from('projects')
        .update({ 
          source_content: processedContent.content,
          source_type: source.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error updating project with source content:", error);
        toast("Error saving content", {
          description: "There was a problem saving your content. Please try again."
        });
        return;
      }
      
      toast("Content processed", {
        description: "Your content has been processed and is ready for podcast generation."
      });
      
    } catch (error) {
      console.error("Error processing content source:", error);
      toast("Content processing error", {
        description: "There was a problem processing your content. Please try a different source."
      });
    } finally {
      setIsProcessingSource(false);
    }
  };

  const handleControlsChange = (controls: CharacterControlState) => {
    setCharacterControls(controls);
  };

  const handleGenerate = async () => {
    if (!user) {
      toast("Not authenticated", {
        description: "Please log in to generate podcasts"
      });
      return;
    }
    
    if (!hasActiveApiKey) {
      toast("API key required", {
        description: "Please add a valid ElevenLabs API key to generate podcasts"
      });
      return;
    }
    
    if (!project.source_content) {
      toast("Content required", {
        description: "Please select a content source before generating"
      });
      return;
    }
    
    if (!project.selected_hosts || project.selected_hosts.length === 0) {
      toast("Host required", {
        description: "Please select at least one host for your podcast"
      });
      return;
    }
    
    if (!project.selected_language) {
      toast("Language required", {
        description: "Please select a language for your podcast"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      onGenerateStart();
      
      // Update project status to 'processing'
      const updateResult = await supabase
        .from('projects')
        .update({
          status: 'processing',
          character_controls: characterControls,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .eq('user_id', user.id);
      
      if (updateResult.error) {
        console.error("Error updating project status:", updateResult.error);
        throw new Error("Failed to update project status");
      }
      
      // Make API call to start podcast generation
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          content: project.source_content,
          hostIds: project.selected_hosts,
          languageId: project.selected_language,
          controls: characterControls
        })
      });
      
      // Check for successful response
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Generation API error:", errorText);
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Update project with generation info
      const mediaUrlsUpdate = await supabase
        .from('projects')
        .update({
          status: 'completed',
          video_url: result.videoUrl || '',
          audio_url: result.audioUrl || '',
          storage_path: result.storagePath || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .eq('user_id', user.id);
      
      if (mediaUrlsUpdate.error) {
        console.error("Error updating project with media URLs:", mediaUrlsUpdate.error);
        throw new Error("Failed to update project with media URLs");
      }
      
      // Get the updated project to make sure we have the latest data
      const { data: updatedProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError) {
        console.error("Error fetching updated project:", fetchError);
      } else {
        console.log("Updated project after generation:", updatedProject);
      }
      
      toast("Podcast generated", {
        description: "Your podcast has been successfully generated!"
      });
      
      onGenerateSuccess();
    } catch (error) {
      console.error("Error generating podcast:", error);
      
      // Update project status to 'draft' on error
      await supabase
        .from('projects')
        .update({
          status: 'draft',
          generation_error: error instanceof Error ? error.message : "Unknown error during generation",
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)
        .eq('user_id', user.id);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to generate podcast. Please try again.";
      
      toast("Generation failed", {
        description: errorMessage
      });
      
      onGenerateError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <ContentSourceInput
        onSourceSelected={handleSourceSelected}
        isProcessing={isProcessingSource}
      />
      
      <CharacterControls onControlsChange={handleControlsChange} />
      
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isProcessingSource || !hasActiveApiKey}
          className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Generate Podcast"}
        </button>
      </div>
      
      {!hasActiveApiKey && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="text-sm font-medium text-amber-800">API Key Required</h3>
          <p className="mt-1 text-xs text-amber-700">
            You need to add an ElevenLabs API key to generate podcasts. Go to the API Key Manager to add one.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectGenerator;
