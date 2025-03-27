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
  const [characterControls, setCharacterControls] = useState<CharacterControlState>({
    expressiveness: 70,
    gestureIntensity: 50,
    speakingPace: 60,
    autoGestures: true,
    eyeContact: true,
  });
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const demoVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-business-woman-talking-4796-large.mp4";
  const demoAudioUrl = "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3";
  
  const videoSource = status === 'completed' && previewUrl && typeof previewUrl === 'string' && previewUrl.startsWith('http')
    ? previewUrl 
    : demoVideoUrl;
    
  const audioSource = status === 'completed' && audioUrl && typeof audioUrl === 'string' && audioUrl.startsWith('http')
    ? audioUrl
    : demoAudioUrl;
  
  const validateMediaUrl = async (url: string, mediaType: 'video' | 'audio'): Promise<boolean> => {
    try {
      console.log(`Validating ${mediaType} URL: ${url}`);
      
      if (!url || !url.startsWith('http')) {
        console.error(`Invalid ${mediaType} URL format:`, url);
        if (mediaType === 'video') {
          setVideoError(`Invalid video URL format. Using demo content instead.`);
        } else {
          setAudioError(`Invalid audio URL format. Using demo content instead.`);
        }
        return false;
      }
      
      const urlWithCacheBuster = new URL(url);
      urlWithCacheBuster.searchParams.append('t', Date.now().toString());
      
      const response = await fetch(urlWithCacheBuster.toString(), { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        console.error(`${mediaType} URL returned error:`, response.status, response.statusText);
        if (mediaType === 'video') {
          setVideoError(`Video not available (${response.status}). Using demo content instead.`);
        } else {
          setAudioError(`Audio not available (${response.status}). Using demo content instead.`);
        }
        return false;
      }
      
      const contentType = response.headers.get('content-type');
      console.log(`${mediaType} content type:`, contentType);
      
      if (mediaType === 'video' && contentType && 
          !contentType.includes('video/') && 
          !contentType.includes('application/octet-stream')) {
        console.error('Invalid video content type:', contentType);
        setVideoError(`Invalid video format (${contentType}). Using demo content instead.`);
        return false;
      }
      
      if (mediaType === 'audio' && contentType && 
          !contentType.includes('audio/') && 
          !contentType.includes('application/octet-stream')) {
        console.error('Invalid audio content type:', contentType);
        setAudioError(`Invalid audio format (${contentType}). Using demo content instead.`);
        return false;
      }
      
      console.log(`${mediaType} URL validation successful`);
      return true;
    } catch (err) {
      console.error(`Error checking ${mediaType} URL:`, err);
      if (mediaType === 'video') {
        setVideoError(`Error accessing video source. Using demo content instead.`);
      } else {
        setAudioError(`Error accessing audio source. Using demo content instead.`);
      }
      return false;
    }
  };
  
  useEffect(() => {
    setVideoError(null);
    setAudioError(null);
    
    console.log("Media source updates - Video:", videoSource, "Audio:", audioSource);
    
    if (status === 'completed') {
      if (previewUrl) {
        if (!previewUrl.startsWith('http')) {
          console.error("Invalid video URL:", previewUrl);
          setVideoError("Invalid video URL format. Using demo content instead.");
        } else {
          validateMediaUrl(previewUrl, 'video')
            .then(valid => {
              if (!valid && audioUrl && audioUrl.startsWith('http')) {
                setMediaType('audio');
              }
            });
        }
      } else if (audioUrl) {
        setMediaType('audio');
      }
      
      if (audioUrl && audioUrl.startsWith('http')) {
        validateMediaUrl(audioUrl, 'audio');
      }
    }
  }, [status, previewUrl, audioUrl]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      if (mediaType === 'video' && videoRef.current) {
        console.log("Attempting to play video:", videoRef.current.src);
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
          setVideoError(`Error playing video: ${err.message}. Using demo content instead.`);
          
          if (videoSource !== demoVideoUrl) {
            if (videoRef.current) {
              console.log("Trying demo video instead:", demoVideoUrl);
              videoRef.current.src = demoVideoUrl;
              videoRef.current.load();
              videoRef.current.play().catch(demoErr => {
                console.error("Error playing demo video:", demoErr);
                
                if (videoSource !== demoVideoUrl) {
                  setMediaType('audio');
                }
              });
            }
          } else {
            setMediaType('audio');
          }
        });
      } else if (mediaType === 'audio' && audioRef.current) {
        console.log("Attempting to play audio:", audioRef.current.src);
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setAudioError(`Error playing audio: ${err.message}. Using demo content instead.`);
          
          if (audioSource !== demoAudioUrl) {
            if (audioRef.current) {
              console.log("Trying demo audio instead:", demoAudioUrl);
              audioRef.current.src = demoAudioUrl;
              audioRef.current.load();
              audioRef.current.play().catch(demoErr => {
                console.error("Error playing demo audio:", demoErr);
                setIsPlaying(false);
              });
            }
          } else {
            setIsPlaying(false);
          }
          
          toast({
            title: "Audio Playback Error",
            description: `Format error. Trying fallback audio.`,
            variant: "destructive"
          });
        });
      }
      
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
    
    return () => clearInterval(interval);
  }, [isPlaying, duration, mediaType, videoSource, audioSource, toast, demoVideoUrl, demoAudioUrl]);
  
  useEffect(() => {
    const handleLoadedMetadata = () => {
      const mediaElement = mediaType === 'video' ? videoRef.current : audioRef.current;
      if (mediaElement && !isNaN(mediaElement.duration)) {
        setDuration(mediaElement.duration);
      }
    };
    
    const handleError = (e: Event) => {
      const target = e.target as HTMLMediaElement;
      console.error(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} element error:`, target.error);
      
      if (mediaType === 'video') {
        const errorMessage = target.error?.message || 'unknown error';
        const errorCode = target.error?.code || 0;
        setVideoError(`Video playback error - ${errorMessage} (code: ${errorCode}). Using demo content instead.`);
        
        if (videoSource !== demoVideoUrl && videoRef.current) {
          videoRef.current.src = demoVideoUrl;
          videoRef.current.load();
          
          setTimeout(() => {
            if (videoRef.current && isPlaying) {
              videoRef.current.play().catch(demoErr => {
                console.error("Error playing demo video:", demoErr);
                setMediaType('audio');
              });
            }
          }, 500);
        } else {
          setMediaType('audio');
        }
      } else {
        const errorMessage = target.error?.message || 'unknown error';
        const errorCode = target.error?.code || 0;
        setAudioError(`Audio playback error - ${errorMessage} (code: ${errorCode}). Using demo content instead.`);
        
        if (audioSource !== demoAudioUrl && audioRef.current) {
          audioRef.current.src = demoAudioUrl;
          audioRef.current.load();
          
          setTimeout(() => {
            if (audioRef.current && isPlaying) {
              audioRef.current.play().catch(demoErr => {
                console.error("Error playing demo audio:", demoErr);
                setIsPlaying(false);
              });
            }
          }, 500);
        } else {
          setIsPlaying(false);
        }
        
        toast({
          title: "Audio Playback Error",
          description: `Format error. Trying fallback audio.`,
          variant: "destructive"
        });
      }
      
      setIsPlaying(false);
    };
    
    const videoElement = videoRef.current;
    const audioElement = audioRef.current;
    
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);
    }
    
    if (audioElement) {
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('error', handleError);
      
      audioElement.addEventListener('canplaythrough', () => {
        setAudioError(null);
        console.log("Audio can be played through without buffering");
      });
    }
    
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
      }
      
      if (audioElement) {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('error', handleError);
        audioElement.removeEventListener('canplaythrough', () => {});
      }
    };
  }, [mediaType, toast, audioSource, videoSource, demoAudioUrl, demoVideoUrl]);
  
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
      toast({
        title: "Podcast not ready",
        description: "Please generate the podcast first before downloading.",
        variant: "destructive"
      });
      return;
    }
    
    const downloadUrl = mediaType === 'video' 
      ? (videoError ? demoVideoUrl : videoSource)
      : (audioError ? demoAudioUrl : audioSource);
    const fileType = mediaType === 'video' ? 'video.mp4' : 'audio.mp3';
    
    toast({
      title: "Download started",
      description: `Your podcast ${mediaType} is being prepared for download.`
    });
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `podcast-${projectId || 'demo'}-${fileType}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download initiated",
      description: `If the download doesn't start automatically, right-click on the media player and select 'Save video/audio as'.`
    });
  };
  
  const toggleMediaType = () => {
    setMediaType(prev => prev === 'video' ? 'audio' : 'video');
    setIsPlaying(false);
  };
  
  console.log(`Current ${mediaType} source:`, mediaType === 'video' ? videoSource : audioSource);

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
                onClick={toggleMediaType}
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
