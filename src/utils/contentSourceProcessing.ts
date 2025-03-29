export interface ContentSource {
  type: 'text' | 'url' | 'file';
  content: string;
  fileType?: 'pdf' | 'doc' | 'ppt' | 'video' | 'audio';
}

export interface ProcessedContent {
  content: string;
  title?: string;
  summary?: string;
  error?: string;
}

export const processContentSource = async (
  source: ContentSource,
  userId: string
): Promise<ProcessedContent> => {
  console.log("Processing content source:", source.type);
  
  switch (source.type) {
    case 'text':
      // Simple processing for text content - no complex processing needed
      return {
        content: source.content,
        title: extractTitle(source.content)
      };
      
    case 'url':
      try {
        // For URLs, we would typically extract content from the web page
        // In this simple implementation, we'll just fetch the URL and return its text
        const response = await fetch('/api/extract-url-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: source.content,
            userId: userId
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to extract content from URL: ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          content: data.content,
          title: data.title || extractTitle(data.content),
          summary: data.summary
        };
      } catch (error) {
        console.error("Error extracting URL content:", error);
        return {
          content: `Failed to extract content from URL: ${source.content}. Please try another source or enter text directly.`,
          error: error instanceof Error ? error.message : "Unknown error extracting URL content"
        };
      }
      
    case 'file':
      try {
        // For files, we would typically extract content based on file type
        // This would involve more complex processing depending on the file format
        const response = await fetch('/api/extract-file-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileContent: source.content, // This is the base64 content
            fileType: source.fileType,
            userId: userId
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to extract content from file: ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          content: data.content,
          title: data.title || `Podcast from ${source.fileType} file`,
          summary: data.summary
        };
      } catch (error) {
        console.error("Error extracting file content:", error);
        return {
          content: `Failed to extract content from uploaded file. Please try another file or enter text directly.`,
          error: error instanceof Error ? error.message : "Unknown error extracting file content"
        };
      }
      
    default:
      return {
        content: "Invalid content source type. Please try again with text, URL, or file.",
        error: "Invalid source type"
      };
  }
};

const extractTitle = (content: string): string => {
  // Simple algorithm to extract a title from the content
  // Get the first line that's not empty
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return "Untitled Podcast";
  }
  
  // Take the first line if it's reasonably short (likely a title)
  if (lines[0].length <= 100) {
    return lines[0];
  }
  
  // Otherwise, take the first few words
  const words = lines[0].split(' ');
  return words.slice(0, 5).join(' ') + '...';
};
