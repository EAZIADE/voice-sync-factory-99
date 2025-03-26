
// Function to generate AI podcasts with character animation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google API keys - these should be moved to Supabase secrets in production
const NOTEBOOKLM_API_KEY = Deno.env.get('GOOGLE_NOTEBOOKLM_API_KEY') || '';
const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY') || '';
const STUDIO_API_KEY = Deno.env.get('GOOGLE_STUDIO_API_KEY') || '';

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
    
    console.log("Starting podcast generation for project:", projectId);
    console.log("Using character controls:", characterControls);
    
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
    
    // This would be done asynchronously in a real edge function using a queue or background task
    // For this demo, we'll use a setTimeout to simulate the async process
    setTimeout(async () => {
      try {
        // Script content - use actual project script if available
        const scriptContent = projectData.script || "Welcome to this AI-generated podcast. Today we're discussing the fascinating world of artificial intelligence and its applications in modern technology.";
        
        // Step 1: Generate podcast script content with Google NotebookLM
        let podcastScriptContent = scriptContent;
        try {
          if (NOTEBOOKLM_API_KEY) {
            console.log("Generating podcast script with Google NotebookLM");
            const notebookLMResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/notebooklm:generateContent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': NOTEBOOKLM_API_KEY
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `Create a podcast script based on the following topic: ${scriptContent}` }]
                  }
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1024
                }
              })
            });
            
            if (notebookLMResponse.ok) {
              const notebookData = await notebookLMResponse.json();
              // Extract the generated content - structure may vary based on the actual API response
              if (notebookData.candidates && notebookData.candidates[0]?.content?.parts[0]?.text) {
                podcastScriptContent = notebookData.candidates[0].content.parts[0].text;
                console.log("Successfully generated podcast script content");
              }
            } else {
              console.error("NotebookLM API error:", await notebookLMResponse.text());
            }
          } else {
            console.log("No NotebookLM API key - using existing script");
          }
        } catch (error) {
          console.error("Error using NotebookLM API:", error);
        }
        
        // Step 2: Generate host images with Google Studio
        let hostImageUrl = "";
        try {
          if (STUDIO_API_KEY) {
            console.log("Generating host image with Google Studio");
            const studioResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generateContent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': STUDIO_API_KEY
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: "Generate a professional podcast host in a studio setting, high quality, photorealistic" }]
                  }
                ],
                generationConfig: {
                  temperature: 0.4
                }
              })
            });
            
            if (studioResponse.ok) {
              const studioData = await studioResponse.json();
              // Extract the generated image URL - structure may vary based on the actual API response
              if (studioData.candidates && studioData.candidates[0]?.content?.parts[0]?.inlineData?.data) {
                // Store the base64 image
                const base64Image = studioData.candidates[0].content.parts[0].inlineData.data;
                const imageBlob = await fetch(`data:image/jpeg;base64,${base64Image}`).then(r => r.blob());
                
                // Upload to Supabase storage
                const { data: uploadData, error: uploadError } = await supabaseClient
                  .storage
                  .from('podcasts')
                  .upload(`${projectId}/host.jpg`, imageBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                  });
                  
                if (uploadError) {
                  console.error("Error uploading host image:", uploadError);
                } else {
                  console.log("Successfully uploaded host image");
                  
                  // Get the public URL
                  const { data: urlData } = await supabaseClient
                    .storage
                    .from('podcasts')
                    .getPublicUrl(`${projectId}/host.jpg`);
                    
                  hostImageUrl = urlData.publicUrl;
                }
              }
            } else {
              console.error("Studio API error:", await studioResponse.text());
            }
          } else {
            console.log("No Studio API key - skipping host image generation");
          }
        } catch (error) {
          console.error("Error using Studio API:", error);
        }
        
        // Step 3: Generate the animated video with Gemini
        try {
          // For demo purposes, we'll use a sample video if no Gemini API available
          // In production, this would actually call the Gemini API with the host image and script
          const sampleVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-business-woman-talking-4796-large.mp4";
          
          if (GEMINI_API_KEY && hostImageUrl) {
            console.log("Generating animated video with Gemini API");
            
            // Note: This is a placeholder implementation as Gemini doesn't directly 
            // create videos like this yet. In a real implementation, you would:
            // 1. Use Gemini API to generate animation keyframes
            // 2. Use another service to combine these into a video
            
            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: `Animate this podcast host speaking the following script: "${podcastScriptContent.substring(0, 500)}"` },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: hostImageUrl // This would need encoding in a real implementation
                        }
                      }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 2048
                }
              })
            });
            
            if (geminiResponse.ok) {
              // Process Gemini response (in reality this would come from another animation service)
              console.log("Successfully received Gemini API response");
            } else {
              console.error("Gemini API error:", await geminiResponse.text());
            }
          }
          
          // For now, we'll use the sample video in either case
          console.log("Downloading sample video as placeholder for Gemini output");
          const videoResponse = await fetch(sampleVideoUrl);
          if (!videoResponse.ok) {
            throw new Error("Failed to fetch sample video");
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
            console.error("Error uploading video:", uploadError);
            throw uploadError;
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
        } catch (error) {
          console.error("Error handling video generation:", error);
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
    }, 15000); // Simulate a 15 second processing time
    
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
