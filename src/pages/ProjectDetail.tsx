import React, { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Project } from "@/types/index";
import { GlassPanel } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase, getMediaUrl, checkMediaFileExists, ensurePodcastsBucketExists, deleteMediaFile } from "@/integrations/supabase/client";
import PodcastPreview from "@/components/PodcastPreview";
import ProjectGenerator from "@/components/ProjectGenerator";
import { toast } from "sonner";
import { asType, convertToAppModel, ensureValidStatus } from "@/utils/typeUtils";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Define the status type to match the Project interface
type ProjectStatus = 'draft' | 'processing' | 'completed' | 'deleted';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, session, loading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<{video?: string, audio?: string}>({});
  const [mediaFilesExist, setMediaFilesExist] = useState<{video: boolean, audio: boolean}>({
    video: false,
    audio: false
  });
  const { toast: hookToast } = useToast();

  // New function to safely update project status
  const updateProjectStatus = (status: ProjectStatus) => {
    setProject(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        status: status,
        updated_at: new Date().toISOString()
      };
    });
  };

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
          const projectData = convertToAppModel<Project>(data);
          setProject({
            ...projectData,
            status: ensureValidStatus(projectData.status)
          });
          
          if (projectData.status === 'completed') {
            await ensurePodcastsBucketExists();
            checkAndSetMediaUrls(id);
          }
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
        const updatedProject = convertToAppModel<Project>(payload.new);
        setProject(prev => prev ? { ...prev, ...updatedProject } : null);
        
        if (updatedProject.status === 'completed') {
          checkAndSetMediaUrls(id);
        }
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
        
        const projectData = convertToAppModel<{status: string, updated_at: string}>(data);
        
        if (projectData && projectData.status !== project.status) {
          const validStatus = ensureValidStatus(projectData.status);
          
          setProject(prev => prev ? { ...prev, status: validStatus, updated_at: projectData.updated_at } : null);
          
          if (projectData.status === 'completed') {
            hookToast({
              title: "Success!",
              description: "Your AI podcast has been generated using ElevenLabs technology.",
            });
            clearInterval(interval);
            
            await checkAndSetMediaUrls(id);
          }
        }
      } catch (error) {
        console.error("Error polling project status:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, user, project, hookToast]);

  const checkAndSetMediaUrls = async (projectId: string) => {
    try {
      console.log("Checking if media files exist for project:", projectId);
      
      const bucketExists = await ensurePodcastsBucketExists();
      if (!bucketExists) {
        console.error("Podcasts bucket does not exist or is not accessible");
        toast.error("Storage configuration issue", {
          description: "Media storage is not properly configured"
        });
        return;
      }
      
      const videoExists = await checkMediaFileExists(projectId, 'video');
      const audioExists = await checkMediaFileExists(projectId, 'audio');
      
      console.log("Media file check results:", { videoExists, audioExists });
      
      setMediaFilesExist({
        video: videoExists,
        audio: audioExists
      });
      
      const newMediaUrls: {video?: string, audio?: string} = {};
      
      if (videoExists) {
        newMediaUrls.video = getMediaUrl(projectId, 'video');
        console.log("Video URL set to:", newMediaUrls.video);
      }
      
      if (audioExists) {
        newMediaUrls.audio = getMediaUrl(projectId, 'audio');
        console.log("Audio URL set to:", newMediaUrls.audio);
      }
      
      console.log("Setting media URLs:", newMediaUrls);
      setMediaUrls(newMediaUrls);
      
      if (videoExists || audioExists) {
        toast.success("Media files are ready", {
          description: "Your podcast media is now available for playback"
        });
      } else if (project?.status === 'completed') {
        toast.error("Media generation issue", {
          description: "Your podcast status is complete, but media files weren't found. You may need to regenerate."
        });
      }
    } catch (err) {
      console.error("Error checking media files:", err);
      toast.error("Media access error", {
        description: "There was a problem accessing your podcast media"
      });
    }
  };

  const handleGenerateStart = () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    updateProjectStatus('processing');
  };

  const handleGenerateSuccess = () => {
    setIsGenerating(false);
  };

  const handleGenerateError = (errorMessage: string) => {
    setIsGenerating(false);
    setGenerationError(errorMessage);
    
    updateProjectStatus('draft');
  };

  const handleDeletePodcast = async () => {
    if (!project?.id || !user?.id) return;
    
    try {
      toast.info("Deleting podcast...");
      
      await deleteMediaFile(project.id, user.id);
      
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'draft'
        })
        .eq('id', project.id);
        
      if (error) throw error;
      
      updateProjectStatus('draft');
      
      setMediaUrls({});
      setMediaFilesExist({
        video: false,
        audio: false
      });
      
      toast.success("Podcast deleted successfully", {
        description: "Your podcast has been reset to draft status."
      });
    } catch (error) {
      console.error("Error deleting podcast:", error);
      toast.error("Delete failed", {
        description: "There was a problem deleting your podcast."
      });
    }
  };
  
  const handleUpdatePodcast = () => {
    if (!project?.id) return;
    
    updateProjectStatus('draft');
    
    toast.info("Podcast ready for update", {
      description: "You can now make changes and regenerate your podcast."
    });
  };
  
  const handleResetPodcast = async () => {
    if (!project?.id) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'draft'
        })
        .eq('id', project.id);
        
      if (error) throw error;
      
      updateProjectStatus('draft');
      
      toast.success("Podcast reset successfully", {
        description: "Your podcast has been reset to draft status, but media files are still available."
      });
    } catch (error) {
      console.error("Error resetting podcast:", error);
      toast.error("Reset failed", {
        description: "There was a problem resetting your podcast."
      });
    }
  };

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
                  onDeleteClick={() => {
                    document.getElementById('delete-podcast-trigger')?.click();
                  }}
                  onUpdateClick={handleUpdatePodcast}
                  onResetClick={handleResetPodcast}
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
                      <div>
                        <span className="text-muted-foreground">Media Files:</span> {mediaFilesExist.video && mediaFilesExist.audio ? 
                          <span className="text-green-500">Available</span> : 
                          project.status === 'completed' ? 
                            <span className="text-amber-500">Partially Available</span> : 
                            <span className="text-muted-foreground">Not Available</span>
                        }
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
                  
                  {project.status === 'completed' && (!mediaFilesExist.video || !mediaFilesExist.audio) && (
                    <div className="bg-yellow-500/10 p-4 rounded-md border border-yellow-500/20">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-yellow-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-yellow-700">Media Files Not Found</h4>
                          <p className="text-xs text-yellow-600 mt-1">
                            Some media files are missing. This could be due to an issue during generation. 
                            Try regenerating your podcast.
                          </p>
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
      
      <AlertDialog>
        <AlertDialogTrigger id="delete-podcast-trigger" className="hidden">Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Podcast</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete your podcast media files and reset the project to draft state. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePodcast} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetail;
