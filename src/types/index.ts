export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'draft' | 'processing' | 'completed' | 'deleted';
  created_at: string;
  updated_at: string;
  source_content?: string;
  source_type?: string;
  selected_hosts?: string[];
  selected_language?: string;
  video_url?: string;
  audio_url?: string;
  storage_path?: string;
  generation_error?: string | null;
  character_controls?: Record<string, any>;
  script?: string;
  source_content?: string; // Added the source_content property
  source_type?: string;   // Added the source_type property
}

export interface Host {
  id: string;
  name: string;
  image_url: string;
  style: string;
  is_premium: boolean;
  languages: string[];
  voice_id?: string;
  model_id?: string;
}

export interface Language {
  id: string;
  name: string;
  code: string;
  flag: string;
  popular: boolean;
  is_premium: boolean;
}

export interface ElevenLabsApiKey {
  id?: string;
  user_id: string;
  key: string;
  name: string;
  is_active: boolean;
  is_local?: boolean;
  created_at?: string;
  updated_at?: string;
  last_used?: string | null;
  quota_remaining?: number | null;
}
