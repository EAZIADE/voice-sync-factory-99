
import React from "react";
import { GlassCard } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/context/AppContext";
import { Host } from "@/types";

const HostSelection = () => {
  const { hosts, selectedHosts, setSelectedHosts, isLoading } = useAppContext();

  const toggleHostSelection = (hostId: string) => {
    if (selectedHosts.includes(hostId)) {
      setSelectedHosts(selectedHosts.filter(id => id !== hostId));
    } else {
      setSelectedHosts([...selectedHosts, hostId]);
    }
  };

  return (
    <section className="py-20 relative" id="hosts">
      <div className="absolute top-40 right-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl" />
      
      <div className="section-container relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your <span className="text-gradient">AI Hosts</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Select from our professionally designed host avatars that perfectly match your podcast style and theme.
          </p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-80 bg-gray-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hosts.map((host: Host) => (
              <GlassCard 
                key={host.id} 
                className={cn(
                  "cursor-pointer overflow-hidden p-0 transition-all",
                  selectedHosts.includes(host.id) 
                    ? "ring-2 ring-primary scale-[1.02]" 
                    : "hover:scale-[1.03]",
                  host.is_premium && !selectedHosts.includes(host.id) && "opacity-75"
                )}
                onClick={() => toggleHostSelection(host.id)}
              >
                <div className="relative overflow-hidden h-60">
                  <img 
                    src={host.image_url} 
                    alt={host.name}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                  {selectedHosts.includes(host.id) && (
                    <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                  {host.is_premium && (
                    <div className="absolute top-3 left-3 bg-accent text-white text-xs px-2 py-1 rounded-full">
                      Premium
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{host.name}</h3>
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                      {host.style}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {host.languages.slice(0, 2).map((lang) => (
                      <span key={lang} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {lang}
                      </span>
                    ))}
                    {host.languages.length > 2 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        +{host.languages.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
        
        <div className="mt-10 text-center">
          <AnimatedButton
            variant="gradient"
            className="px-6 py-3"
            disabled={selectedHosts.length === 0}
          >
            {selectedHosts.length === 0 
              ? "Select at least one host" 
              : `Continue with ${selectedHosts.length} host${selectedHosts.length > 1 ? 's' : ''}`}
          </AnimatedButton>
        </div>
      </div>
    </section>
  );
};

export default HostSelection;
