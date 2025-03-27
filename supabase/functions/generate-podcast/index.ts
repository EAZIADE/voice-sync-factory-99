
// Function to generate AI podcasts with character animation using ElevenLabs API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { projectId, characterControls } = await req.json();
    
    console.log("Request received for project:", projectId);
    console.log("With character controls:", characterControls);
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Get ElevenLabs API key from environment
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // First verify the project exists and belongs to the user
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (projectError || !projectData) {
      console.error("Project error:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found or not authorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update project status to processing
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', projectId);
      
    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update project status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create a storage bucket for podcasts if it doesn't exist
    try {
      const { data: bucketData, error: bucketError } = await supabaseClient
        .storage
        .getBucket('podcasts');
      
      if (bucketError && bucketError.message.includes('not found')) {
        await supabaseClient
          .storage
          .createBucket('podcasts', {
            public: true,
            fileSizeLimit: 512000000, // 512MB
          });
        console.log("Created 'podcasts' bucket");
      }
    } catch (error) {
      console.error("Error ensuring bucket exists:", error);
    }
    
    // This part would be done asynchronously in a real edge function using a queue or background task
    setTimeout(async () => {
      try {
        // Get script content from project or use default
        const scriptContent = projectData.script || "Welcome to this AI-generated podcast. Today we're discussing the fascinating world of artificial intelligence and its applications in modern technology.";
        
        console.log("Starting ElevenLabs text-to-speech generation");
        
        // Step 1: Generate audio using ElevenLabs TTS API
        // Using a default voice ID - in a real app, you would map from selected_hosts
        const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default ElevenLabs voice ID (Rachel)
        
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: scriptContent,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        });
        
        if (!ttsResponse.ok) {
          throw new Error(`ElevenLabs TTS API error: ${ttsResponse.status} ${await ttsResponse.text()}`);
        }
        
        // Get the audio as a blob
        const audioBlob = await ttsResponse.blob();
        
        // Upload audio to Supabase storage
        const { error: audioUploadError } = await supabaseClient
          .storage
          .from('podcasts')
          .upload(`${projectId}/audio.mp3`, audioBlob, {
            contentType: 'audio/mpeg',
            upsert: true
          });
          
        if (audioUploadError) {
          throw new Error(`Error uploading audio: ${audioUploadError.message}`);
        }
        
        console.log("Successfully generated and uploaded audio");
        
        // Step 2: Generate avatar video using ElevenLabs API
        console.log("Starting ElevenLabs video generation");
        
        // First we need to create a speech conversion task
        const speechConversionResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-speech/convert", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            voice_id: voiceId,
            generation_config: {
              model_id: "eleven_english_sts_v2"
            }
          })
        });
        
        if (!speechConversionResponse.ok) {
          throw new Error(`ElevenLabs speech conversion API error: ${speechConversionResponse.status} ${await speechConversionResponse.text()}`);
        }
        
        const conversionData = await speechConversionResponse.json();
        const conversionId = conversionData.conversion_id;
        
        // Upload the audio file to the conversion
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.mp3');
        
        const uploadResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}/audio`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`ElevenLabs upload API error: ${uploadResponse.status} ${await uploadResponse.text()}`);
        }
        
        // Start the conversion
        const startResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({})
        });
        
        if (!startResponse.ok) {
          throw new Error(`ElevenLabs start conversion API error: ${startResponse.status} ${await startResponse.text()}`);
        }
        
        // Poll for conversion completion
        let conversionComplete = false;
        let videoUrl = "";
        
        for (let i = 0; i < 30; i++) { // Try for 5 minutes (30 * 10s)
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          
          const statusResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}`, {
            method: 'GET',
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY
            }
          });
          
          if (!statusResponse.ok) {
            console.error(`Error checking conversion status: ${statusResponse.status}`);
            continue;
          }
          
          const statusData = await statusResponse.json();
          
          if (statusData.status === "completed") {
            conversionComplete = true;
            videoUrl = statusData.output_url;
            break;
          } else if (statusData.status === "failed") {
            throw new Error(`ElevenLabs conversion failed: ${statusData.error || "Unknown error"}`);
          }
          
          console.log(`Conversion status: ${statusData.status}, progress: ${statusData.progress || "unknown"}`);
        }
        
        if (!conversionComplete) {
          throw new Error("ElevenLabs conversion timed out");
        }
        
        // Download the video from ElevenLabs
        console.log(`Downloading video from ${videoUrl}`);
        const videoResponse = await fetch(videoUrl);
        
        if (!videoResponse.ok) {
          throw new Error(`Error downloading video: ${videoResponse.status}`);
        }
        
        const videoBlob = await videoResponse.blob();
        
        // Upload to Supabase storage
        const { error: uploadError } = await supabaseClient
          .storage
          .from('podcasts')
          .upload(`${projectId}/video.mp4`, videoBlob, {
            contentType: 'video/mp4',
            upsert: true
          });
          
        if (uploadError) {
          throw new Error(`Error uploading video: ${uploadError.message}`);
        }
        
        console.log("Successfully uploaded video for project:", projectId);
        
        // Make the file publicly accessible
        const { data: publicUrlData, error: publicUrlError } = await supabaseClient
          .storage
          .from('podcasts')
          .getPublicUrl(`${projectId}/video.mp4`);
          
        if (publicUrlError) {
          console.error("Error getting public URL:", publicUrlError);
        } else {
          console.log("Public URL for video:", publicUrlData.publicUrl);
        }
        
        // After processing is complete, update the project
        const { error: completeError } = await supabaseClient
          .from('projects')
          .update({ 
            status: 'completed', 
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
          
        if (completeError) {
          console.error("Error completing project:", completeError);
        } else {
          console.log("Successfully completed podcast generation for project:", projectId);
        }
      } catch (error) {
        console.error("Error in background task:", error);
        
        // If something goes wrong, set status back to draft
        try {
          await supabaseClient
            .from('projects')
            .update({ 
              status: 'draft', 
              updated_at: new Date().toISOString()
            })
            .eq('id', projectId);
        } catch (rollbackError) {
          console.error("Error rolling back project status:", rollbackError);
        }
      }
    }, 1000); // Reduced to 1 second for faster testing
    
    return new Response(
      JSON.stringify({ 
        message: "Podcast generation started",
        projectId: projectId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in generate-podcast function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
