
import React, { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Project } from "@/types";
import { GlassPanel } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase, getMediaUrl } from "@/integrations/supabase/client";
import PodcastPreview from "@/components/PodcastPreview";
import ProjectGenerator from "@/components/ProjectGenerator";
import { toast } from "sonner";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, session, loading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<{video?: string, audio?: string}>({});
  const { toast: hookToast } = useToast();

  useEffect(() => {
    const loadProject = async () => {
      if (!user || !id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id as any)
          .eq('user_id', user.id as any)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProject({
            ...(data as any),
            status: (data as any).status === 'draft' || (data as any).status === 'processing' || (data as any).status === 'completed' 
              ? (data as any).status 
              : 'draft'
          });
        }
      } catch (error) {
        console.error("Error loading project:", error);
        hookToast({
          title: "Error",
          description: "Failed to load the project. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadProject();
    }
  }, [user, id, hookToast]);

  useEffect(() => {
    if (!id || !user) return;

    const subscription = supabase
      .channel(`project-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'projects',
        filter: `id=eq.${id}` 
      }, (payload) => {
        console.log('Project update received:', payload);
        setProject(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id, user]);

  useEffect(() => {
    if (!id || !user || !project || project.status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('status, updated_at')
          .eq('id', id as any)
          .single();
          
        if (error) throw error;
        
        if (data && (data as any).status !== project.status) {
          const validStatus: 'draft' | 'processing' | 'completed' = 
            (data as any).status === 'draft' || (data as any).status === 'processing' || (data as any).status === 'completed' 
              ? (data as any).status 
              : 'draft';
              
          setProject(prev => prev ? { ...prev, status: validStatus, updated_at: (data as any).updated_at } : null);
          
          if ((data as any).status === 'completed') {
            hookToast({
              title: "Success!",
              description: "Your AI podcast has been generated using Google's NotebookLM, Studio, and Gemini technology.",
            });
            clearInterval(interval);
            
            // When status changes to completed, update media URLs with cache busting
            if (id) {
              setMediaUrls({
                video: getMediaUrl(id, 'video'),
                audio: getMediaUrl(id, 'audio')
              });
            }
          }
        }
      } catch (error) {
        console.error("Error polling project status:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [id, user, project, hookToast]);

  const handleGenerateStart = () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    setProject(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        status: 'processing' as const,
        updated_at: new Date().toISOString()
      };
    });
  };

  const handleGenerateSuccess = () => {
    setIsGenerating(false);
  };

  const handleGenerateError = (errorMessage: string) => {
    setIsGenerating(false);
    setGenerationError(errorMessage);
    
    setProject(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        status: 'draft' as const,
        updated_at: new Date().toISOString()
      };
    });
  };

  // Update media URLs when project status changes to completed
  useEffect(() => {
    if (!project || project.status !== 'completed' || !id) return;
    
    // Generate URLs with cache busting
    const videoUrl = getMediaUrl(id, 'video');
    const audioUrl = getMediaUrl(id, 'audio');
    
    console.log("Project completed, setting media URLs:");
    console.log("Video URL:", videoUrl);
    console.log("Audio URL:", audioUrl);
    
    setMediaUrls({
      video: videoUrl,
      audio: audioUrl
    });
    
    // Log to help debugging
    toast.success("Media URLs updated", {
      description: "Podcast media files are ready for playback"
    });
    
  }, [project?.status, id]);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 px-4 max-w-7xl mx-auto">
          <GlassPanel className="h-96 animate-pulse">
            <div></div>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 px-4 max-w-7xl mx-auto">
          <GlassPanel className="p-10 text-center">
            <h3 className="text-xl font-semibold mb-4">Project Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link to="/dashboard">
              <AnimatedButton variant="gradient">
                Back to Dashboard
              </AnimatedButton>
            </Link>
          </GlassPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Link to="/dashboard" className="text-muted-foreground hover:text-primary mr-2">
              Dashboard
            </Link>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="font-medium">Project</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <PodcastPreview 
                  projectId={project?.id}
                  status={project?.status}
                  previewUrl={mediaUrls.video}
                  audioUrl={mediaUrls.audio}
                  generationError={generationError}
                />
                
                {project.status !== 'processing' && (
                  <ProjectGenerator 
                    project={project}
                    onGenerateStart={handleGenerateStart}
                    onGenerateSuccess={handleGenerateSuccess}
                    onGenerateError={handleGenerateError}
                  />
                )}
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <GlassPanel className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-xl font-bold mb-1">{project?.title}</h1>
                    <div className="text-muted-foreground text-sm">
                      {project?.description || "No description provided."}
                    </div>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                    {project?.status || "draft"}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Project Details</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span> {project?.created_at ? new Date(project.created_at).toLocaleString() : '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span> {project?.updated_at ? new Date(project.updated_at).toLocaleString() : '-'}
                      </div>
                    </div>
                  </div>
                  
                  {project?.script && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Script</h3>
                      <div className="bg-secondary/20 p-3 rounded-md text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {project.script}
                      </div>
                    </div>
                  )}
                  
                  {project?.status === 'processing' && (
                    <div className="bg-amber-500/10 p-4 rounded-md border border-amber-500/20">
                      <div className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-3 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-amber-700 text-sm">Your podcast is being generated with ElevenLabs AI. This process typically takes a few minutes.</span>
                      </div>
                    </div>
                  )}
                  
                  {generationError && (
                    <div className="bg-red-500/10 p-4 rounded-md border border-red-500/20">
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-red-700">Generation Error</h4>
                            <p className="text-xs text-red-600 mt-1">{generationError}</p>
                          </div>
                        </div>
                      </div>
                  )}
                  
                  <div className="pt-2">
                    <Link to="/dashboard">
                      <AnimatedButton variant="outline" className="w-full">
                        Back to Dashboard
                      </AnimatedButton>
                    </Link>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
