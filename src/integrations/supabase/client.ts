
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Session management functions
export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Error refreshing session:", error);
      return false;
    }
    
    return !!data.session;
  } catch (error) {
    console.error("Exception refreshing session:", error);
    return false;
  }
};

export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error getting session:", error);
      return false;
    }
    
    if (!data.session) {
      return false;
    }
    
    // Check if session is expired
    const expiresAt = data.session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt < now) {
        // Session is expired, try to refresh
        return refreshSession();
      }
    }
    
    return true;
  } catch (error) {
    console.error("Exception checking session:", error);
    return false;
  }
};

// Media handling functions
export const downloadMediaFile = async (
  projectId: string, 
  type: 'audio' | 'video'
): Promise<{ success: boolean; url: string; message?: string }> => {
  try {
    console.log(`Attempting to download ${type} for project ${projectId}`);
    
    // First check if valid session exists
    const isValid = await isSessionValid();
    if (!isValid) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        return { 
          success: false, 
          url: '', 
          message: 'Authentication required. Please sign in to download media.'
        };
      }
    }
    
    // Try to download the file directly first
    try {
      const blob = await downloadMediaBlob(projectId, type);
      
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        return { success: true, url };
      }
    } catch (error) {
      console.error(`Error downloading ${type} blob for project ${projectId}:`, error);
      // Continue to try signed URL method
    }
    
    // Fall back to signed URL
    const signedUrl = await getSignedUrl(projectId, type);
    
    if (!signedUrl) {
      return { 
        success: false, 
        url: '', 
        message: `Failed to get download URL for ${type}. Media might not be available yet.`
      };
    }
    
    return { success: true, url: signedUrl };
  } catch (error) {
    console.error(`Error downloading ${type} for project ${projectId}:`, error);
    return { 
      success: false, 
      url: '', 
      message: `An error occurred while downloading the ${type}. Please try again.`
    };
  }
};

export const getSignedUrl = async (projectId: string, type: 'audio' | 'video'): Promise<string | null> => {
  try {
    const fileExtension = type === 'video' ? 'mp4' : 'mp3';
    const filePath = `podcast_outputs/${projectId}/${type}.${fileExtension}`;
    
    console.log(`Getting signed URL for ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(filePath, 60 * 5); // 5 minutes expiry
    
    if (error) {
      console.error(`Error getting signed URL for ${type}:`, error);
      return null;
    }
    
    console.log(`Got signed URL for ${type}:`, data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error(`Exception getting signed URL for ${type}:`, error);
    return null;
  }
};

export const downloadMediaBlob = async (projectId: string, type: 'audio' | 'video'): Promise<Blob | null> => {
  try {
    const fileExtension = type === 'video' ? 'mp4' : 'mp3';
    const filePath = `podcast_outputs/${projectId}/${type}.${fileExtension}`;
    
    console.log(`Downloading ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from('media')
      .download(filePath);
    
    if (error) {
      console.error(`Error downloading ${type} blob:`, error);
      return null;
    }
    
    console.log(`Downloaded ${type} blob:`, data.size, "bytes");
    return data;
  } catch (error) {
    console.error(`Exception downloading ${type} blob:`, error);
    return null;
  }
};

export const deleteMediaFile = async (projectId: string, userId: string): Promise<boolean> => {
  try {
    const videoPath = `podcast_outputs/${projectId}/video.mp4`;
    const audioPath = `podcast_outputs/${projectId}/audio.mp3`;
    
    // Delete from storage
    const { error: videoError } = await supabase.storage
      .from('media')
      .remove([videoPath]);
    
    const { error: audioError } = await supabase.storage
      .from('media')
      .remove([audioPath]);
    
    if (videoError) {
      console.error("Error deleting video:", videoError);
    }
    
    if (audioError) {
      console.error("Error deleting audio:", audioError);
    }
    
    // Update project status in database
    const { error: projectError } = await supabase
      .from('projects')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('user_id', userId);
    
    if (projectError) {
      console.error("Error updating project status:", projectError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception deleting media:", error);
    return false;
  }
};

// Add the missing functions
export const getMediaUrl = (projectId: string, type: 'audio' | 'video'): string => {
  const fileExtension = type === 'video' ? 'mp4' : 'mp3';
  return `${supabaseUrl}/storage/v1/object/public/media/podcast_outputs/${projectId}/${type}.${fileExtension}`;
};

export const checkMediaFileExists = async (projectId: string, type: 'audio' | 'video'): Promise<boolean> => {
  try {
    const fileExtension = type === 'video' ? 'mp4' : 'mp3';
    const filePath = `podcast_outputs/${projectId}/${type}.${fileExtension}`;
    
    // Check if file exists in Supabase storage
    const { data, error } = await supabase.storage
      .from('media')
      .list(filePath.split('/').slice(0, -1).join('/'));
    
    if (error) {
      console.error(`Error checking if ${type} file exists:`, error);
      return false;
    }
    
    // Check if any files match the expected filename
    return !!data?.some(file => file.name === `${type}.${fileExtension}`);
  } catch (error) {
    console.error(`Exception checking if ${type} file exists:`, error);
    return false;
  }
};

export const ensurePodcastsBucketExists = async (): Promise<boolean> => {
  try {
    // Check if the media bucket exists
    const { data, error } = await supabase.storage.getBucket('media');
    
    if (error) {
      console.error("Error checking media bucket:", error);
      
      // If the bucket doesn't exist, try to create it
      if (error.message.includes('not found')) {
        const { data: createData, error: createError } = await supabase.storage.createBucket('media', {
          public: true
        });
        
        if (createError) {
          console.error("Error creating media bucket:", createError);
          return false;
        }
        
        console.log("Media bucket created successfully");
        return true;
      }
      
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Exception ensuring media bucket exists:", error);
    return false;
  }
};
