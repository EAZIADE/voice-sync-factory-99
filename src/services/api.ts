
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
    // Try to fetch keys from the database first
    const { data, error } = await supabase
      .from('eleven_labs_api_keys')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error fetching ElevenLabs API keys from database:", error);
      
      // Fall back to local storage if database fails
      console.warn("Falling back to local storage for API keys");
      return getLocalElevenLabsKeys(userId);
    }
    
    if (data && data.length > 0) {
      return data.map(key => ({
        ...key,
        is_local: false
      })) as ElevenLabsApiKey[];
    }
    
    // If no keys in database, check local storage
    const localKeys = getLocalElevenLabsKeys(userId);
    
    // If we have local keys, migrate them to the database
    if (localKeys.length > 0) {
      console.log("Migrating local keys to database");
      for (const key of localKeys) {
        try {
          await addElevenLabsApiKey({
            key: key.key,
            name: key.name,
            is_active: key.is_active,
            user_id: userId,
            quota_remaining: key.quota_remaining,
            last_used: key.last_used
          });
        } catch (migrationError) {
          console.error("Error migrating key to database:", migrationError);
        }
      }
      
      // After migration, fetch again from the database
      const { data: migratedData, error: migratedError } = await supabase
        .from('eleven_labs_api_keys')
        .select('*')
        .eq('user_id', userId);
        
      if (migratedError) {
        console.error("Error fetching migrated ElevenLabs API keys:", migratedError);
        return localKeys; 
      }
      
      return (migratedData?.map(key => ({
        ...key,
        is_local: false
      })) || []) as ElevenLabsApiKey[];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching ElevenLabs API keys:", error);
    // Fall back to local storage in case of any error
    return getLocalElevenLabsKeys(userId);
  }
};

// Validate ElevenLabs API key with the ElevenLabs API
export const validateElevenLabsApiKey = async (apiKey: string): Promise<{valid: boolean, quota_remaining?: number}> => {
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
    
    // Extract character quota information - use the right property from the API response
    const character_limit = data.character_limit || 0;
    const character_count = data.character_count || 0;
    const quota_remaining = Math.max(0, character_limit - character_count);
    
    console.log(`Character quota: ${quota_remaining} (limit: ${character_limit}, used: ${character_count})`);
    
    return { valid: true, quota_remaining };
  } catch (error) {
    console.error("Error validating ElevenLabs API key:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to validate API key");
  }
};

// Add a new ElevenLabs API key
export const addElevenLabsApiKey = async (apiKey: Omit<ElevenLabsApiKey, 'id'>): Promise<ElevenLabsApiKey> => {
  try {
    console.log("Adding ElevenLabs API key:", apiKey.key?.substring(0, 8) + "...");
    
    // Validate the key and get quota information
    const { quota_remaining } = await validateElevenLabsApiKey(apiKey.key);
    
    // Try to insert into the database
    const { data, error } = await supabase
      .from('eleven_labs_api_keys')
      .insert({
        key: apiKey.key,
        name: apiKey.name,
        is_active: apiKey.is_active || true,
        user_id: apiKey.user_id,
        quota_remaining: quota_remaining,
        last_used: apiKey.last_used,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_local: false
      } as any)
      .select()
      .single();
      
    if (error) {
      console.error("Error adding ElevenLabs API key to database:", error);
      // Fall back to local storage
      console.warn("Falling back to local storage for adding API key");
      return saveLocalElevenLabsKey(apiKey.user_id, {
        key: apiKey.key,
        name: apiKey.name,
        is_active: apiKey.is_active || true,
        user_id: apiKey.user_id,
        quota_remaining: quota_remaining,
        last_used: apiKey.last_used
      });
    }
    
    return {
      ...data,
      is_local: false
    } as ElevenLabsApiKey;
  } catch (error) {
    console.error("Error adding ElevenLabs API key:", error);
    // Fall back to local storage
    if (!apiKey.user_id) {
      throw new Error("User ID is required to add API key");
    }
    
    return saveLocalElevenLabsKey(apiKey.user_id, {
      key: apiKey.key,
      name: apiKey.name,
      is_active: apiKey.is_active || true,
      user_id: apiKey.user_id,
      quota_remaining: 0, // Default to 0 if validation failed
      last_used: apiKey.last_used
    });
  }
};

// Update an ElevenLabs API key
export const updateElevenLabsApiKey = async (keyId: string, updates: Partial<ElevenLabsApiKey>): Promise<ElevenLabsApiKey> => {
  try {
    // If the key value is being updated, validate and get new quota
    let quota_remaining = updates.quota_remaining;
    if (updates.key) {
      try {
        const validationResult = await validateElevenLabsApiKey(updates.key);
        quota_remaining = validationResult.quota_remaining;
      } catch (validationError) {
        console.error("Validation error when updating key:", validationError);
        // Continue with update even if validation fails
      }
    }

    // Check if it's a local key by looking for is_local flag
    if (updates.is_local) {
      console.log("Updating local key:", keyId);
      if (!updates.user_id) {
        throw new Error("User ID is required to update local key");
      }
      
      return updateLocalElevenLabsKey(updates.user_id, keyId, {
        ...updates,
        quota_remaining
      });
    }
    
    // Update in database
    const { data, error } = await supabase
      .from('eleven_labs_api_keys')
      .update({
        ...updates,
        quota_remaining,
        updated_at: new Date().toISOString(),
        is_local: false
      } as any)
      .eq('id', keyId)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating ElevenLabs API key in database:", error);
      
      // Fall back to local storage if database fails
      if (!updates.user_id) {
        throw new Error("User ID is required to update local key");
      }
      
      return updateLocalElevenLabsKey(updates.user_id, keyId, {
        ...updates,
        quota_remaining
      });
    }
    
    return {
      ...data,
      is_local: false
    } as ElevenLabsApiKey;
  } catch (error) {
    console.error("Error updating ElevenLabs API key:", error);
    
    // Fall back to local storage
    if (!updates.user_id) {
      throw new Error("User ID is required to update key");
    }
    
    return updateLocalElevenLabsKey(updates.user_id, keyId, updates);
  }
};

// Delete an ElevenLabs API key
export const deleteElevenLabsApiKey = async (keyId: string, userId?: string): Promise<void> => {
  try {
    // Try to delete from database first
    const { error } = await supabase
      .from('eleven_labs_api_keys')
      .delete()
      .eq('id', keyId);
      
    if (error) {
      console.error("Error deleting ElevenLabs API key from database:", error);
      
      // If userId is provided, try to delete from local storage
      if (userId) {
        deleteLocalElevenLabsKey(userId, keyId);
        return;
      } else {
        throw new Error("Failed to delete API key from database and no user ID provided for local fallback");
      }
    }
  } catch (error) {
    console.error("Error deleting ElevenLabs API key:", error);
    
    // If userId is provided, try to delete from local storage
    if (userId) {
      deleteLocalElevenLabsKey(userId, keyId);
    } else {
      throw new Error("User ID is required to delete a key");
    }
  }
};
