
import React from "react";
import { useAppContext } from "@/context/AppContext";
import { GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import { Language } from "@/types";

const LanguageSelector = () => {
  const { languages, selectedLanguage, setSelectedLanguage, isLoading } = useAppContext();
  
  // Filter languages by popularity for display organization
  const popularLanguages = languages.filter(lang => lang.popular);
  const otherLanguages = languages.filter(lang => !lang.popular);
  
  const handleSelectLanguage = (language: Language) => {
    setSelectedLanguage(language);
  };
  
  if (isLoading) {
    return (
      <section className="py-16 bg-primary/5">
        <div className="section-container text-center">
          <p>Loading languages...</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="py-16 bg-primary/5" id="languages">
      <div className="section-container">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Translate to Any <span className="text-gradient">Language</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Reach a global audience by translating your podcast into multiple languages with perfect lip-sync.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <GlassPanel className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Selected language</h3>
              {selectedLanguage && (
                <div className="flex items-center gap-2 bg-primary/10 text-primary w-fit rounded-full px-4 py-2">
                  <span className="text-xl">{selectedLanguage.flag}</span>
                  <span className="font-medium">{selectedLanguage.name}</span>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Available languages</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {popularLanguages.map(language => (
                    <AnimatedButton
                      key={language.id}
                      variant={selectedLanguage?.id === language.id ? "gradient" : "outline"}
                      className={`flex items-center gap-2 ${language.is_premium ? 'border-amber-400' : ''}`}
                      onClick={() => handleSelectLanguage(language)}
                    >
                      <span className="text-lg">{language.flag}</span>
                      <span>{language.name}</span>
                      {language.is_premium && (
                        <span className="text-xs bg-amber-400/20 text-amber-500 rounded-full px-2 py-0.5">Pro</span>
                      )}
                    </AnimatedButton>
                  ))}
                </div>
                
                {otherLanguages.length > 0 && (
                  <>
                    <details className="mt-4">
                      <summary className="text-sm text-muted-foreground cursor-pointer">Show all</summary>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {otherLanguages.map(language => (
                          <AnimatedButton
                            key={language.id}
                            variant={selectedLanguage?.id === language.id ? "gradient" : "outline"}
                            className={`flex items-center gap-2 ${language.is_premium ? 'border-amber-400' : ''}`}
                            onClick={() => handleSelectLanguage(language)}
                          >
                            <span className="text-lg">{language.flag}</span>
                            <span>{language.name}</span>
                            {language.is_premium && (
                              <span className="text-xs bg-amber-400/20 text-amber-500 rounded-full px-2 py-0.5">Pro</span>
                            )}
                          </AnimatedButton>
                        ))}
                      </div>
                    </details>
                  </>
                )}
              </div>
            </div>
          </GlassPanel>
          
          {/* How AI Translation Works Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center text-primary font-bold">1</div>
              <h3 className="text-lg font-semibold">Analyze Voice</h3>
              <p className="text-muted-foreground">Our AI analyzes your voice or script to understand context and meaning.</p>
            </div>
            
            <div className="space-y-3">
              <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center text-primary font-bold">2</div>
              <h3 className="text-lg font-semibold">Translate Content</h3>
              <p className="text-muted-foreground">Gemini 2.0 translates your content while maintaining tone and context.</p>
            </div>
            
            <div className="space-y-3">
              <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center text-primary font-bold">3</div>
              <h3 className="text-lg font-semibold">Sync Lip Movements</h3>
              <p className="text-muted-foreground">Our AI syncs the host's lip movements to match the translated audio perfectly.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LanguageSelector;
