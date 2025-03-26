
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Host, Template, Language, Project } from '@/types';
import { fetchHosts, fetchTemplates, fetchLanguages } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

interface AppContextType {
  hosts: Host[];
  templates: Template[];
  languages: Language[];
  selectedHosts: string[];
  selectedTemplate: string | null;
  selectedLanguage: string;
  isLoading: boolean;
  setSelectedHosts: (hostIds: string[]) => void;
  setSelectedTemplate: (templateId: string | null) => void;
  setSelectedLanguage: (languageCode: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const [hostsData, templatesData, languagesData] = await Promise.all([
          fetchHosts(),
          fetchTemplates(),
          fetchLanguages()
        ]);
        
        setHosts(hostsData);
        setTemplates(templatesData);
        setLanguages(languagesData);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast({
          title: 'Error loading data',
          description: 'Could not load application data. Please refresh the page.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const value = {
    hosts,
    templates,
    languages,
    selectedHosts,
    selectedTemplate,
    selectedLanguage,
    isLoading,
    setSelectedHosts,
    setSelectedTemplate,
    setSelectedLanguage
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
