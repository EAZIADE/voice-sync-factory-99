
import React, { useState } from "react";
import { GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ContentSource } from "@/utils/contentSourceProcessing";

interface ContentSourceInputProps {
  onSourceSelected: (source: ContentSource) => void;
  isProcessing: boolean;
}

const ContentSourceInput: React.FC<ContentSourceInputProps> = ({ 
  onSourceSelected,
  isProcessing 
}) => {
  const [activeTab, setActiveTab] = useState<string>("text");
  const [textContent, setTextContent] = useState<string>("");
  const [urlContent, setUrlContent] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const handleSelectSource = () => {
    try {
      switch (activeTab) {
        case "text":
          if (!textContent.trim()) {
            toast({
              title: "Missing content",
              description: "Please enter text content for your podcast",
              variant: "destructive"
            });
            return;
          }
          onSourceSelected({
            type: "text",
            content: textContent
          });
          break;
          
        case "url":
          if (!urlContent.trim()) {
            toast({
              title: "Missing URL",
              description: "Please enter a valid URL",
              variant: "destructive"
            });
            return;
          }
          
          // Basic URL validation
          try {
            new URL(urlContent);
          } catch (e) {
            toast({
              title: "Invalid URL",
              description: "Please enter a valid URL format",
              variant: "destructive"
            });
            return;
          }
          
          onSourceSelected({
            type: "url",
            content: urlContent
          });
          break;
          
        case "file":
          if (!selectedFile) {
            toast({
              title: "No file selected",
              description: "Please select a file to upload",
              variant: "destructive"
            });
            return;
          }
          
          // Convert File to base64 for processing
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64Content = e.target?.result as string;
            
            let fileType: 'pdf' | 'doc' | 'ppt' | 'video' | 'audio' | undefined;
            
            if (selectedFile.type.includes('pdf')) fileType = 'pdf';
            else if (selectedFile.type.includes('document')) fileType = 'doc';
            else if (selectedFile.type.includes('presentation')) fileType = 'ppt';
            else if (selectedFile.type.includes('video')) fileType = 'video';
            else if (selectedFile.type.includes('audio')) fileType = 'audio';
            
            onSourceSelected({
              type: "file",
              content: base64Content,
              fileType
            });
          };
          
          reader.readAsDataURL(selectedFile);
          break;
      }
    } catch (error) {
      console.error("Error selecting content source:", error);
      toast({
        title: "Error",
        description: "An error occurred while processing your content",
        variant: "destructive"
      });
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  return (
    <GlassPanel className="p-6">
      <h3 className="text-lg font-semibold mb-4">Select Podcast Source</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="file">File Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="space-y-4">
          <div>
            <Textarea
              placeholder="Enter podcast script or text content..."
              className="min-h-[200px]"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter your podcast script or text content directly. For best results, aim for 200-800 words.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="url" className="space-y-4">
          <div>
            <Input
              placeholder="https://example.com/article"
              value={urlContent}
              onChange={(e) => setUrlContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter a URL to a blog post, article, or web page. We'll extract the relevant content.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="file" className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp3,.mp4,.wav,.avi"
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm text-muted-foreground mb-1">
                {selectedFile ? selectedFile.name : "Click to select file"}
              </span>
              <span className="text-xs text-muted-foreground">
                Support PDF, DOC, PPT, MP3, MP4, and more
              </span>
            </label>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
        <AnimatedButton
          variant="gradient"
          onClick={handleSelectSource}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? "Processing..." : "Use This Source"}
        </AnimatedButton>
      </div>
    </GlassPanel>
  );
};

export default ContentSourceInput;
