
import { supabase } from "@/integrations/supabase/client";
import { ElevenLabsApiKey, Host, Language, Project, Template } from "@/types";
import { 
  getLocalElevenLabsKeys, 
  saveLocalElevenLabsKey, 
  updateLocalElevenLabsKey, 
  deleteLocalElevenLabsKey 
} from "@/utils/localStorageUtils";

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
    
    return data || [];
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
    
    return data || [];
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
    
    return data || [];
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
    
    return data;
  } catch (error) {
    console.error("Error fetching project:", error);
    throw error;
  }
};

// Create a new project
export const createProject = async (project: Partial<Project>): Promise<Project> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
      
    if (error) throw error;
    
    return data;
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
    
    return data;
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
    const { data, error } = await supabase
      .from('eleven_labs_api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.warn("Supabase error, falling back to local storage:", error);
      return getLocalElevenLabsKeys(userId);
    }
    
    return data || [];
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
export const addElevenLabsApiKey = async (apiKey: Partial<ElevenLabsApiKey>): Promise<ElevenLabsApiKey> => {
  try {
    console.log("Adding ElevenLabs API key:", apiKey.key?.substring(0, 8) + "...");
    
    const { data, error } = await supabase
      .from('eleven_labs_api_keys')
      .insert(apiKey)
      .select()
      .single();
      
    if (error) {
      console.warn("Supabase error, falling back to local storage:", error);
      if (!apiKey.user_id || !apiKey.key || !apiKey.name) {
        throw new Error("Invalid API key data");
      }
      return saveLocalElevenLabsKey(apiKey.user_id, {
        key: apiKey.key,
        name: apiKey.name,
        is_active: apiKey.is_active || true,
        user_id: apiKey.user_id,
        quota_remaining: apiKey.quota_remaining,
        last_used: apiKey.last_used
      });
    }
    
    return data;
  } catch (error) {
    console.error("Error adding ElevenLabs API key:", error);
    throw error;
  }
};

// Update an ElevenLabs API key
export const updateElevenLabsApiKey = async (keyId: string, updates: Partial<ElevenLabsApiKey>): Promise<ElevenLabsApiKey> => {
  try {
    // Check if it's a local key
    if (updates.is_local) {
      if (!updates.user_id) {
        throw new Error("User ID is required to update local key");
      }
      return updateLocalElevenLabsKey(updates.user_id, keyId, updates);
    }
    
    const { data, error } = await supabase
      .from('eleven_labs_api_keys')
      .update(updates)
      .eq('id', keyId)
      .select()
      .single();
      
    if (error) {
      console.warn("Supabase error, checking if local key:", error);
      // Try to find it in local storage
      if (updates.user_id) {
        const localKeys = getLocalElevenLabsKeys(updates.user_id);
        const isLocalKey = localKeys.some(k => k.id === keyId);
        
        if (isLocalKey) {
          return updateLocalElevenLabsKey(updates.user_id, keyId, updates);
        }
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error updating ElevenLabs API key:", error);
    throw error;
  }
};

// Delete an ElevenLabs API key
export const deleteElevenLabsApiKey = async (keyId: string, userId?: string): Promise<void> => {
  try {
    // If userId is provided, check local storage first
    if (userId) {
      const localKeys = getLocalElevenLabsKeys(userId);
      const isLocalKey = localKeys.some(k => k.id === keyId);
      
      if (isLocalKey) {
        deleteLocalElevenLabsKey(userId, keyId);
        return;
      }
    }
    
    const { error } = await supabase
      .from('eleven_labs_api_keys')
      .delete()
      .eq('id', keyId);
      
    if (error) {
      // If userId is provided and the key wasn't found in local storage earlier,
      // throw an error
      throw error;
    }
  } catch (error) {
    console.error("Error deleting ElevenLabs API key:", error);
    throw error;
  }
};
