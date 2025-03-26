
import React, { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Project } from "@/types";
import { GlassPanel } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import Header from "@/components/Header";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  // Set up a subscription to project updates
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

  // Polling function for project status
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
          setProject(prev => prev ? { ...prev, ...data } : null);
          
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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ projectId: id })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate podcast');
      }
      
      toast({
        title: "Processing Started",
        description: "Your podcast is being generated. This may take a few minutes.",
      });
      
      // Update the local project state
      setProject(prev => prev ? { 
        ...prev, 
        status: 'processing',
        updated_at: new Date().toISOString()
      } : null);
      
    } catch (error) {
      console.error("Error generating podcast:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate podcast. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Redirect if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 px-4 max-w-7xl mx-auto">
          <GlassPanel className="h-96 animate-pulse" />
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
          
          <GlassPanel className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
                <div className="text-muted-foreground">
                  {project.description || "No description provided."}
                </div>
              </div>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                {project.status}
              </div>
            </div>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-3">Project Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Created:</span> {new Date(project.created_at || '').toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Last Updated:</span> {new Date(project.updated_at || '').toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              
              {project.script && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Script</h3>
                  <div className="bg-secondary/20 p-4 rounded-md whitespace-pre-wrap">
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
                    <span className="text-amber-700">Your podcast is being generated. This process typically takes a few minutes.</span>
                  </div>
                </div>
              )}
              
              {project.status === 'completed' && (
                <div className="bg-green-500/10 p-4 rounded-md border border-green-500/20">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-3 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700">Your podcast has been generated and is ready to download.</span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4 pt-4">
                {project.status === 'completed' ? (
                  <AnimatedButton variant="gradient">
                    Download Podcast
                  </AnimatedButton>
                ) : project.status === 'processing' ? (
                  <AnimatedButton variant="gradient" disabled>
                    Processing...
                  </AnimatedButton>
                ) : (
                  <AnimatedButton 
                    variant="gradient"
                    onClick={handleGeneratePodcast}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Starting..." : "Generate Podcast"}
                  </AnimatedButton>
                )}
                <Link to="/dashboard">
                  <AnimatedButton variant="outline">
                    Back to Dashboard
                  </AnimatedButton>
                </Link>
              </div>
            </div>
          </GlassPanel>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
