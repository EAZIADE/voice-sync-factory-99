
import React, { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard, GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import CharacterControls, { CharacterControlState } from "./CharacterControls";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Trash, Pencil, RotateCcw } from "lucide-react";
import { 
  downloadMediaFile, 
  deleteMediaFile, 
  isSessionValid, 
  refreshSession,
  getSignedUrl,
  downloadMediaBlob 
} from "@/integrations/supabase/client";

interface PodcastPreviewProps {
  projectId?: string;
  status?: 'draft' | 'processing' | 'completed';
  onGenerateClick?: () => void;
  onDeleteClick?: () => void;
  onUpdateClick?: () => void;
  onResetClick?: () => void;
  previewUrl?: string;
  audioUrl?: string;
  generationError?: string | null;
}

const PodcastPreview = ({ 
  projectId, 
  status = 'draft', 
  onGenerateClick, 
  onDeleteClick,
  onUpdateClick,
  onResetClick,
  previewUrl, 
  audioUrl,
  generationError 
}: PodcastPreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 in seconds
  const [videoError, setVideoError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [localMediaUrls, setLocalMediaUrls] = useState<{video?: string, audio?: string}>({});
  
  const [characterControls, setCharacterControls] = useState<CharacterControlState>({
    expressiveness: 70,
    gestureIntensity: 50,
    speakingPace: 60,
    autoGestures: true,
    eyeContact: true,
  });
  
  const { toast: hookToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Reliable demo media URLs that will definitely work
  const demoVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-business-woman-talking-4796-large.mp4";
  const demoAudioUrl = "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3";
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      const valid = await isSessionValid();
      setIsAuthenticated(valid);
      
      if (!valid) {
        console.log("User is not authenticated. Some functionality may not work correctly.");
        const refreshed = await refreshSession();
        setIsAuthenticated(refreshed);
      }
    };
    
    checkAuth();
  }, []);

  // Always use the demo media for draft and processing stages
  const videoSource = status === 'completed' && previewUrl ? 
    (localMediaUrls.video || previewUrl) : demoVideoUrl;
  const audioSource = status === 'completed' && audioUrl ? 
    (localMediaUrls.audio || audioUrl) : demoAudioUrl;
  
  // Reset errors when status changes
  useEffect(() => {
    setVideoError(null);
    setAudioError(null);
    setLoadAttempts(0);
    
    if (status === 'completed') {
      console.log('Media sources updated:', { 
        previewUrl, 
        audioUrl,
        localVideoUrl: localMediaUrls.video,
        localAudioUrl: localMediaUrls.audio
      });
    }
  }, [status, previewUrl, audioUrl, localMediaUrls]);

  // Load media for completed projects
  useEffect(() => {
    if (status !== 'completed' || !projectId) return;
    
    const loadMediaForProject = async () => {
      setIsMediaLoading(true);
      
      try {
        console.log(`Attempting to get media for project: ${projectId}`);
        
        // Always use demo media as fallback first
        if (videoRef.current) {
          videoRef.current.src = demoVideoUrl;
          videoRef.current.load();
        }
        
        if (audioRef.current) {
          audioRef.current.src = demoAudioUrl;
          audioRef.current.load();
        }
        
        // Try to get actual media
        const videoBlob = await downloadMediaBlob(projectId, 'video');
        if (videoBlob) {
          const videoUrl = URL.createObjectURL(videoBlob);
          console.log("Created local video URL from blob:", videoUrl);
          setLocalMediaUrls(prev => ({ ...prev, video: videoUrl }));
        } else {
          // Try signed URL as fallback
          const signedVideoUrl = await getSignedUrl(projectId, 'video');
          if (signedVideoUrl) {
            console.log("Got signed video URL:", signedVideoUrl);
            setLocalMediaUrls(prev => ({ ...prev, video: signedVideoUrl }));
          }
        }
        
        const audioBlob = await downloadMediaBlob(projectId, 'audio');
        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log("Created local audio URL from blob:", audioUrl);
          setLocalMediaUrls(prev => ({ ...prev, audio: audioUrl }));
        } else {
          const signedAudioUrl = await getSignedUrl(projectId, 'audio');
          if (signedAudioUrl) {
            console.log("Got signed audio URL:", signedAudioUrl);
            setLocalMediaUrls(prev => ({ ...prev, audio: signedAudioUrl }));
          }
        }
      } catch (error) {
        console.error("Error loading media for project:", error);
      } finally {
        setIsMediaLoading(false);
      }
    };
    
    loadMediaForProject();
  }, [status, projectId, demoVideoUrl, demoAudioUrl]);

  // Handle media playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      const playMedia = async () => {
        if (mediaType === 'video' && videoRef.current) {
          try {
            await videoRef.current.play();
          } catch (err) {
            console.error("Error playing video:", err);
            setVideoError(`Error playing video: ${err instanceof Error ? err.message : 'Unknown error'}`);
            
            // Always fall back to demo video
            if (videoRef.current) {
              videoRef.current.src = demoVideoUrl;
              videoRef.current.load();
              try {
                await videoRef.current.play();
              } catch (demoErr) {
                console.error("Error playing demo video:", demoErr);
                setMediaType('audio');
              }
            }
          }
        } else if (mediaType === 'audio' && audioRef.current) {
          try {
            await audioRef.current.play();
          } catch (err) {
            console.error("Error playing audio:", err);
            setAudioError(`Error playing audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
            
            // Always fall back to demo audio
            if (audioRef.current) {
              audioRef.current.src = demoAudioUrl;
              audioRef.current.load();
              try {
                await audioRef.current.play();
              } catch (demoErr) {
                console.error("Error playing demo audio:", demoErr);
                setIsPlaying(false);
                toast.error("Couldn't play any audio");
              }
            }
          }
        }
      };
      
      playMedia();
      
      interval = setInterval(() => {
        const mediaElement = mediaType === 'video' ? videoRef.current : audioRef.current;
        
        if (mediaElement) {
          setCurrentTime(mediaElement.currentTime);
          
          if (mediaElement.ended) {
            setIsPlaying(false);
            clearInterval(interval);
          }
        }
      }, 1000);
    } else {
      if (mediaType === 'video' && videoRef.current) {
        videoRef.current.pause();
      } else if (mediaType === 'audio' && audioRef.current) {
        audioRef.current.pause();
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, mediaType, demoVideoUrl, demoAudioUrl]);

  // Media event handlers
  useEffect(() => {
    const handleLoadedMetadata = (e: Event) => {
      const target = e.target as HTMLMediaElement;
      if (target && !isNaN(target.duration)) {
        setDuration(target.duration);
        console.log(`${mediaType} metadata loaded, duration:`, target.duration);
      }
    };
    
    const handleError = (e: Event) => {
      const target = e.target as HTMLMediaElement;
      console.error(`${mediaType} element error:`, target.error);
      
      const errorMessage = target.error?.message || 'unknown error';
      const errorCode = target.error?.code || 0;
      
      if (mediaType === 'video') {
        setVideoError(`Video error (${errorCode}): ${errorMessage}`);
        
        // Always fall back to demo video
        if (videoRef.current) {
          videoRef.current.src = demoVideoUrl;
          videoRef.current.load();
        }
      } else {
        setAudioError(`Audio error (${errorCode}): ${errorMessage}`);
        
        // Always fall back to demo audio
        if (audioRef.current) {
          audioRef.current.src = demoAudioUrl;
          audioRef.current.load();
        }
      }
      
      setIsPlaying(false);
      
      toast({
        title: `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Playback Error`,
        description: "Format error. Using built-in demo media.",
        variant: "destructive"
      });
    };
    
    const handleCanPlay = () => {
      console.log(`${mediaType} can play`);
      if (mediaType === 'video') {
        setVideoError(null);
      } else {
        setAudioError(null);
      }
    };
    
    const videoElement = videoRef.current;
    const audioElement = audioRef.current;
    
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);
      videoElement.addEventListener('canplay', handleCanPlay);
    }
    
    if (audioElement) {
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('error', handleError);
      audioElement.addEventListener('canplay', handleCanPlay);
    }
    
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
        videoElement.removeEventListener('canplay', handleCanPlay);
      }
      
      if (audioElement) {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('error', handleError);
        audioElement.removeEventListener('canplay', handleCanPlay);
      }
    };
  }, [mediaType, demoVideoUrl, demoAudioUrl]);

  // UI event handlers
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleSwitch = () => {
    console.log("Switching from", mediaType, "to", mediaType === 'video' ? 'audio' : 'video');
    setMediaType(mediaType === 'video' ? 'audio' : 'video');
    setIsPlaying(false);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleControlsChange = (newControls: CharacterControlState) => {
    setCharacterControls(newControls);
    console.log("Character controls updated:", newControls);
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = position * duration;
    
    setCurrentTime(newTime);
    
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = newTime;
    } else if (mediaType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  
  const handleDownload = async () => {
    if (status !== 'completed') {
      hookToast({
        title: "Podcast not ready",
        description: "Please generate the podcast first before downloading.",
        variant: "destructive"
      });
      return;
    }
    
    if (!projectId) {
      hookToast({
        title: "Project ID missing",
        description: "Cannot download without a valid project ID.",
        variant: "destructive"
      });
      return;
    }
    
    // Refresh session if needed
    const isValid = await isSessionValid();
    if (!isValid) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        hookToast({
          title: "Authentication required",
          description: "Please sign in again to download your podcast.",
          variant: "destructive"
        });
        return;
      }
    }

    toast.info("Download started", {
      description: `Preparing your podcast ${mediaType} for download...`
    });
    
    try {
      // First try to use local blob URLs if available
      if (mediaType === 'video' && localMediaUrls.video && localMediaUrls.video.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = localMediaUrls.video;
        a.download = `podcast-${projectId}-video.mp4`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
        
        toast.success("Download initiated", {
          description: `Your video is being downloaded.`
        });
        return;
      }
      
      if (mediaType === 'audio' && localMediaUrls.audio && localMediaUrls.audio.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = localMediaUrls.audio;
        a.download = `podcast-${projectId}-audio.mp3`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
        
        toast.success("Download initiated", {
          description: `Your audio is being downloaded.`
        });
        return;
      }
      
      // Fall back to server download
      const result = await downloadMediaFile(projectId, mediaType);
      
      if (!result.success) {
        toast.error("Download failed", {
          description: result.message || "Failed to download media file."
        });
        return;
      }
      
      const a = document.createElement('a');
      a.href = result.url;
      a.download = `podcast-${projectId}-${mediaType === 'video' ? 'video.mp4' : 'audio.mp3'}`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        if (result.url.startsWith('blob:')) {
          URL.revokeObjectURL(result.url);
        }
      }, 100);
      
      toast.success("Download initiated", {
        description: `Your ${mediaType} is being downloaded.`
      });
    } catch (error) {
      console.error("Error in handleDownload:", error);
      toast.error("Download failed", {
        description: "An unexpected error occurred during download."
      });
    }
  };

  const handleDelete = async () => {
    const isValid = await isSessionValid();
    if (!isValid) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        hookToast({
          title: "Authentication required",
          description: "Please sign in again to delete your podcast.",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (onDeleteClick) {
      onDeleteClick();
    }
  };

  const handleUpdate = () => {
    if (onUpdateClick) {
      onUpdateClick();
    }
  };

  const handleReset = () => {
    if (onResetClick) {
      onResetClick();
    }
  };
  
  // Force reload media
  const handleReloadMedia = async () => {
    if (!projectId || status !== 'completed') return;
    
    setIsPlaying(false);
    setVideoError(null);
    setAudioError(null);
    setLoadAttempts(0);
    
    // Clear existing object URLs to prevent memory leaks
    if (localMediaUrls.video && localMediaUrls.video.startsWith('blob:')) {
      URL.revokeObjectURL(localMediaUrls.video);
    }
    if (localMediaUrls.audio && localMediaUrls.audio.startsWith('blob:')) {
      URL.revokeObjectURL(localMediaUrls.audio);
    }
    
    setLocalMediaUrls({});
    
    toast.info("Reloading media files", {
      description: "Attempting to reload podcast files from server..."
    });
    
    // Set demo media immediately for a better user experience
    if (videoRef.current) {
      videoRef.current.src = demoVideoUrl;
      videoRef.current.load();
    }
    
    if (audioRef.current) {
      audioRef.current.src = demoAudioUrl;
      audioRef.current.load();
    }
    
    setIsMediaLoading(true);
    
    try {
      // Attempt to download media blobs directly
      const videoBlob = await downloadMediaBlob(projectId, 'video');
      const audioBlob = await downloadMediaBlob(projectId, 'audio');
      
      const newUrls: {video?: string, audio?: string} = {};
      
      if (videoBlob) {
        newUrls.video = URL.createObjectURL(videoBlob);
        console.log("Created new local video URL:", newUrls.video);
      }
      
      if (audioBlob) {
        newUrls.audio = URL.createObjectURL(audioBlob);
        console.log("Created new local audio URL:", newUrls.audio);
      }
      
      setLocalMediaUrls(newUrls);
      
      if (Object.keys(newUrls).length > 0) {
        toast.success("Media reloaded", {
          description: "Podcast files have been refreshed"
        });
      } else {
        toast.warning("Using demo media", {
          description: "Using built-in demo media as a fallback"
        });
      }
    } catch (error) {
      console.error("Error reloading media:", error);
      toast.error("Media reload error", {
        description: "An error occurred. Using demo media instead."
      });
    } finally {
      setIsMediaLoading(false);
    }
  };
  
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
              {mediaType === 'video' ? (
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  src={demoVideoUrl} // Always default to demo video first
                  controls={false}
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onClick={togglePlayback}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                      </svg>
                    </div>
                  </div>
                  <audio 
                    ref={audioRef}
                    src={demoAudioUrl} // Always default to demo audio first
                    preload="metadata"
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </>
              )}
              
              {(!isPlaying || status === 'processing' || isMediaLoading || videoError || audioError || generationError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                  <button 
                    className="w-16 h-16 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110 animate-pulse-soft"
                    onClick={isMediaLoading ? undefined : togglePlayback}
                    disabled={status === 'processing' || isMediaLoading || !!generationError}
                  >
                    {status === 'processing' || isMediaLoading ? (
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : generationError ? (
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
                  <p className="mt-4 text-white text-sm px-4 text-center">
                    {status === 'draft' 
                      ? "Generate podcast to preview" 
                      : status === 'processing' 
                        ? "Processing your podcast with ElevenLabs..." 
                        : isMediaLoading
                          ? "Loading media files..."
                          : videoError && mediaType === 'video'
                            ? "Using demo video - click to play"
                            : audioError && mediaType === 'audio'
                              ? "Using demo audio - click to play"
                              : generationError
                                ? "Generation error - see details below"
                                : isPlaying 
                                  ? "Click to pause preview" 
                                  : "Click to play preview"}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <button 
                onClick={handleReloadMedia}
                disabled={!projectId || status !== 'completed' || isMediaLoading}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-full bg-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
                Reload Media
              </button>
              
              <button 
                onClick={handleSwitch}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-full bg-secondary/20"
              >
                {mediaType === 'video' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                    Switch to Audio View
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    Switch to Video View
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-2">
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
                        const mediaElement = mediaType === 'video' ? videoRef.current : audioRef.current;
                        if (mediaElement) {
                          mediaElement.currentTime = Math.max(0, mediaElement.currentTime - 10);
                          setCurrentTime(mediaElement.currentTime);
                        }
                      }}
                      disabled={status === 'processing' || isMediaLoading || !!generationError}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
                      </svg>
                    </button>
                    <button 
                      className="p-2 hover:text-primary transition-colors"
                      onClick={togglePlayback}
                      disabled={status === 'processing' || isMediaLoading || !!generationError}
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
                        const mediaElement = mediaType === 'video' ? videoRef.current : audioRef.current;
                        if (mediaElement) {
                          mediaElement.currentTime = Math.min(duration, mediaElement.currentTime + 10);
                          setCurrentTime(mediaElement.currentTime);
                        }
                      }}
                      disabled={status === 'processing' || isMediaLoading || !!generationError}
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
                  <span className="text-sm">ElevenLabs AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <span className="text-sm">HD {mediaType === 'video' ? 'Video' : 'Audio'}</span>
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
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <AnimatedButton variant="gradient" onClick={handleDownload} disabled={isMediaLoading}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download
                    </AnimatedButton>
                    
                    {status === 'completed' && (
                      <>
                        <Button 
                          variant="destructive" 
                          onClick={handleDelete}
                          className="flex items-center gap-1"
                          disabled={isMediaLoading}
                        >
                          <Trash size={16} /> Delete
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleUpdate}
                          className="flex items-center gap-1"
                          disabled={isMediaLoading}
                        >
                          <Pencil size={16} /> Update
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={handleReset}
                          className="flex items-center gap-1"
                          disabled={isMediaLoading}
                        >
                          <RotateCcw size={16} /> Reset
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </TabsContent>
        
        <TabsContent value="controls" className="pt-4">
          <CharacterControls onControlsChange={handleControlsChange} />
        </TabsContent>
      </Tabs>
      
      {(videoError || audioError) && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Media Format Notice</h3>
          <p className="mt-1 text-xs text-yellow-700">
            Using built-in demo media for preview. You can still generate your podcast.
          </p>
          <ul className="mt-2 text-xs text-yellow-700 list-disc pl-4 space-y-1">
            <li>The demo media will be used until your podcast is successfully generated</li>
            <li>Click "Generate Podcast" to create your AI podcast</li>
            <li>If issues persist, try the "Reload Media" button after generation</li>
          </ul>
        </div>
      )}
      
      {generationError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800">Generation Error</h3>
          <p className="mt-1 text-xs text-red-700">
            {generationError}
          </p>
          <ul className="mt-2 text-xs text-red-700 list-disc pl-4 space-y-1">
            <li>Try regenerating with different settings</li>
            <li>Check your ElevenLabs API key is valid</li>
            <li>Try again later if service is busy</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PodcastPreview;
