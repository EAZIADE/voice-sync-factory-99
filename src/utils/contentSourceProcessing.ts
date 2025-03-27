
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    
    console.log("Sending URL to process:", url);
    console.log("Session exists:", !!sessionData.session);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-content-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token}`
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to process URL (${response.status}): ${errorText}`);
      throw new Error(`Failed to process URL: ${response.statusText}. ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.text || data.text.trim() === '') {
      console.error("No content extracted from URL:", url);
      toast.error("No content could be extracted from this URL.");
      return `The provided URL (${url}) could not be processed. Please try a different URL or provide direct text content.`;
    }
    
    return data.text;
  } catch (error) {
    console.error("Error processing URL:", error);
    // Fallback to basic extraction in case of error
    toast.error("Error processing URL. Using a simplified version.");
    return `Content from URL: ${url}. This URL could not be fully processed. Here's a summary: "${extractDomainFromUrl(url)}" website content for podcast material.`;
  }
};

/**
 * Extract domain from URL for fallback content
 */
const extractDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url;
  }
};

/**
 * Upload a file to Supabase storage and process it
 */
export const uploadAndProcessFile = async (file: File, userId: string): Promise<string> => {
  try {
    console.log("Uploading file:", file.name, "type:", file.type, "size:", file.size);
    
    // Upload to Supabase storage
    const filename = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('content_files')
      .upload(`${userId}/${filename}`, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
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
    console.log("File uploaded successfully:", fileUrl);
    
    // Process the file content using Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvfqcvytoobplgracobg.supabase.co';
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error("No active session found");
    }
    
    console.log("Processing file content via edge function");
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
      const errorText = await response.text();
      console.error(`Failed to process file (${response.status}): ${errorText}`);
      throw new Error(`Failed to process file: ${response.statusText}. ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.text || data.text.trim() === '') {
      console.error("No content extracted from file:", fileUrl);
      toast.error("No content could be extracted from this file.");
      return `The provided file (${file.name}) could not be processed. Please try a different file or provide direct text content.`;
    }
    
    return data.text;
  } catch (error) {
    console.error("Error processing file:", error);
    toast.error(`Error processing file: ${error.message}`);
    return `[File processing error: ${error.message}]`;
  }
};

/**
 * Main function to process any content source
 */
export const processContentSource = async (source: ContentSource, userId: string): Promise<string> => {
  try {
    console.log("Processing content source:", source.type);
    
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
        const fileName = source.content.split('/').pop() || 'content-file';
        const file = new File([fileBlob], fileName, { type: fileBlob.type });
        return await uploadAndProcessFile(file, userId);
      
      default:
        throw new Error(`Unsupported content source type: ${source.type}`);
    }
  } catch (error) {
    console.error("Error processing content source:", error);
    toast.error(`Error processing content: ${error.message}`);
    return `Error processing content: ${error.message}`;
  }
};
