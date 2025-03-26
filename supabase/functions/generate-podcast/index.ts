
// Function to generate AI podcasts with character animation
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
    // For this demo, we'll use a simple setTimeout to simulate the async process
    setTimeout(async () => {
      try {
        // In a real implementation:
        // 1. We would use Google NoteBookLM API to generate the podcast content
        // 2. Google Studio would create the host images
        // 3. Gemini would animate the character in a video
        
        // For now, we'll use a sample video
        const sampleVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-business-woman-talking-4796-large.mp4";
        
        try {
          // Fetch the sample video
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
          console.error("Error handling video upload:", error);
        }
        
        // After "processing" is complete, update the project
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
