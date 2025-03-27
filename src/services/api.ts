
import { supabase } from "@/integrations/supabase/client";
import { ElevenLabsApiKey, Host, Language, Project, Template } from "@/types";
import { 
  getLocalElevenLabsKeys, 
  saveLocalElevenLabsKey, 
  updateLocalElevenLabsKey, 
  deleteLocalElevenLabsKey 
} from "@/utils/localStorageUtils";
import { convertToAppModel, ensureValidStatus } from "@/utils/typeUtils";

// Fetch hosts
export const fetchHosts = async (): Promise<Host[]> => {
  try {
    const { data, error } = await supabase
      .from('hosts')
      .select('*');
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching hosts:", error);
    throw error;
  }
};

// Fetch templates
export const fetchTemplates = async (): Promise<Template[]> => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*');
      
    if (error) throw error;
    
    const templatesWithDescription = data?.map(template => ({
      ...template,
      description: template.name // Use name as description if not available
    })) || [];
    
    return templatesWithDescription;
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw error;
  }
};

// Fetch languages
export const fetchLanguages = async (): Promise<Language[]> => {
  try {
    const { data, error } = await supabase
      .from('languages')
      .select('*');
      
    if (error) throw error;
    
    // Add client-side properties
    const languagesWithClientProps = data?.map(language => ({
      ...language,
      flag: `https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/${language.code.toUpperCase()}.svg`,
      popular: false // Default value
    })) || [];
    
    return languagesWithClientProps;
  } catch (error) {
    console.error("Error fetching languages:", error);
    throw error;
  }
};

// Fetch projects for a user
export const fetchProjects = async (userId: string): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Ensure status is one of the valid options
    const projectsWithValidStatus = data?.map(project => ({
      ...project,
      status: ensureValidStatus(project.status)
    })) || [];
    
    return projectsWithValidStatus;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

// Fetch a single project
export const fetchProject = async (projectId: string): Promise<Project> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (error) throw error;
    
    // Ensure the status is valid
    return {
      ...data,
      status: ensureValidStatus(data.status)
    };
  } catch (error) {
    console.error("Error fetching project:", error);
    throw error;
  }
};

// Create a new project
export const createProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      ...data,
      status: ensureValidStatus(data.status)
    };
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

// Update a project
export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();
      
    if (error) throw error;
    
    return {
      ...data,
      status: ensureValidStatus(data.status)
    };
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
};

// Delete a project
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
      
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
};

// ElevenLabs API Key management

// Fetch ElevenLabs API keys for a user
export const fetchElevenLabsApiKeys = async (userId: string): Promise<ElevenLabsApiKey[]> => {
  try {
    // Since eleven_labs_api_keys doesn't exist yet in the database schema, 
    // we'll just return local storage keys
    console.warn("Fetching from local storage only since eleven_labs_api_keys table doesn't exist yet");
    return getLocalElevenLabsKeys(userId);
  } catch (error) {
    console.error("Error fetching ElevenLabs API keys:", error);
    // Fall back to local storage
    return getLocalElevenLabsKeys(userId);
  }
};

// Validate ElevenLabs API key with the ElevenLabs API
export const validateElevenLabsApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    console.log("Validating ElevenLabs API key:", apiKey.substring(0, 8) + "...");
    
    // Try to fetch the subscription info with the provided API key
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("ElevenLabs API validation failed:", response.status, response.statusText);
      throw new Error(`API key validation failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("ElevenLabs API validation response:", data);
    
    return true;
  } catch (error) {
    console.error("Error validating ElevenLabs API key:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to validate API key");
  }
};

// Add a new ElevenLabs API key
export const addElevenLabsApiKey = async (apiKey: Omit<ElevenLabsApiKey, 'id'>): Promise<ElevenLabsApiKey> => {
  try {
    console.log("Adding ElevenLabs API key:", apiKey.key?.substring(0, 8) + "...");
    
    // Since eleven_labs_api_keys table doesn't exist yet, save to local storage
    console.warn("Saving to local storage since eleven_labs_api_keys table doesn't exist yet");
    return saveLocalElevenLabsKey(apiKey.user_id, {
      key: apiKey.key,
      name: apiKey.name,
      is_active: apiKey.is_active || true,
      user_id: apiKey.user_id,
      quota_remaining: apiKey.quota_remaining,
      last_used: apiKey.last_used
    });
    
  } catch (error) {
    console.error("Error adding ElevenLabs API key:", error);
    throw error;
  }
};

// Update an ElevenLabs API key
export const updateElevenLabsApiKey = async (keyId: string, updates: Partial<ElevenLabsApiKey>): Promise<ElevenLabsApiKey> => {
  try {
    // Since the table doesn't exist yet, update in local storage
    if (!updates.user_id) {
      throw new Error("User ID is required to update local key");
    }
    
    return updateLocalElevenLabsKey(updates.user_id, keyId, updates);
  } catch (error) {
    console.error("Error updating ElevenLabs API key:", error);
    throw error;
  }
};

// Delete an ElevenLabs API key
export const deleteElevenLabsApiKey = async (keyId: string, userId?: string): Promise<void> => {
  try {
    // If userId is provided, delete from local storage
    if (userId) {
      deleteLocalElevenLabsKey(userId, keyId);
      return;
    } else {
      throw new Error("User ID is required to delete a key");
    }
  } catch (error) {
    console.error("Error deleting ElevenLabs API key:", error);
    throw error;
  }
};
