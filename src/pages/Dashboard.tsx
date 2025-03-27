
import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GlassPanel, GlassCard } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Project } from "@/types";
import { fetchUserProjects } from "@/services/api";
import Header from "@/components/Header";
import { useToast } from "@/components/ui/use-toast";
import ElevenLabsKeyManager from "@/components/ElevenLabsKeyManager";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const data = await fetchUserProjects(user.id);
        setProjects(data);
      } catch (error) {
        console.error("Error loading projects:", error);
        toast({
          title: "Error",
          description: "Failed to load your projects. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadProjects();
    }
  }, [user, toast]);

  // Redirect if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const statusBadgeClass = (status: 'draft' | 'processing' | 'completed') => {
    switch (status) {
      case 'draft': 
        return "bg-secondary/50 text-foreground";
      case 'processing': 
        return "bg-amber-500/20 text-amber-600";
      case 'completed': 
        return "bg-green-500/20 text-green-600";
      default: 
        return "bg-secondary/50 text-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Your Projects</h1>
            <Link to="/">
              <AnimatedButton variant="gradient">
                Create New Project
              </AnimatedButton>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <GlassCard key={i} className="h-64 animate-pulse">
                  <div></div>
                </GlassCard>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <GlassPanel className="p-10 text-center">
              <h3 className="text-xl font-semibold mb-4">No Projects Yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't created any projects yet. Create your first AI podcast now!
              </p>
              <Link to="/">
                <AnimatedButton variant="gradient">
                  Create Your First Project
                </AnimatedButton>
              </Link>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <GlassCard key={project.id} className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">{project.title}</h3>
                      <span 
                        className={`px-2 py-1 rounded-full text-xs ${statusBadgeClass(project.status)}`}
                      >
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {project.description || "No description provided."}
                    </p>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                      <div>Created: {new Date(project.created_at || '').toLocaleDateString()}</div>
                      {project.updated_at && (
                        <div>Updated: {new Date(project.updated_at).toLocaleDateString()}</div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link to={`/project/${project.id}`}>
                        <AnimatedButton variant="outline">
                          View
                        </AnimatedButton>
                      </Link>
                      {project.status === 'completed' && (
                        <AnimatedButton variant="gradient">
                          Download
                        </AnimatedButton>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <div className="mt-12">
            <ElevenLabsKeyManager />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
