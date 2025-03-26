
import React from "react";
import Header from "@/components/Header";
import LandingSection from "@/components/LandingSection";
import HostSelection from "@/components/HostSelection";
import LanguageSelector from "@/components/LanguageSelector";
import TemplateGallery from "@/components/TemplateGallery";
import ScriptEditor from "@/components/ScriptEditor";
import PreviewSection from "@/components/PreviewSection";
import ProjectWizard from "@/components/ProjectWizard";
import { GlassCard } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useAppContext } from "@/context/AppContext";

const Index = () => {
  const { isLoading } = useAppContext();
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <LandingSection />
        <HostSelection />
        <LanguageSelector />
        <TemplateGallery />
        <ProjectWizard />
        <ScriptEditor />
        <PreviewSection />
        
        {/* Pricing Section */}
        <section className="py-20 bg-secondary/30" id="pricing">
          <div className="section-container">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple <span className="text-gradient">Pricing</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Choose the plan that best fits your podcast creation needs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <GlassCard className="flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Free</h3>
                  <div className="text-3xl font-bold">$0</div>
                  <p className="text-sm text-muted-foreground mt-2">Perfect for beginners</p>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    3 Basic AI Hosts
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    5 Podcast Exports/month
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    720p Video Quality
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Watermarked Videos
                  </li>
                </ul>
                
                <AnimatedButton variant="outline" className="w-full">
                  Get Started
                </AnimatedButton>
              </GlassCard>
              
              <GlassCard className="flex flex-col relative transform scale-105 md:scale-110 z-10 border-primary/30">
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <div className="bg-accent text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Premium</h3>
                  <div className="text-3xl font-bold">$15<span className="text-sm font-normal">/month</span></div>
                  <p className="text-sm text-muted-foreground mt-2">For content creators</p>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    All AI Hosts
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Unlimited Exports
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    1080p Video Quality
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    No Watermarks
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Priority Rendering
                  </li>
                </ul>
                
                <AnimatedButton variant="gradient" className="w-full">
                  Subscribe Now
                </AnimatedButton>
              </GlassCard>
              
              <GlassCard className="flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                  <div className="text-3xl font-bold">Custom</div>
                  <p className="text-sm text-muted-foreground mt-2">For businesses</p>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Custom AI Hosts
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Branded Templates
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    4K Video Quality
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    API Access
                  </li>
                  <li className="flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Dedicated Support
                  </li>
                </ul>
                
                <AnimatedButton variant="outline" className="w-full">
                  Contact Us
                </AnimatedButton>
              </GlassCard>
            </div>
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          
          <div className="section-container relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Create Your AI-Powered Podcast?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are using VoiceSync to produce engaging video podcasts with AI-generated hosts.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <AnimatedButton variant="gradient" className="px-8 py-3 text-lg">
                  Get Started Free
                </AnimatedButton>
                <span className="text-muted-foreground">or</span>
                <AnimatedButton variant="outline" className="px-8 py-3 text-lg">
                  Schedule a Demo
                </AnimatedButton>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-secondary/50 py-12">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent" />
                <span className="font-bold text-xl">VoiceSync</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create professional AI podcasts with perfect lip-sync in multiple languages.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">AI Hosts</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Multi-language</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Templates</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Export Options</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Accessibility</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-muted-foreground mb-4 md:mb-0">
                © 2023 VoiceSync. All rights reserved.
              </p>
              <div className="flex items-center space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
