
import React, { useState, useEffect, useRef } from "react";
import { GlassCard, GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import CharacterControls, { CharacterControlState } from "./CharacterControls";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface PodcastPreviewProps {
  projectId?: string;
  status?: 'draft' | 'processing' | 'completed';
  onGenerateClick?: () => void;
  previewUrl?: string;
}

const PodcastPreview = ({ projectId, status = 'draft', onGenerateClick, previewUrl }: PodcastPreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 in seconds
  const [videoError, setVideoError] = useState<string | null>(null);
  const [characterControls, setCharacterControls] = useState<CharacterControlState>({
    expressiveness: 70,
    gestureIntensity: 50,
    speakingPace: 60,
    autoGestures: true,
    eyeContact: true,
  });
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Demo video URL (replace with actual video when available)
  const demoVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-business-woman-talking-4796-large.mp4";
  
  // Determine video source - ensure it's a valid URL with proper validation
  const videoSource = status === 'completed' && previewUrl && typeof previewUrl === 'string' 
    ? previewUrl 
    : demoVideoUrl;
  
  useEffect(() => {
    // Reset video error when source changes
    setVideoError(null);
    
    // When status changes to completed, check if the video is actually available
    if (status === 'completed' && previewUrl) {
      fetch(previewUrl, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            console.error("Video URL returned error:", response.status);
            setVideoError(`Video not available (${response.status})`);
          }
        })
        .catch(err => {
          console.error("Error checking video URL:", err);
          setVideoError("Error accessing video source");
        });
    }
  }, [status, previewUrl]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
          setVideoError(`Error playing video: ${err.message}`);
          
          // Try loading the demo video if the main one fails
          if (videoSource !== demoVideoUrl && videoRef.current) {
            console.log("Falling back to demo video");
            videoRef.current.src = demoVideoUrl;
            videoRef.current.load();
            videoRef.current.play().catch(fallbackErr => {
              console.error("Error playing fallback video:", fallbackErr);
              setVideoError(`Error playing fallback video: ${fallbackErr.message}`);
              setIsPlaying(false);
            });
          } else {
            setIsPlaying(false);
          }
        });
      }
      
      interval = setInterval(() => {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
          
          if (videoRef.current.ended) {
            setIsPlaying(false);
            clearInterval(interval);
          }
        } else {
          setCurrentTime(time => {
            const newTime = time + 1;
            if (newTime >= duration) {
              setIsPlaying(false);
              return 0;
            }
            return newTime;
          });
        }
      }, 1000);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, duration, videoSource, demoVideoUrl]);
  
  useEffect(() => {
    // Set actual duration when video is loaded
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        if (videoRef.current && !isNaN(videoRef.current.duration)) {
          setDuration(videoRef.current.duration);
        }
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Also add error handling for the video element
      const handleError = (e: Event) => {
        console.error("Video element error:", (e.target as HTMLVideoElement).error);
        setVideoError("Video playback error - using fallback");
        
        if (videoSource !== demoVideoUrl && videoRef.current) {
          videoRef.current.src = demoVideoUrl;
          videoRef.current.load();
        }
      };
      
      videoRef.current.addEventListener('error', handleError);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoRef.current.removeEventListener('error', handleError);
        }
      };
    }
  }, [videoSource, demoVideoUrl]);
  
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleControlsChange = (newControls: CharacterControlState) => {
    setCharacterControls(newControls);
    
    // In a real app, we would send these controls to the backend
    console.log("Character controls updated:", newControls);
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = position * duration;
    
    setCurrentTime(newTime);
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };
  
  const handleDownload = () => {
    if (status !== 'completed') {
      toast({
        title: "Podcast not ready",
        description: "Please generate the podcast first before downloading.",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would trigger a download of the generated podcast
    toast({
      title: "Download started",
      description: "Your podcast is being prepared for download."
    });
    
    // Simulate download completion or download the actual video
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = videoSource;
      a.download = `podcast-${projectId || 'demo'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download complete",
        description: "Your podcast has been downloaded successfully."
      });
    }, 1500);
  };
  
  // Log the current video source for debugging
  console.log("Current video source:", videoSource);

  // If we have a video error, show a notification
  useEffect(() => {
    if (videoError) {
      toast({
        title: "Video Playback Issue",
        description: videoError,
        variant: "destructive"
      });
    }
  }, [videoError, toast]);
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="preview">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="controls">Character Controls</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="pt-4">
          <GlassCard className="p-6 overflow-hidden">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                src={videoSource}
                controls
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                onClick={togglePlayback}
                onEnded={() => setIsPlaying(false)}
              />
              
              {(!isPlaying || status === 'processing' || videoError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                  <button 
                    className="w-16 h-16 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110 animate-pulse-soft"
                    onClick={togglePlayback}
                    disabled={status === 'processing' || !!videoError}
                  >
                    {status === 'processing' ? (
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : videoError ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </button>
                  <p className="mt-4 text-white text-sm">
                    {status === 'draft' 
                      ? "Generate podcast to preview" 
                      : status === 'processing' 
                        ? "Processing your podcast..." 
                        : videoError
                          ? videoError
                          : isPlaying 
                            ? "Click to pause preview" 
                            : "Click to play preview"}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <GlassPanel className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div 
                      className="h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                      onClick={handleSeek}
                    >
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent" 
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  <div className="ml-6 flex items-center space-x-4">
                    <button 
                      className="p-2 hover:text-primary transition-colors"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                          setCurrentTime(videoRef.current.currentTime);
                        }
                      }}
                      disabled={status === 'processing' || !!videoError}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
                      </svg>
                    </button>
                    <button 
                      className="p-2 hover:text-primary transition-colors"
                      onClick={togglePlayback}
                      disabled={status === 'processing' || !!videoError}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="4" width="4" height="16"></rect>
                          <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      )}
                    </button>
                    <button 
                      className="p-2 hover:text-primary transition-colors"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                          setCurrentTime(videoRef.current.currentTime);
                        }
                      }}
                      disabled={status === 'processing' || !!videoError}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 4 15 12 5 20 5 4"></polygon>
                        <line x1="19" y1="5" x2="19" y2="19"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </GlassPanel>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                  </svg>
                  <span className="text-sm">AI Voice</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <span className="text-sm">HD Video</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {status === 'draft' && onGenerateClick ? (
                  <AnimatedButton variant="gradient" onClick={onGenerateClick}>
                    Generate Podcast
                  </AnimatedButton>
                ) : status === 'processing' ? (
                  <AnimatedButton variant="gradient" disabled>
                    Processing...
                  </AnimatedButton>
                ) : status === 'completed' ? (
                  <AnimatedButton variant="gradient" onClick={handleDownload}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                  </AnimatedButton>
                ) : null}
              </div>
            </div>
          </GlassCard>
        </TabsContent>
        
        <TabsContent value="controls" className="pt-4">
          <CharacterControls onControlsChange={handleControlsChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PodcastPreview;
