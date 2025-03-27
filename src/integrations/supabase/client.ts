
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvfqcvytoobplgracobg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZnFjdnl0b29icGxncmFjb2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4MzYwMDAsImV4cCI6MjAzMjE5ODQwMH0.KqTC1Mjb-k11j8CzRYs5FY-rp6FTFn9BcnLLTsz-1M0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the URL for a media file stored in Supabase Storage
 */
export const getMediaUrl = (projectId: string, type: 'video' | 'audio'): string => {
  const fileExtension = type === 'video' ? 'mp4' : 'mp3';
  const fileName = `${projectId}.${fileExtension}`;
  const bucket = 'media';
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};

/**
 * Check if a media file exists in Supabase Storage
 */
export const checkMediaFileExists = async (projectId: string, type: 'video' | 'audio'): Promise<boolean> => {
  try {
    const fileExtension = type === 'video' ? 'mp4' : 'mp3';
    const fileName = `${projectId}.${fileExtension}`;
    const bucket = 'media';
    
    const { data, error } = await supabase.storage.from(bucket).list('', {
      search: fileName
    });
    
    if (error) {
      console.error('Error checking if media file exists:', error);
      return false;
    }
    
    return data.some(file => file.name === fileName);
  } catch (err) {
    console.error('Error in checkMediaFileExists:', err);
    return false;
  }
};
