
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user's ID from their auth token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get the project ID from the request
    const { projectId } = await req.json()
    
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    // Get the project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      throw projectError
    }

    if (!project) {
      throw new Error('Project not found')
    }

    // Update the project status to 'processing'
    await supabaseClient
      .from('projects')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    // Simulate the podcast generation process
    // In a real implementation, this would initiate an async process to generate the podcast
    // For this example, we'll use a simulated delay and then mark the project as completed
    
    // This part would be handled by a background process in a real implementation
    setTimeout(async () => {
      try {
        await supabaseClient
          .from('projects')
          .update({ 
            status: 'completed', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', projectId)
          
        console.log(`Project ${projectId} marked as completed`)
      } catch (error) {
        console.error(`Error updating project status: ${error.message}`)
      }
    }, 30000) // Simulate a 30 second processing time
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Podcast generation process started', 
        projectId 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error(`Error: ${error.message}`)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
