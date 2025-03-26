
import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/use-toast";

interface ProjectFormData {
  title: string;
  description: string;
  script: string;
}

const ProjectWizard = () => {
  const { selectedHosts, selectedTemplate, selectedLanguage } = useAppContext();
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    description: "",
    script: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHosts.length || !selectedTemplate || !selectedLanguage) {
      toast({
        title: "Incomplete configuration",
        description: "Please select at least one host, a template, and a language before creating your project.",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, this would call our createProject API
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Success!",
        description: "Your project has been created. You need to be logged in to save it.",
      });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <section className="py-16 bg-primary/5">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Create Your <span className="text-gradient">Project</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Configure your podcast project details and start creating content.
          </p>
        </div>
        
        <GlassPanel className="p-6 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="My Awesome Podcast"
                required
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What is your podcast about?"
                rows={3}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="script">Script (Optional)</Label>
              <Textarea
                id="script"
                name="script"
                value={formData.script}
                onChange={handleChange}
                placeholder="Enter your podcast script or talking points..."
                rows={6}
              />
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                  {selectedHosts.length} Host{selectedHosts.length !== 1 ? 's' : ''} Selected
                </div>
                
                {selectedTemplate && (
                  <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                    Template Selected
                  </div>
                )}
                
                {selectedLanguage && (
                  <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                    Language: {selectedLanguage.toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <AnimatedButton 
                  variant="gradient" 
                  className="px-8 py-3"
                  type="submit"
                  disabled={isSubmitting || !formData.title || selectedHosts.length === 0 || !selectedTemplate}
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </AnimatedButton>
              </div>
            </div>
          </form>
        </GlassPanel>
      </div>
    </section>
  );
};

export default ProjectWizard;
