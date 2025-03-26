
import React, { useState } from "react";
import { GlassCard } from "./ui/GlassMorphism";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/context/AppContext";
import { Template } from "@/types";

const TemplateGallery = () => {
  const { templates, selectedTemplate, setSelectedTemplate, isLoading } = useAppContext();
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Get unique categories from templates
  const categories = [
    { id: "all", name: "All Templates" },
    ...Array.from(new Set(templates.map(template => template.category)))
      .map(category => ({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1)
      }))
  ];
  
  const filteredTemplates = activeCategory === "all" 
    ? templates 
    : templates.filter(template => template.category === activeCategory);
  
  return (
    <section className="py-20 relative" id="templates">
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl" />
      
      <div className="section-container relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Select a <span className="text-gradient">Template</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose from our professionally designed templates that perfectly match your podcast style.
          </p>
        </div>
        
        {isLoading ? (
          <>
            <div className="flex items-center justify-center space-x-2 mb-10 overflow-x-auto pb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-32 bg-gray-100 animate-pulse rounded-full"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video bg-gray-100 animate-pulse rounded-xl"></div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center space-x-2 mb-10 overflow-x-auto pb-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={cn(
                    "px-4 py-2 rounded-full whitespace-nowrap transition-colors text-sm",
                    activeCategory === category.id
                      ? "bg-primary text-white"
                      : "bg-white/50 hover:bg-white/80"
                  )}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template: Template) => (
                <GlassCard 
                  key={template.id}
                  className={cn(
                    "cursor-pointer overflow-hidden p-0 transition-all",
                    selectedTemplate === template.id 
                      ? "ring-2 ring-primary scale-[1.02]" 
                      : "hover:scale-[1.03]",
                    template.is_premium && !selectedTemplate === template.id && "opacity-75"
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="relative overflow-hidden aspect-video">
                    <img 
                      src={template.image_url} 
                      alt={template.name}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    />
                    {template.is_premium && (
                      <div className="absolute top-3 right-3 bg-accent text-white text-xs px-2 py-1 rounded-full">
                        Premium
                      </div>
                    )}
                    {selectedTemplate === template.id && (
                      <div className="absolute top-3 left-3 bg-primary text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">
                      {template.category} Template
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TemplateGallery;
