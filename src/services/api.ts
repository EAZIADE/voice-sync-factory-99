
import { supabase } from "@/integrations/supabase/client";
import { Host, Template, Language, Project, ElevenLabsApiKey } from "@/types";

// Host related API calls
export const fetchHosts = async (): Promise<Host[]> => {
  const { data, error } = await supabase
    .from('hosts')
    .select('*');
  
  if (error) {
    console.error('Error fetching hosts:', error);
    throw error;
  }
  
  return data || [];
};

// Template related API calls
export const fetchTemplates = async (): Promise<Template[]> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*');
  
  if (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
  
  return data || [];
};

// Language related API calls
export const fetchLanguages = async (): Promise<Language[]> => {
  const { data, error } = await supabase
    .from('languages')
    .select('*');
  
  if (error) {
    console.error('Error fetching languages:', error);
    throw error;
  }
  
  // Add flag emoji and popularity status based on language code
  return (data || []).map(language => ({
    ...language,
    flag: getLanguageFlag(language.code),
    popular: ['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(language.code)
  }));
};

// Project related API calls
export const fetchUserProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user projects:', error);
    throw error;
  }
  
  return (data || []).map(project => ({
    ...project,
    status: ensureValidStatus(project.status)
  }));
};

export const createProject = async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }
  
  return {
    ...data,
    status: ensureValidStatus(data.status)
  };
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }
  
  return {
    ...data,
    status: ensureValidStatus(data.status)
  };
};

// ElevenLabs API Key Management
export const fetchElevenLabsApiKeys = async (userId: string): Promise<ElevenLabsApiKey[]> => {
  const { data, error } = await supabase
    .rpc('get_elevenlabs_api_keys', { user_id_param: userId })
    .select('*');
  
  if (error) {
    console.error('Error fetching ElevenLabs API keys:', error);
    // If RPC fails, fallback to raw SQL
    const { data: rawData, error: rawError } = await supabase
      .from('elevenlabs_api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (rawError) {
      console.error('Error fetching ElevenLabs API keys (fallback):', rawError);
      throw rawError;
    }
    
    return rawData || [];
  }
  
  return data || [];
};

export const addElevenLabsApiKey = async (keyData: Omit<ElevenLabsApiKey, 'id' | 'created_at'>): Promise<ElevenLabsApiKey> => {
  // Check if the key is valid by making a test request to ElevenLabs
  try {
    await validateElevenLabsApiKey(keyData.key);
  } catch (error) {
    throw new Error('Invalid ElevenLabs API key. Please check and try again.');
  }
  
  // Insert the key using raw SQL since it's not in the Supabase types
  const { data, error } = await supabase
    .from('elevenlabs_api_keys')
    .insert([keyData])
    .select('*')
    .single();
  
  if (error) {
    console.error('Error adding ElevenLabs API key:', error);
    throw error;
  }
  
  return data as ElevenLabsApiKey;
};

export const updateElevenLabsApiKey = async (id: string, updates: Partial<ElevenLabsApiKey>): Promise<ElevenLabsApiKey> => {
  const { data, error } = await supabase
    .from('elevenlabs_api_keys')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  
  if (error) {
    console.error('Error updating ElevenLabs API key:', error);
    throw error;
  }
  
  return data as ElevenLabsApiKey;
};

export const deleteElevenLabsApiKey = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('elevenlabs_api_keys')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting ElevenLabs API key:', error);
    throw error;
  }
};

