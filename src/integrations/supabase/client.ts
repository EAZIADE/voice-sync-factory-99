
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://cvfqcvytoobplgracobg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZnFjdnl0b29icGxncmFjb2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTY4NjksImV4cCI6MjA1ODU5Mjg2OX0.k6ho8-LWVYgMAbmu2_pViojgJN51FoWdPREqD-p9htw";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Storage bucket helpers for podcast media files
export const ensurePodcastsBucketExists = async (): Promise<boolean> => {
  try {
    // Check if the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const podcastsBucket = buckets?.find(bucket => bucket.name === 'podcasts');
    
    if (!podcastsBucket) {
      // Create the bucket if it doesn't exist
      const { error } = await supabase.storage.createBucket('podcasts', {
        public: true,
        fileSizeLimit: 100 * 1024 * 1024 // 100MB limit
      });
      
      if (error) {
        console.error('Error creating podcasts bucket:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring podcasts bucket exists:', error);
    return false;
  }
};

export const getMediaUrl = (projectId: string, fileType: 'audio' | 'video'): string => {
  const extension = fileType === 'audio' ? 'mp3' : 'mp4';
  const path = `${projectId}/${fileType}.${extension}`;
  
  // Force no caching
  const timestamp = new Date().getTime();
  const { data } = supabase.storage.from('podcasts').getPublicUrl(`${path}?t=${timestamp}`);
  return data.publicUrl;
};

export const checkMediaFileExists = async (projectId: string, fileType: 'audio' | 'video'): Promise<boolean> => {
  try {
    const extension = fileType === 'audio' ? 'mp3' : 'mp4';
    const path = `${projectId}/${fileType}.${extension}`;
    
    // First attempt to list files in the specific project directory
    const { data, error } = await supabase.storage.from('podcasts').list(projectId, {
      limit: 10,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });
    
    if (error) {
      console.error(`Error checking if ${fileType} file exists:`, error);
      // Try a direct head request to see if the file exists
      try {
        const { data: publicUrlData } = supabase.storage.from('podcasts').getPublicUrl(path);
        if (publicUrlData && publicUrlData.publicUrl) {
          const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
          return response.ok;
        }
      } catch (headError) {
        console.error(`Error checking file with HEAD request:`, headError);
      }
      
      return false;
    }
    
    return data ? data.some(file => file.name === `${fileType}.${extension}`) : false;
  } catch (error) {
    console.error(`Error checking if ${fileType} file exists:`, error);
    return false;
  }
};

export const downloadMediaFile = async (projectId: string, fileType: 'audio' | 'video'): Promise<{success: boolean, url: string, message?: string}> => {
  try {
    const extension = fileType === 'audio' ? 'mp3' : 'mp4';
    const path = `${projectId}/${fileType}.${extension}`;
    
    // Check if session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("No authenticated session for download operation");
    }
    
    // First try getting the public URL for direct access
    const { data: publicUrlData } = supabase.storage.from('podcasts').getPublicUrl(path);
    if (publicUrlData && publicUrlData.publicUrl) {
      // Try a HEAD request first to validate the URL
      try {
        const headResponse = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          return {
            success: true,
            url: publicUrlData.publicUrl,
            message: 'Direct download URL available'
          };
        }
      } catch (headError) {
        console.warn("HEAD request to public URL failed:", headError);
      }
    }
    
    // If public URL didn't work, try direct download
    const { data, error } = await supabase.storage.from('podcasts').download(path);
    
    if (error) {
      throw error;
    }
    
    const url = URL.createObjectURL(data);
    
    return {
      success: true,
      url,
      message: 'Download successful'
    };
  } catch (error) {
    console.error(`Error downloading ${fileType} file:`, error);
    return {
      success: false,
      url: '',
      message: `Failed to download ${fileType} file: ${error.message || 'Unknown error'}`
    };
  }
};

export const deleteMediaFile = async (projectId: string): Promise<{success: boolean, message?: string}> => {
  try {
    // Check if session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        message: 'Authentication required to delete media files'
      };
    }
    
    // Delete both audio and video files
    const { error: audioError } = await supabase.storage
      .from('podcasts')
      .remove([`${projectId}/audio.mp3`]);
      
    if (audioError) {
      console.warn('Warning: Could not delete audio file:', audioError);
    }
    
    const { error: videoError } = await supabase.storage
      .from('podcasts')
      .remove([`${projectId}/video.mp4`]);
      
    if (videoError) {
      console.warn('Warning: Could not delete video file:', videoError);
    }
    
    return { 
      success: true,
      message: 'Media files deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting media files:', error);
    return {
      success: false,
      message: `Failed to delete media files: ${error.message || 'Unknown error'}`
    };
  }
};

// Helper function to check if a user's session is valid
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
};

// Force refresh the auth token
export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      console.error('Failed to refresh session:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
};
