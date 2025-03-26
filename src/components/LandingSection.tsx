
import React from "react";
import { GlassCard } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";

const LandingSection = () => {
  return (
    <section className="pt-32 pb-20 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-20 left-[10%] w-64 h-64 bg-primary/10 rounded-full filter blur-3xl animate-float" />
      <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-accent/10 rounded-full filter blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      
      <div className="section-container relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-block mb-3 px-4 py-1.5 bg-primary/10 text-primary rounded-full font-medium text-sm animate-fade-in">
            Powered by Gemini 2.0 AI
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Create Stunning Video Podcasts <span className="text-gradient">with AI Hosts</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 mb-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Select AI hosts, customize their appearance, and generate lip-synced videos in multiple languages — all powered by advanced AI. Turn your ideas into professional podcasts in minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <AnimatedButton variant="gradient" className="px-8 py-6 text-lg w-full sm:w-auto">
              Create Your Podcast
            </AnimatedButton>
            <AnimatedButton variant="outline" className="px-8 py-6 text-lg w-full sm:w-auto">
              Watch Demo
            </AnimatedButton>
          </div>
        </div>
        
        {/* Preview image */}
        <div className="animate-scale-in" style={{ animationDelay: "0.8s" }}>
          <GlassCard className="p-3 overflow-hidden max-w-5xl mx-auto fancy-border-gradient">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-soft">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
                <p className="mt-4 text-muted-foreground text-sm">Preview of AI-generated podcast</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      
      {/* Stats section */}
      <div className="w-full mt-20">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="text-center animate-fade-in" style={{ animationDelay: "1s" }}>
              <div className="font-bold text-3xl md:text-4xl mb-2 text-primary">10+</div>
              <p className="text-muted-foreground">AI Host Templates</p>
            </GlassCard>
            
            <GlassCard className="text-center animate-fade-in" style={{ animationDelay: "1.2s" }}>
              <div className="font-bold text-3xl md:text-4xl mb-2 text-primary">15+</div>
              <p className="text-muted-foreground">Supported Languages</p>
            </GlassCard>
            
            <GlassCard className="text-center animate-fade-in" style={{ animationDelay: "1.4s" }}>
              <div className="font-bold text-3xl md:text-4xl mb-2 text-primary">100%</div>
              <p className="text-muted-foreground">Lip-Sync Accuracy</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingSection;
