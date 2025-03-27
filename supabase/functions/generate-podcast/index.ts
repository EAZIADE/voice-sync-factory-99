
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
    // Parse the request body
    const requestText = await req.text();
    console.log("Raw request body:", requestText);
    
    let projectId, characterControls;
    
    try {
      const requestData = JSON.parse(requestText);
      projectId = requestData.projectId;
      characterControls = requestData.characterControls;
      
      console.log("Request received for project:", projectId);
      console.log("With character controls:", characterControls);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: projectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the auth header
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log("Supabase URL available:", !!supabaseUrl);
    console.log("Supabase Anon Key available:", !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // First verify the project exists and belongs to the user
    console.log("Fetching project data for ID:", projectId);
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select('*, user_id')
      .eq('id', projectId)
      .single();
      
    if (projectError) {
      console.error("Project error:", projectError);
      return new Response(
        JSON.stringify({ error: `Project not found or not authorized: ${projectError.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!projectData) {
      console.error("No project data found");
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get authenticated user information
    console.log("Getting authenticated user");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: `User authentication error: ${userError.message}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!user) {
      console.error("No authenticated user found");
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Authenticated user ID:", user.id);
    console.log("Project user ID:", projectData.user_id);
    
    // Verify user owns this project
    if (projectData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to access this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get active ElevenLabs API key for this user
    console.log("Fetching ElevenLabs API keys");
    const { data: keys, error: keysError } = await supabaseClient
      .from('elevenlabs_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
      
    if (keysError) {
      console.error("Error fetching API keys:", keysError);
      return new Response(
        JSON.stringify({ error: `Error fetching ElevenLabs API keys: ${keysError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Found ${keys?.length || 0} active API keys`);
    
    if (!keys || keys.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active ElevenLabs API key found. Please add an API key in your dashboard." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the most recently added active key
    const apiKey = keys[0].key;
    
    // Update project status to processing
    console.log("Updating project status to processing");
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', projectId);
      
    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update project status: ${updateError.message}` }),
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
    
    // Start the podcast generation in the background
    setTimeout(async () => {
      try {
        // Get script content from project or use default
        const scriptContent = projectData.script || "Welcome to this AI-generated podcast. Today we're discussing the fascinating world of artificial intelligence and its applications in modern technology.";
        
        console.log("Starting ElevenLabs text-to-speech generation");
        
        // Function to try with a different API key if one fails
        const tryWithNextKey = async (currentKeyIndex: number, remainingAttempts: number) => {
          if (remainingAttempts <= 0) {
            throw new Error("All API keys have been exhausted. Please add more API keys with available quota.");
          }
          
          // Get the next key
          const { data: keysData, error: keysDataError } = await supabaseClient
            .from('elevenlabs_api_keys')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (keysDataError || !keysData || keysData.length <= currentKeyIndex) {
            throw new Error("No more API keys available.");
          }
          
          const nextKey = keysData[currentKeyIndex].key;
          console.log(`Trying with next API key (attempt ${remainingAttempts})`);
          
          return nextKey;
        };
        
        // Step 1: Generate audio using ElevenLabs TTS API
        // Using a default voice ID - in a real app, you would map from selected_hosts
        const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default ElevenLabs voice ID (Rachel)
        
        let currentKeyIndex = 0;
        let currentApiKey = apiKey;
        let audioBlob: Blob | null = null;
        let attempts = 3; // Maximum number of keys to try
        
        // Try to generate audio with available keys
        while (attempts > 0 && !audioBlob) {
          try {
            const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': currentApiKey
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
              const errorText = await ttsResponse.text();
              console.error(`ElevenLabs TTS API error: ${ttsResponse.status} ${errorText}`);
              
              if (ttsResponse.status === 429 || errorText.includes('quota') || errorText.includes('limit')) {
                // Mark this key as inactive
                await supabaseClient
                  .from('elevenlabs_api_keys')
                  .update({
                    is_active: false,
                    quota_remaining: 0,
                    updated_at: new Date().toISOString()
                  })
                  .eq('key', currentApiKey);
                  
                // Try next key
                currentKeyIndex++;
                currentApiKey = await tryWithNextKey(currentKeyIndex, attempts);
                attempts--;
                continue;
              }
              
              throw new Error(`ElevenLabs TTS API error: ${ttsResponse.status} ${errorText}`);
            }
            
            // Get the audio as a blob
            audioBlob = await ttsResponse.blob();
            
            // Update key usage stats
            try {
              const subscriptionResponse = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
                method: 'GET',
                headers: {
                  'xi-api-key': currentApiKey
                }
              });
              
              if (subscriptionResponse.ok) {
                const subscriptionData = await subscriptionResponse.json();
                const quotaRemaining = subscriptionData.character_limit - subscriptionData.character_count;
                
                await supabaseClient
                  .from('elevenlabs_api_keys')
                  .update({
                    quota_remaining: quotaRemaining,
                    last_used: new Date().toISOString()
                  })
                  .eq('key', currentApiKey);
              }
            } catch (error) {
              console.error("Error updating API key usage stats:", error);
            }
          } catch (error) {
            console.error("Error generating audio:", error);
            
            if (attempts > 1) {
              // Try next key
              currentKeyIndex++;
              currentApiKey = await tryWithNextKey(currentKeyIndex, attempts);
              attempts--;
            } else {
              throw error;
            }
          }
        }
        
        if (!audioBlob) {
          throw new Error("Failed to generate audio with all available API keys.");
        }
        
        // Upload audio to Supabase storage with explicit content type
        console.log(`Attempting to upload audio file to podcasts/${projectId}/audio.mp3`);
        const { error: audioUploadError, data: audioUploadData } = await supabaseClient
          .storage
          .from('podcasts')
          .upload(`${projectId}/audio.mp3`, audioBlob, {
            contentType: 'audio/mpeg',
            upsert: true,
            cacheControl: '3600'
          });
          
        if (audioUploadError) {
          console.error("Error uploading audio:", audioUploadError);
          throw new Error(`Error uploading audio: ${audioUploadError.message}`);
        }
        
        console.log("Successfully generated and uploaded audio:", audioUploadData);
        
        // Step 2: Generate avatar video using ElevenLabs API
        console.log("Starting ElevenLabs video generation");
        
        // Reset for video generation
        currentKeyIndex = 0;
        currentApiKey = apiKey;
        let videoUrl: string | null = null;
        attempts = 3; // Maximum number of keys to try
        
        while (attempts > 0 && !videoUrl) {
          try {
            // First we need to create a speech conversion task
            const speechConversionResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-speech/convert", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': currentApiKey
              },
              body: JSON.stringify({
                voice_id: voiceId,
                generation_config: {
                  model_id: "eleven_english_sts_v2"
                }
              })
            });
            
            if (!speechConversionResponse.ok) {
              const errorText = await speechConversionResponse.text();
              console.error(`ElevenLabs speech conversion API error: ${speechConversionResponse.status} ${errorText}`);
              
              if (speechConversionResponse.status === 429 || errorText.includes('quota') || errorText.includes('limit')) {
                // Mark this key as inactive
                await supabaseClient
                  .from('elevenlabs_api_keys')
                  .update({
                    is_active: false,
                    quota_remaining: 0,
                    updated_at: new Date().toISOString()
                  })
                  .eq('key', currentApiKey);
                  
                // Try next key
                currentKeyIndex++;
                currentApiKey = await tryWithNextKey(currentKeyIndex, attempts);
                attempts--;
                continue;
              }
              
              throw new Error(`ElevenLabs speech conversion API error: ${speechConversionResponse.status} ${errorText}`);
            }
            
            const conversionData = await speechConversionResponse.json();
            const conversionId = conversionData.conversion_id;
            
            // Upload the audio file to the conversion
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.mp3');
            
            const uploadResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}/audio`, {
              method: 'POST',
              headers: {
                'xi-api-key': currentApiKey
              },
              body: formData
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              throw new Error(`ElevenLabs upload API error: ${uploadResponse.status} ${errorText}`);
            }
            
            // Start the conversion
            const startResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': currentApiKey
              },
              body: JSON.stringify({})
            });
            
            if (!startResponse.ok) {
              const errorText = await startResponse.text();
              throw new Error(`ElevenLabs start conversion API error: ${startResponse.status} ${errorText}`);
            }
            
            // Poll for conversion completion
            let conversionComplete = false;
            
            for (let i = 0; i < 30; i++) { // Try for 5 minutes (30 * 10s)
              await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
              
              const statusResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}`, {
                method: 'GET',
                headers: {
                  'xi-api-key': currentApiKey
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
            
            // Update key usage stats
            try {
              const subscriptionResponse = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
                method: 'GET',
                headers: {
                  'xi-api-key': currentApiKey
                }
              });
              
              if (subscriptionResponse.ok) {
                const subscriptionData = await subscriptionResponse.json();
                const quotaRemaining = subscriptionData.character_limit - subscriptionData.character_count;
                
                await supabaseClient
                  .from('elevenlabs_api_keys')
                  .update({
                    quota_remaining: quotaRemaining,
                    last_used: new Date().toISOString()
                  })
                  .eq('key', currentApiKey);
              }
            } catch (error) {
              console.error("Error updating API key usage stats:", error);
            }
          } catch (error) {
            console.error("Error generating video:", error);
            
            if (attempts > 1) {
              // Try next key
              currentKeyIndex++;
              currentApiKey = await tryWithNextKey(currentKeyIndex, attempts);
              attempts--;
            } else {
              throw error;
            }
          }
        }
        
        if (!videoUrl) {
          throw new Error("Failed to generate video with all available API keys.");
        }
        
        // Download the video from ElevenLabs
        console.log(`Downloading video from ${videoUrl}`);
        const videoResponse = await fetch(videoUrl);
        
        if (!videoResponse.ok) {
          console.error("Error downloading video:", videoResponse.status, videoResponse.statusText);
          throw new Error(`Error downloading video: ${videoResponse.status} ${videoResponse.statusText}`);
        }
        
        const videoBlob = await videoResponse.blob();
        console.log("Video blob size:", videoBlob.size);
        
        if (videoBlob.size === 0) {
          console.error("Downloaded video blob is empty");
          throw new Error("Downloaded video from ElevenLabs is empty");
        }
        
        // Upload to Supabase storage with explicit content type
        console.log(`Attempting to upload video file to podcasts/${projectId}/video.mp4`);
        const { error: uploadError, data: uploadData } = await supabaseClient
          .storage
          .from('podcasts')
          .upload(`${projectId}/video.mp4`, videoBlob, {
            contentType: 'video/mp4',
            upsert: true,
            cacheControl: '3600'
          });
          
        if (uploadError) {
          console.error("Error uploading video:", uploadError);
          throw new Error(`Error uploading video: ${uploadError.message}`);
        }
        
        console.log("Successfully uploaded video for project:", projectId, uploadData);
        
        // Make the files publicly accessible and verify with better error logging
        const { data: videoPublicUrlData, error: videoPublicUrlError } = await supabaseClient
          .storage
          .from('podcasts')
          .getPublicUrl(`${projectId}/video.mp4`);
        
        if (videoPublicUrlError) {
          console.error("Error getting public URL for video:", videoPublicUrlError);
        } else {
          console.log("Public URL for video:", videoPublicUrlData.publicUrl);
        }
        
        const { data: audioPublicUrlData, error: audioPublicUrlError } = await supabaseClient
          .storage
          .from('podcasts')
          .getPublicUrl(`${projectId}/audio.mp3`);
        
        if (audioPublicUrlError) {
          console.error("Error getting public URL for audio:", audioPublicUrlError);
        } else {
          console.log("Public URL for audio:", audioPublicUrlData.publicUrl);
        }
        
        // Verify the files exist and are accessible with improved logging
        try {
          const videoCheckResponse = await fetch(videoPublicUrlData.publicUrl, { 
            method: 'HEAD',
            cache: 'no-store' 
          });
          console.log("Video file check:", videoCheckResponse.status, videoCheckResponse.ok, 
                     "Content-Type:", videoCheckResponse.headers.get('content-type'));
          
          const audioCheckResponse = await fetch(audioPublicUrlData.publicUrl, { 
            method: 'HEAD',
            cache: 'no-store' 
          });
          console.log("Audio file check:", audioCheckResponse.status, audioCheckResponse.ok, 
                     "Content-Type:", audioCheckResponse.headers.get('content-type'));
          
          if (!videoCheckResponse.ok) {
            console.error("Video file not accessible after upload");
          }
          
          if (!audioCheckResponse.ok) {
            console.error("Audio file not accessible after upload");
          }
        } catch (checkError) {
          console.error("Error checking uploaded files:", checkError);
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
            
          console.error("Project status rolled back to draft due to error:", error.message);
        } catch (rollbackError) {
          console.error("Error rolling back project status:", rollbackError);
        }
      }
    }, 1000);
    
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
