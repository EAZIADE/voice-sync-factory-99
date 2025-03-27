
export interface Host {
  id: string;
  name: string;
  image_url: string;
  style: string;
  languages: string[];
  is_premium: boolean;
  created_at?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  is_premium: boolean;
  created_at?: string;
}

export interface Language {
  id: string;
  name: string;
  code: string;
  flag: string;
  popular: boolean;
  is_premium: boolean;
  created_at?: string;
}

export interface Project {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  script?: string | null;
  selected_hosts: string[];
  selected_template: string;
  selected_language: string;
  status: 'draft' | 'processing' | 'completed';
  result_url?: string | null;
  audio_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ElevenLabsApiKey {
  id?: string;
  user_id: string;
  key: string;
  name: string;
  is_active: boolean;
  is_local?: boolean; // Flag to indicate if the key is stored locally
  quota_remaining?: number;
  last_used?: string;
  created_at?: string;
  updated_at?: string;
}
