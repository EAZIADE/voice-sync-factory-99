import React, { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GlassPanel, GlassCard } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Project } from "@/types/index";
import { fetchProjects, deleteProject } from "@/services/api";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import ElevenLabsKeyManager from "@/components/ElevenLabsKeyManager";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const { toast: hookToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const data = await fetchProjects(user.id);
        setProjects(data);
      } catch (error) {
        console.error("Error loading projects:", error);
        hookToast({
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
  }, [user, hookToast]);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const statusBadgeClass = (status: 'draft' | 'processing' | 'completed' | 'deleted') => {
    switch (status) {
      case 'draft': 
        return "bg-secondary/50 text-foreground";
      case 'processing': 
        return "bg-amber-500/20 text-amber-600";
      case 'completed': 
        return "bg-green-500/20 text-green-600";
      case 'deleted':
        return "bg-red-500/20 text-red-600";
      default: 
        return "bg-secondary/50 text-foreground";
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!projectToDelete || !projectToDelete.id) return;
    
    try {
      await deleteProject(projectToDelete.id);
      
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      
      toast.success("Project deleted", {
        description: "Your project has been permanently deleted."
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      
      toast.error("Delete failed", {
        description: "Could not delete the project. Please try again."
      });
    } finally {
      setProjectToDelete(null);
    }
  };
  
  const handleEditProject = (project: Project) => {
    navigate(`/project/${project.id}`);
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
                      <div className="flex items-center space-x-2">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs ${statusBadgeClass(project.status)}`}
                        >
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-secondary/20 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center gap-2"
                              onClick={() => navigate(`/project/${project.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center gap-2"
                              onClick={() => handleEditProject(project)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="cursor-pointer text-destructive flex items-center gap-2"
                              onClick={() => setProjectToDelete(project)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
      
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.title}"? This action cannot be undone
              and will permanently remove the project and all associated media files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
