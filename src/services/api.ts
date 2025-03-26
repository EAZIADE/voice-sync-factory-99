
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