export const validateElevenLabsApiKey = async (apiKey: string): Promise<{valid: boolean, subscription: any}> => {
  // Check if the key is valid by making a request to ElevenLabs
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey
    }
  });
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API key validation failed: ${response.status}`);
  }
  
  const data = await response.json();
  return { valid: true, subscription: data };
};

// Get a valid ElevenLabs API key with remaining quota
export const getActiveElevenLabsApiKey = async (userId: string): Promise<string> => {
  const keys = await fetchElevenLabsApiKeys(userId);
  
  if (keys.length === 0) {
    throw new Error('No ElevenLabs API keys found. Please add a key in your dashboard.');
  }
  
  // First try to use an active key with known quota
  const activeKeysWithQuota = keys.filter(k => k.is_active && (k.quota_remaining === undefined || k.quota_remaining > 0));
  
  if (activeKeysWithQuota.length > 0) {
    // Use the key with highest quota or most recently added if quota is undefined
    const selectedKey = activeKeysWithQuota.sort((a, b) => {
      if (a.quota_remaining !== undefined && b.quota_remaining !== undefined) {
        return b.quota_remaining - a.quota_remaining;
      }
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    })[0];
    
    // Update last_used timestamp
    await updateElevenLabsApiKey(selectedKey.id!, {
      last_used: new Date().toISOString()
    });
    
    return selectedKey.key;
  }
  
  // If no active keys with known quota, try to validate all inactive keys
  for (const key of keys.filter(k => !k.is_active)) {
    try {
      const { subscription } = await validateElevenLabsApiKey(key.key);
      const quotaRemaining = subscription.character_limit - subscription.character_count;
      
      if (quotaRemaining > 0) {
        // Activate this key and update its quota
        await updateElevenLabsApiKey(key.id!, {
          is_active: true,
          quota_remaining: quotaRemaining,
          last_used: new Date().toISOString()
        });
        
        return key.key;
      }
    } catch (error) {
      continue; // Try the next key
    }
  }
  
  throw new Error('All ElevenLabs API keys have reached their quota. Please add a new key.');
};

// Functions related to ElevenLabs voices
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples: Array<{ sample_id: string; file_name: string; mime_type: string; size_bytes: number }>;
  category: string;
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  sharing: {
    status: string;
    history_item_sample_id: string | null;
    original_voice_id: string | null;
  };
  voice_type: string;
}

// Generate podcast audio with ElevenLabs
export const generatePodcastAudio = async (
  text: string, 
  voiceId: string = "21m00Tcm4TlvDq8ikWAM", // Default to Rachel
  userId: string
): Promise<Blob> => {
  try {
    const apiKey = await getActiveElevenLabsApiKey(userId);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if this is a quota exceeded error
      if (response.status === 429 || errorText.includes('quota') || errorText.includes('limit')) {
        // Mark this key as inactive and try again with a different key
        const keys = await fetchElevenLabsApiKeys(userId);
        const currentKey = keys.find(k => k.key === apiKey);
        
        if (currentKey) {
          await updateElevenLabsApiKey(currentKey.id!, {
            is_active: false,
            quota_remaining: 0
          });
        }
        
        // Retry with a different key
        return generatePodcastAudio(text, voiceId, userId);
      }
      
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }
    
    // Update the key's usage stats after successful generation
    try {
      const keys = await fetchElevenLabsApiKeys(userId);
      const usedKey = keys.find(k => k.key === apiKey);
      
      if (usedKey) {
        const { subscription } = await validateElevenLabsApiKey(apiKey);
        const quotaRemaining = subscription.character_limit - subscription.character_count;
        
        await updateElevenLabsApiKey(usedKey.id!, {
          quota_remaining: quotaRemaining,
          last_used: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating key usage stats:', error);
      // Don't fail the audio generation if this fails
    }
    
    return await response.blob();
  } catch (error) {
    if (error instanceof Error && error.message.includes('All ElevenLabs API keys have reached their quota')) {
      throw error; // Rethrow quota error
    }
    
    console.error('Error generating audio:', error);
    throw new Error('Failed to generate audio. Please try again or check your API keys.');
  }
};

// Generate avatar video with ElevenLabs
export const generateAvatarVideo = async (
  audioBlob: Blob,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM",
  userId: string
): Promise<string> => {
  try {
    const apiKey = await getActiveElevenLabsApiKey(userId);
    
    // 1. Create conversion
    const conversionResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-speech/convert", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        voice_id: voiceId,
        generation_config: {
          model_id: "eleven_english_sts_v2"
        }
      })
    });
    
    if (!conversionResponse.ok) {
      const errorText = await conversionResponse.text();
      
      // Check if this is a quota exceeded error
      if (conversionResponse.status === 429 || errorText.includes('quota') || errorText.includes('limit')) {
        // Mark this key as inactive and try again with a different key
        const keys = await fetchElevenLabsApiKeys(userId);
        const currentKey = keys.find(k => k.key === apiKey);
        
        if (currentKey) {
          await updateElevenLabsApiKey(currentKey.id!, {
            is_active: false,
            quota_remaining: 0
          });
        }
        
        // Retry with a different key
        return generateAvatarVideo(audioBlob, voiceId, userId);
      }
      
      throw new Error(`ElevenLabs conversion API error: ${conversionResponse.status} ${errorText}`);
    }
    
    const conversionData = await conversionResponse.json();
    const conversionId = conversionData.conversion_id;
    
    // 2. Upload audio
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.mp3');
    
    const uploadResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}/audio`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`ElevenLabs upload API error: ${uploadResponse.status} ${errorText}`);
    }
    
    // 3. Start conversion
    const startResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({})
    });
    
    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`ElevenLabs start conversion API error: ${startResponse.status} ${errorText}`);
    }
    
    // 4. Poll for completion
    let videoUrl = "";
    let maxAttempts = 30; // 5 minutes (30 * 10s)
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/convert/${conversionId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      if (!statusResponse.ok) {
        continue;
      }
      
      const statusData = await statusResponse.json();
      
      if (statusData.status === "completed") {
        videoUrl = statusData.output_url;
        break;
      } else if (statusData.status === "failed") {
        throw new Error(`ElevenLabs conversion failed: ${statusData.error || "Unknown error"}`);
      }
    }
    
    if (!videoUrl) {
      throw new Error("ElevenLabs conversion timed out");
    }
    
    // Update the key's usage stats after successful generation
    try {
      const keys = await fetchElevenLabsApiKeys(userId);
      const usedKey = keys.find(k => k.key === apiKey);
      
      if (usedKey) {
        const { subscription } = await validateElevenLabsApiKey(apiKey);
        const quotaRemaining = subscription.character_limit - subscription.character_count;
        
        await updateElevenLabsApiKey(usedKey.id!, {
          quota_remaining: quotaRemaining,
          last_used: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating key usage stats:', error);
      // Don't fail the video generation if this fails
    }
    
    return videoUrl;
  } catch (error) {
    if (error instanceof Error && error.message.includes('All ElevenLabs API keys have reached their quota')) {
      throw error; // Rethrow quota error
    }
    
    console.error('Error generating avatar:', error);
    throw new Error('Failed to generate avatar video. Please try again or check your API keys.');
  }
};

// Helper function to ensure status is one of the valid types
function ensureValidStatus(status: string): 'draft' | 'processing' | 'completed' {
  if (status === 'draft' || status === 'processing' || status === 'completed') {
    return status;
  }
  // Default to draft if the status is not one of the expected values
  return 'draft';
}

// Helper function to get flag emoji based on language code
function getLanguageFlag(code: string): string {
  const flags: Record<string, string> = {
    'en': '🇺🇸',
    'es': '🇪🇸',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'ja': '🇯🇵',
    'ko': '🇰🇷',
    'zh': '🇨🇳',
    'ru': '🇷🇺',
    'ar': '🇦🇪',
    'hi': '🇮🇳'
  };
  
  return flags[code] || '🌐';
}
