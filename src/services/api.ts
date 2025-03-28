
import { supabase } from "@/integrations/supabase/client";
import { ElevenLabsApiKey, Host, Language, Project, Template } from "@/types";
import { 
  convertToAppModel,
  asType
} from "@/utils/typeUtils";

/**
 * Fetch all languages
 */
export const fetchLanguages = async (): Promise<Language[]> => {
  const { data, error } = await supabase
    .from('languages')
    .select('*');

  if (error) {
    console.error('Error fetching languages:', error);
    throw new Error('Failed to fetch languages');
  }

  return (data || []).map(language => convertToAppModel<Language>(language));
};

/**
 * Fetch all hosts
 */
export const fetchHosts = async (): Promise<Host[]> => {
  const { data, error } = await supabase
    .from('hosts')
    .select('*');

  if (error) {
    console.error('Error fetching hosts:', error);
    throw new Error('Failed to fetch hosts');
  }

  return (data || []).map(host => convertToAppModel<Host>(host));
};

/**
 * Fetch all templates
 */
export const fetchTemplates = async (): Promise<Template[]> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*');

  if (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }

  return (data || []).map(template => convertToAppModel<Template>(template));
};

/**
 * Create a new project
 */
export const createProject = async (
  userId: string,
  title: string,
  description: string,
  languageId: string,
  hostId: string,
  templateId: string
): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        user_id: userId,
        title,
        description,
        language_id: languageId,
        host_id: hostId,
        template_id: templateId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project');
  }

  return convertToAppModel<Project>(data);
};

/**
 * Update an existing project
 */
export const updateProject = async (
  id: string,
  title: string,
  description: string,
  languageId: string,
  hostId: string,
  templateId: string
): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update({
      title,
      description,
      language_id: languageId,
      host_id: hostId,
      template_id: templateId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }

  return convertToAppModel<Project>(data);
};

/**
 * Fetch all projects for a user
 */
export const fetchProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects');
  }
  
  // Convert DB types to app types
  return (data || []).map(project => convertToAppModel<Project>(project));
};

/**
 * Fetch a single project by ID
 */
export const fetchProject = async (projectId: string, userId: string): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching project:', error);
    throw new Error('Failed to fetch project');
  }
  
  return convertToAppModel<Project>(data);
};

/**
 * Delete a project and its associated media files
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    // First try to delete any associated media files
    try {
      const { error: storageError } = await supabase
        .storage
        .from('podcasts')
        .remove([`${projectId}/audio.mp3`, `${projectId}/video.mp4`]);
        
      if (storageError) {
        console.warn('Warning: Could not delete some media files:', storageError);
        // Continue anyway, as the project itself should still be deleted
      }
    } catch (storageErr) {
      console.warn('Error during media deletion:', storageErr);
      // Continue with project deletion
    }
    
    // Delete the project from the database
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
};

/**
 * Fetch all ElevenLabs API keys for a user
 */
export const fetchElevenLabsApiKeys = async (userId: string): Promise<ElevenLabsApiKey[]> => {
  const { data, error } = await supabase
    .from('eleven_labs_api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ElevenLabs API keys:', error);
    throw new Error('Failed to fetch ElevenLabs API keys');
  }

  return (data || []).map(key => convertToAppModel<ElevenLabsApiKey>(key));
};

/**
 * Add a new ElevenLabs API key for a user
 */
export const addElevenLabsApiKey = async (apiKeyData: {
  user_id: string;
  key: string;
  name: string;
  is_active: boolean;
}): Promise<ElevenLabsApiKey> => {
  const { key } = apiKeyData;
  const { valid, quota_remaining } = await validateElevenLabsApiKey(key);
  
  if (!valid) {
    throw new Error('Invalid ElevenLabs API key');
  }
  
  const { data, error } = await supabase
    .from('eleven_labs_api_keys')
    .insert([
      {
        user_id: apiKeyData.user_id,
        key: apiKeyData.key,
        name: apiKeyData.name,
        is_active: apiKeyData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        quota_remaining: quota_remaining
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.error('Error adding ElevenLabs API key:', error);
    throw new Error('Failed to add ElevenLabs API key');
  }

  return convertToAppModel<ElevenLabsApiKey>(data);
};

/**
 * Update an existing ElevenLabs API key
 */
export const updateElevenLabsApiKey = async (
  id: string, 
  apiKeyData: {
    user_id: string;
    key?: string;
    name?: string;
    is_active?: boolean;
    is_local?: boolean;
    quota_remaining?: number;
  }
): Promise<ElevenLabsApiKey> => {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  
  // Only add defined fields to the update
  if (apiKeyData.key !== undefined) {
    const { valid, quota_remaining } = await validateElevenLabsApiKey(apiKeyData.key);
    if (!valid) {
      throw new Error('Invalid ElevenLabs API key');
    }
    updateData.key = apiKeyData.key;
    updateData.quota_remaining = quota_remaining;
  } else if (apiKeyData.quota_remaining !== undefined) {
    updateData.quota_remaining = apiKeyData.quota_remaining;
  }
  
  if (apiKeyData.name !== undefined) updateData.name = apiKeyData.name;
  if (apiKeyData.is_active !== undefined) updateData.is_active = apiKeyData.is_active;
  
  const { data, error } = await supabase
    .from('eleven_labs_api_keys')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating ElevenLabs API key:', error);
    throw new Error('Failed to update ElevenLabs API key');
  }

  return convertToAppModel<ElevenLabsApiKey>(data);
};

/**
 * Delete an ElevenLabs API key
 */
export const deleteElevenLabsApiKey = async (id: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('eleven_labs_api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting ElevenLabs API key:', error);
    throw new Error('Failed to delete ElevenLabs API key');
  }
};

/**
 * Validate an ElevenLabs API key
 */
export const validateElevenLabsApiKey = async (apiKey: string): Promise<{ valid: boolean, quota_remaining: number }> => {
  try {
    console.log(`Validating ElevenLabs API key: ${apiKey.substring(0, 6)}...`);
    
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`API validation failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("ElevenLabs API validation response:", data);
    
    // Extract character quota information - use the right property from the API response
    const character_limit = data.character_limit || 0;
    const character_count = data.character_count || 0;
    const quota_remaining = Math.max(0, character_limit - character_count);
    
    console.log(`Character quota: ${quota_remaining} (limit: ${character_limit}, used: ${character_count})`);
    
    return { valid: true, quota_remaining };
  } catch (error) {
    console.error("ElevenLabs API validation error:", error);
    return { valid: false, quota_remaining: 0 };
  }
};
