
import { supabase } from "@/integrations/supabase/client";
import { Host, Template, Language, Project } from "@/types";

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

// ElevenLabs API functions
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
  apiKey: string
): Promise<Blob> => {
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
    throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
  }
  
  return await response.blob();
};

// Generate avatar video with ElevenLabs
export const generateAvatarVideo = async (
  audioBlob: Blob,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM",
  apiKey: string
): Promise<string> => {
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
  
  return videoUrl;
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
