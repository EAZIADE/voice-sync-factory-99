
import React, { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Project } from "@/types";
import { GlassPanel } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import Header from "@/components/Header";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PodcastPreview from "@/components/PodcastPreview";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, session, loading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadProject = async () => {
      if (!user || !id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProject({
            ...data,
            status: data.status === 'draft' || data.status === 'processing' || data.status === 'completed' 
              ? data.status 
              : 'draft'
          });
        }
      } catch (error) {
        console.error("Error loading project:", error);
        toast({
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
  }, [user, id, toast]);

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
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data && data.status !== project.status) {
          const validStatus: 'draft' | 'processing' | 'completed' = 
            data.status === 'draft' || data.status === 'processing' || data.status === 'completed' 
              ? data.status 
              : 'draft';
              
          setProject(prev => prev ? { ...prev, status: validStatus, updated_at: data.updated_at } : null);
          
          if (data.status === 'completed') {
            toast({
              title: "Success!",
              description: "Your podcast has been generated and is ready to download.",
            });
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error("Error polling project status:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [id, user, project, toast]);

  const handleGeneratePodcast = async () => {
    if (!project || !id || !user || !session) return;
    
    setIsGenerating(true);
    
    try {
      // Fix: Use the correct URL format with the Supabase project URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      
      const response = await fetch(`${supabaseUrl}/functions/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          projectId: id,
          characterControls: {
            expressiveness: 70,
            gestureIntensity: 50,
            speakingPace: 60,
            autoGestures: true,
            eyeContact: true
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(errorText || 'Failed to generate podcast');
      }
      
      const data = await response.json();
      console.log("Generation response:", data);
      
      toast({
        title: "Processing Started",
        description: "Your podcast is being generated. This may take a few minutes.",
      });
      
      setProject(prev => {
        if (!prev) return null;
        return { 
          ...prev, 
          status: 'processing' as const,
          updated_at: new Date().toISOString()
        };
      });
      
    } catch (error) {
      console.error("Error generating podcast:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate podcast. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
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
              <PodcastPreview 
                projectId={project.id}
                status={project.status}
                onGenerateClick={handleGeneratePodcast}
                previewUrl={project.status === 'completed' ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/podcasts/${project.id}/video.mp4` : undefined}
              />
            </div>
            
            <div className="lg:col-span-1">
              <GlassPanel className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-xl font-bold mb-1">{project.title}</h1>
                    <div className="text-muted-foreground text-sm">
                      {project.description || "No description provided."}
                    </div>
                  </div>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                    {project.status}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Project Details</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span> {new Date(project.created_at || '').toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span> {new Date(project.updated_at || '').toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {project.script && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Script</h3>
                      <div className="bg-secondary/20 p-3 rounded-md text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {project.script}
                      </div>
                    </div>
                  )}
                  
                  {project.status === 'processing' && (
                    <div className="bg-amber-500/10 p-4 rounded-md border border-amber-500/20">
                      <div className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-3 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-amber-700 text-sm">Your podcast is being generated. This process typically takes a few minutes.</span>
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
