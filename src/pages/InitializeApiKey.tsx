
import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addElevenLabsApiKey } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { ElevenLabsApiKey } from '@/types';

// This is a hidden component that will be rendered once to initialize the first API key
const InitializeApiKey = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialized, setInitialized] = React.useState(false);
  
  useEffect(() => {
    const initKey = async () => {
      if (!user || initialized) return;
      
      try {
        // The initial key provided by the user
        const initialKey = 'sk_2bbde2005ddd09a882f40589fe21daa1a58b4dc38b44e131';
        
        await addElevenLabsApiKey({
          key: initialKey,
          name: "Initial ElevenLabs Key",
          is_active: true,
          user_id: user.id
        });
        
        toast({
          title: "API Key Initialized",
          description: "Your ElevenLabs API key has been saved successfully."
        });
        
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing API key:", error);
        // Don't show an error toast as this is happening in the background
      }
    };
    
    if (user) {
      initKey();
    }
  }, [user, toast, initialized]);
  
  // This component doesn't render anything
  return null;
};

export default InitializeApiKey;
