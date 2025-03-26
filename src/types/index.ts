
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
  image_url: string;
  category: string;
  is_premium: boolean;
  created_at?: string;
}

export interface Language {
  id: string;
  name: string;
  code: string;
  flag?: string; // We'll add this client-side
  is_premium: boolean;
  popular?: boolean; // We'll add this client-side
  created_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  script?: string;
  selected_hosts: string[];
  selected_template?: string;
  selected_language?: string;
  status: 'draft' | 'processing' | 'completed';
  created_at?: string;
  updated_at?: string;
}
