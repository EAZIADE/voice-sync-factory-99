
import React from "react";
import { GlassCard, GlassPanel } from "./ui/GlassMorphism";
import { useAppContext } from "@/context/AppContext";
import { Language } from "@/types";

const LanguageSelector = () => {
  const { languages, selectedLanguage, setSelectedLanguage, isLoading } = useAppContext();
  const [showAll, setShowAll] = React.useState(false);
  
  const popularLanguages = languages.filter(lang => lang.popular);
  const displayLanguages = showAll ? languages : popularLanguages;
  const selectedLangObj = languages.find(l => l.code === selectedLanguage);
  
  return (
    <section className="py-16 bg-secondary/30">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Translate to <span className="text-gradient">Any Language</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Reach a global audience by translating your podcast into multiple languages with perfect lip-sync.
          </p>
        </div>
        
        {isLoading ? (
          <GlassPanel className="p-6 max-w-4xl mx-auto">
            <div className="h-16 bg-gray-100 animate-pulse rounded-lg mb-6"></div>
            <div className="space-y-3">
              <div className="h-6 bg-gray-100 animate-pulse rounded-lg w-1/3"></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
                ))}
              </div>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Selected language</label>
              {selectedLangObj && (
                <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                  <span className="text-xl">{selectedLangObj.flag}</span>
                  <span className="font-medium">{selectedLangObj.name}</span>
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Available languages</label>
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs text-primary hover:underline"
                >
                  {showAll ? "Show popular" : "Show all"}
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayLanguages.map((language: Language) => (
                  <button
                    key={language.id}
                    className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                      selectedLanguage === language.code
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-white/50"
                    } ${language.is_premium ? "opacity-75" : ""}`}
                    onClick={() => setSelectedLanguage(language.code)}
                  >
                    <span className="text-xl">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
                    {language.is_premium && (
                      <span className="ml-auto text-xs bg-accent text-white px-1.5 py-0.5 rounded-full">
                        Pro
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {selectedLanguage !== "en" && (
              <div className="mt-6 p-4 bg-accent/10 text-accent rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <p className="text-sm">
                    Our AI will translate and sync the speech with perfect lip movement in {selectedLangObj?.name}.
                  </p>
                </div>
              </div>
            )}
          </GlassPanel>
        )}
        
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6 text-center">
            How AI Translation Works
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h4 className="font-semibold mb-2">1. Analyze Voice</h4>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your voice or script to understand context and meaning.
              </p>
            </GlassCard>
            
            <GlassCard className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <h4 className="font-semibold mb-2">2. Translate Content</h4>
              <p className="text-sm text-muted-foreground">
                Gemini 2.0 translates your content while maintaining tone and context.
              </p>
            </GlassCard>
            
            <GlassCard className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                  <line x1="7" y1="2" x2="7" y2="22"></line>
                  <line x1="17" y1="2" x2="17" y2="22"></line>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <line x1="2" y1="7" x2="7" y2="7"></line>
                  <line x1="2" y1="17" x2="7" y2="17"></line>
                  <line x1="17" y1="17" x2="22" y2="17"></line>
                  <line x1="17" y1="7" x2="22" y2="7"></line>
                </svg>
              </div>
              <h4 className="font-semibold mb-2">3. Sync Lip Movements</h4>
              <p className="text-sm text-muted-foreground">
                Our AI syncs the host's lip movements to match the translated audio perfectly.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LanguageSelector;
