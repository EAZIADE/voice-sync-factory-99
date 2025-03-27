
import { supabase } from "@/integrations/supabase/client";

/**
 * Processes different content source types into usable text for podcast generation
 */
export interface ContentSource {
  type: 'text' | 'url' | 'file';
  content: string;
  fileType?: 'pdf' | 'doc' | 'ppt' | 'video' | 'audio';
}

/**
 * Process a text source directly
 */
export const processTextSource = async (text: string): Promise<string> => {
  // For direct text, we just return it formatted
  return text.trim();
};

/**
 * Process a URL source (webpage, blog, video URL)
 */
export const processUrlSource = async (url: string): Promise<string> => {
  // Check if we have a Supabase function for URL processing
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvfqcvytoobplgracobg.supabase.co';
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("User not authenticated");
    }
    
    const { data: sessionData } = await supabase.auth.getSession();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-content-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token}`
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process URL: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error("Error processing URL:", error);
    // Fallback to basic extraction in case of error
    return `Content from URL: ${url}. Please process this URL to extract relevant content for the podcast.`;
  }
};

/**
 * Upload a file to Supabase storage and process it
 */
export const uploadAndProcessFile = async (file: File, userId: string): Promise<string> => {
  try {
    // Upload to Supabase storage
    const filename = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('content_files')
      .upload(`${userId}/${filename}`, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw uploadError;
    }
    
    // Get the public URL for the file
    const { data: urlData } = await supabase
      .storage
      .from('content_files')
      .getPublicUrl(`${userId}/${filename}`);
    
    const fileUrl = urlData.publicUrl;
    
    // Process the file content using Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvfqcvytoobplgracobg.supabase.co';
    const { data: sessionData } = await supabase.auth.getSession();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-file-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token}`
      },
      body: JSON.stringify({ 
        fileUrl,
        fileType: file.type 
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process file: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error("Error processing file:", error);
    return `[File processing error: ${error.message}]`;
  }
};

/**
 * Main function to process any content source
 */
export const processContentSource = async (source: ContentSource, userId: string): Promise<string> => {
  try {
    switch (source.type) {
      case 'text':
        return await processTextSource(source.content);
      
      case 'url':
        return await processUrlSource(source.content);
      
      case 'file':
        // Assuming source.content is a file path or base64 data
        // In a real implementation, you'd have the File object here
        const fileData = await fetch(source.content);
        const fileBlob = await fileData.blob();
        const file = new File([fileBlob], 'content-file', { type: fileBlob.type });
        return await uploadAndProcessFile(file, userId);
      
      default:
        throw new Error(`Unsupported content source type: ${source.type}`);
    }
  } catch (error) {
    console.error("Error processing content source:", error);
    return `Error processing content: ${error.message}`;
  }
};
