import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHosts, fetchTemplates, fetchLanguages } from "@/services/api";
import { Host, Template, Language } from "@/types/index";

interface AppContextType {
  selectedHosts: string[];
  setSelectedHosts: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  selectedLanguage: Language | null;
  setSelectedLanguage: React.Dispatch<React.SetStateAction<Language | null>>;
  hosts: Host[];
  templates: Template[];
  languages: Language[];
  isLoading: boolean;
  error: Error | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  
  const { 
    data: hosts = [], 
    isLoading: hostsLoading,
    error: hostsError
  } = useQuery({
    queryKey: ['hosts'],
    queryFn: fetchHosts
  });
  
  const { 
    data: templates = [], 
    isLoading: templatesLoading,
    error: templatesError
  } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  });
  
  const { 
    data: languages = [], 
    isLoading: languagesLoading,
    error: languagesError
  } = useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages
  });
  
  const isLoading = hostsLoading || templatesLoading || languagesLoading;
  const error = hostsError || templatesError || languagesError;
  
  useEffect(() => {
    if (languages.length > 0 && !selectedLanguage) {
      const englishLanguage = languages.find(lang => lang.code === 'en');
      if (englishLanguage) {
        setSelectedLanguage(englishLanguage);
      }
    }
  }, [languages, selectedLanguage]);
  
  return (
    <AppContext.Provider value={{
      selectedHosts,
      setSelectedHosts,
      selectedTemplate,
      setSelectedTemplate,
      selectedLanguage,
      setSelectedLanguage,
      hosts,
      templates,
      languages,
      isLoading,
      error: error as Error | null
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
