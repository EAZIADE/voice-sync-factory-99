import React, { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard, GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import CharacterControls, { CharacterControlState } from "./CharacterControls";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";

interface PodcastPreviewProps {
  projectId?: string;
  status?: 'draft' | 'processing' | 'completed';
  onGenerateClick?: () => void;
  previewUrl?: string;
  audioUrl?: string;
  generationError?: string | null;
}

const PodcastPreview = ({ 
  projectId, 
  status = 'draft', 
  onGenerateClick, 
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
  
  const demoVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-business-woman-talking-4796-large.mp4";
  const demoAudioUrl = "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3";
  
  const sanitizeMediaUrl = useCallback((url?: string): string => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return '';
    }
    return url;
  }, []);
  
  const videoSource = status === 'completed' && previewUrl ? sanitizeMediaUrl(previewUrl) || demoVideoUrl : demoVideoUrl;
  const audioSource = status === 'completed' && audioUrl ? sanitizeMediaUrl(audioUrl) || demoAudioUrl : demoAudioUrl;
  
  useEffect(() => {
    setVideoError(null);
    setAudioError(null);
    setLoadAttempts(0);
    
    if (status === 'completed') {
      console.log('Media sources updated:', { 
        video: previewUrl, 
        sanitizedVideo: sanitizeMediaUrl(previewUrl),
        audio: audioUrl,
        sanitizedAudio: sanitizeMediaUrl(audioUrl)
      });
    }
  }, [previewUrl, audioUrl, status, sanitizeMediaUrl]);

  const validateMediaUrl = useCallback(async (url: string, mediaType: 'video' | 'audio'): Promise<boolean> => {
    if (!url || !url.startsWith('http')) {
      console.error(`Invalid ${mediaType} URL format:`, url);
      if (mediaType === 'video') {
        setVideoError(`Invalid video URL format`);
      } else {
        setAudioError(`Invalid audio URL format`);
      }
      return false;
    }
    
    try {
      console.log(`Validating ${mediaType} URL:`, url);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-store'
      });
      
      console.log(`${mediaType} validation result:`, {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      if (!response.ok) {
        if (mediaType === 'video') {
          setVideoError(`Video file not accessible (${response.status})`);
        } else {
          setAudioError(`Audio file not accessible (${response.status})`);
        }
        return false;
      }
      
      return true;
    } catch (err) {
      console.error(`Error checking ${mediaType} URL:`, err);
      if (mediaType === 'video') {
        setVideoError(`Error accessing video source: ${err.message}`);
      } else {
        setAudioError(`Error accessing audio source: ${err.message}`);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (status !== 'completed' || loadAttempts > 5) return;

    const loadMedia = async () => {
      console.log("Attempting to load media (attempt", loadAttempts + 1, ")");
      console.log("Video source:", videoSource);
      console.log("Audio source:", audioSource);
      
      if (videoSource !== demoVideoUrl) {
        const videoValid = await validateMediaUrl(videoSource, 'video');
        if (!videoValid) {
          setMediaType('audio');
          console.log("Video validation failed, switching to audio mode");
        } else if (videoRef.current) {
          console.log("Setting video source to:", videoSource);
          videoRef.current.src = videoSource;
          videoRef.current.load();
        }
      }
      
      if (audioSource !== demoAudioUrl) {
        const audioValid = await validateMediaUrl(audioSource, 'audio');
        if (!audioValid && audioRef.current) {
          console.log("Audio validation failed, using demo audio");
          audioRef.current.src = demoAudioUrl;
          audioRef.current.load();
        } else if (audioRef.current) {
          console.log("Setting audio source to:", audioSource);
          audioRef.current.src = audioSource;
          audioRef.current.load();
        }
      }
      
      setLoadAttempts(prev => prev + 1);
    };
    
    const timeoutId = setTimeout(loadMedia, 1000 * Math.min(loadAttempts + 1, 3));
    
    return () => clearTimeout(timeoutId);
  }, [status, videoSource, audioSource, loadAttempts, validateMediaUrl, demoVideoUrl, demoAudioUrl]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      const playMedia = async () => {
        if (mediaType === 'video' && videoRef.current) {
          try {
            await videoRef.current.play();
          } catch (err) {
            console.error("Error playing video:", err);
            setVideoError(`Error playing video: ${err.message}`);
            
            if (videoSource !== demoVideoUrl) {
              if (videoRef.current) {
                console.log("Trying demo video instead");
                videoRef.current.src = demoVideoUrl;
                videoRef.current.load();
                try {
                  await videoRef.current.play();
                } catch (demoErr) {
                  console.error("Error playing demo video:", demoErr);
                  setMediaType('audio');
                }
              }
            } else {
              setMediaType('audio');
            }
          }
        } else if (mediaType === 'audio' && audioRef.current) {
          try {
            await audioRef.current.play();
          } catch (err) {
            console.error("Error playing audio:", err);
            setAudioError(`Error playing audio: ${err.message}`);
            
            if (audioSource !== demoAudioUrl) {
              if (audioRef.current) {
                console.log("Trying demo audio instead");
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
            } else {
              setIsPlaying(false);
              toast.error("Audio playback error");
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
      if (mediaType === 'video' && videoRef.current) {
        videoRef.current.pause();
      } else if (mediaType === 'audio' && audioRef.current) {
        audioRef.current.pause();
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, mediaType, videoSource, audioSource, demoVideoUrl, demoAudioUrl, duration]);

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
        
        if (videoSource !== demoVideoUrl && videoRef.current) {
          console.log("Switching to demo video");
          videoRef.current.src = demoVideoUrl;
          videoRef.current.load();
        } else {
          setMediaType('audio');
        }
      } else {
        setAudioError(`Audio error (${errorCode}): ${errorMessage}`);
        
        if (audioSource !== demoAudioUrl && audioRef.current) {
          console.log("Switching to demo audio");
          audioRef.current.src = demoAudioUrl;
          audioRef.current.load();
        }
      }
      
      setIsPlaying(false);
      
      toast.error(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Playback Error`, {
        description: "Format error. Trying fallback media."
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
  }, [mediaType, videoSource, audioSource, demoVideoUrl, demoAudioUrl]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleSwitch = () => {
    console.log("Attempting to switch from", mediaType, "to", mediaType === 'video' ? 'audio' : 'video');
    if (mediaType === 'video') {
      setMediaType('audio');
    } else {
      if (videoError) {
        toast.error("Video playback error", {
          description: "Cannot switch to video due to playback issues"
        });
      } else {
        setMediaType('video');
      }
    }
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
  
  const handleDownload = () => {
    if (status !== 'completed') {
      hookToast({
        title: "Podcast not ready",
        description: "Please generate the podcast first before downloading.",
        variant: "destructive"
      });
      return;
    }
    
    const downloadUrl = mediaType === 'video' 
      ? (videoError || !sanitizeMediaUrl(videoSource) ? demoVideoUrl : videoSource)
      : (audioError || !sanitizeMediaUrl(audioSource) ? demoAudioUrl : audioSource);
    const fileType = mediaType === 'video' ? 'video.mp4' : 'audio.mp3';
    const fileName = `podcast-${projectId || 'demo'}-${fileType}`;
    
    console.log("Starting download with URL:", downloadUrl);
    console.log("File name:", fileName);
    
    toast.success("Download started", {
      description: `Your podcast ${mediaType} is being prepared for download.`
    });
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.info("Download initiated", {
      description: `If download doesn't start automatically, right-click on the media player and select 'Save as'.`
    });
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
                  src={videoError ? demoVideoUrl : videoSource}
                  controls
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
                    src={audioError ? demoAudioUrl : audioSource}
                    preload="metadata"
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </>
              )}
              
              {(!isPlaying || status === 'processing' || videoError || audioError || generationError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
                  <button 
                    className="w-16 h-16 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-110 animate-pulse-soft"
                    onClick={togglePlayback}
                    disabled={status === 'processing' || (!!videoError && !!audioError) || !!generationError}
                  >
                    {status === 'processing' ? (
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (videoError && audioError) || generationError ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
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
                        ? "Processing your podcast with ElevenLabs..." 
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
            
            <div className="mt-4 flex justify-end">
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
                      disabled={status === 'processing' || (!!videoError && !!audioError) || !!generationError}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="19 20 9 12 19 4 19 20"></polygon>
                        <line x1="5" y1="19" x2="5" y2="5"></line>
                      </svg>
                    </button>
                    <button 
                      className="p-2 hover:text-primary transition-colors"
                      onClick={togglePlayback}
                      disabled={status === 'processing' || (!!videoError && !!audioError) || !!generationError}
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
                      disabled={status === 'processing' || (!!videoError && !!audioError) || !!generationError}
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
                  <AnimatedButton variant="gradient" onClick={handleDownload}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download {mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}
                  </AnimatedButton>
                )}
              </div>
            </div>
          </GlassCard>
        </TabsContent>
        
        <TabsContent value="controls" className="pt-4">
          <CharacterControls onControlsChange={handleControlsChange} />
        </TabsContent>
      </Tabs>
      
      {mediaType === 'audio' && audioError && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Audio Format Issue</h3>
          <p className="mt-1 text-xs text-yellow-700">
            {audioError} 
          </p>
          <ul className="mt-2 text-xs text-yellow-700 list-disc pl-4 space-y-1">
            <li>Using demo audio for now</li>
            <li>Try generating the podcast again if needed</li>
            <li>Switch to video format if available</li>
          </ul>
        </div>
      )}
      
      {mediaType === 'video' && videoError && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">Video Format Issue</h3>
          <p className="mt-1 text-xs text-yellow-700">
            {videoError}
          </p>
          <ul className="mt-2 text-xs text-yellow-700 list-disc pl-4 space-y-1">
            <li>Using demo video for now</li>
            <li>Try generating the podcast again if needed</li>
            <li>Switch to audio format if available</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PodcastPreview;
