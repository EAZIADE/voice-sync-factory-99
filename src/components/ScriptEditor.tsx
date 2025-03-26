
import React, { useState } from "react";
import { GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";

const ScriptEditor = () => {
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = () => {
    if (!script.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };
  
  return (
    <section className="py-20 bg-secondary/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Write Your <span className="text-gradient">Script</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Enter your podcast script or let AI help you create compelling content.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <GlassPanel className="p-6">
            <textarea
              className="w-full h-64 p-4 rounded-lg bg-white/50 focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
              placeholder="Enter your podcast script here..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            ></textarea>
            
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {script.length} characters
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  ~{Math.round(script.split(' ').length / 150)} minutes
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <AnimatedButton variant="outline">
                  AI Assist
                </AnimatedButton>
                <AnimatedButton 
                  variant="gradient" 
                  disabled={!script.trim() || isGenerating}
                  onClick={handleGenerate}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : "Generate Podcast"}
                </AnimatedButton>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="font-medium mb-3">Script settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tone</label>
                  <select className="w-full p-2.5 rounded-lg bg-white/50 focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="conversational">Conversational</option>
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="authoritative">Authoritative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pacing</label>
                  <select className="w-full p-2.5 rounded-lg bg-white/50 focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="medium">Medium</option>
                    <option value="slow">Slow</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
        
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-accent" />
            <p className="px-4 text-muted-foreground text-sm">Tips for great podcasts</p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-accent to-primary" />
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h4 className="font-medium text-sm mb-2">Keep it Concise</h4>
              <p className="text-xs text-muted-foreground">
                Aim for a 15-30 minute podcast to maintain audience engagement.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h4 className="font-medium text-sm mb-2">Structure Content</h4>
              <p className="text-xs text-muted-foreground">
                Create a clear introduction, body, and conclusion for your podcast.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-3 bg-primary/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </div>
              <h4 className="font-medium text-sm mb-2">Be Conversational</h4>
              <p className="text-xs text-muted-foreground">
                Use a natural, friendly tone even when discussing complex topics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScriptEditor;
