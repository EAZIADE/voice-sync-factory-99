
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchElevenLabsApiKeys } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ElevenLabsKeyManager from "@/components/ElevenLabsKeyManager";

const InitializeApiKey = () => {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (!user) {
        setIsInitializing(false);
        return;
      }

      try {
        const keys = await fetchElevenLabsApiKeys(user.id);
        const hasActiveKey = keys.some(key => key.is_active);
        
        setHasApiKey(hasActiveKey);
        setShowDialog(!hasActiveKey);
      } catch (error) {
        console.error("Error initializing API key:", error);
        setShowDialog(true);
      } finally {
        setIsInitializing(false);
      }
    };

    if (user) {
      checkApiKey();
    } else {
      setIsInitializing(false);
    }
  }, [user]);

  if (isInitializing || !user) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">ElevenLabs API Configuration</DialogTitle>
          <DialogDescription className="text-lg">
            Configure your ElevenLabs API key to enable AI voice generation for your podcasts
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <ElevenLabsKeyManager />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InitializeApiKey;
