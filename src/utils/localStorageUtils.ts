
import { ElevenLabsApiKey } from "@/types";
import { v4 as uuidv4 } from "uuid";

const ELEVENLABS_KEYS_STORAGE_KEY = "elevenlabs_api_keys";

export const getLocalElevenLabsKeys = (userId: string): ElevenLabsApiKey[] => {
  try {
    const keysString = localStorage.getItem(ELEVENLABS_KEYS_STORAGE_KEY);
    if (!keysString) return [];
    
    const allKeys = JSON.parse(keysString) as Record<string, ElevenLabsApiKey[]>;
    return allKeys[userId] || [];
  } catch (error) {
    console.error("Error getting local ElevenLabs keys:", error);
    return [];
  }
};

export const saveLocalElevenLabsKey = (userId: string, key: Omit<ElevenLabsApiKey, "id" | "is_local">): ElevenLabsApiKey => {
  try {
    const keys = getLocalElevenLabsKeys(userId);
    
    const newKey: ElevenLabsApiKey = {
      ...key,
      id: uuidv4(),
      is_local: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const allKeysString = localStorage.getItem(ELEVENLABS_KEYS_STORAGE_KEY);
    const allKeys = allKeysString ? JSON.parse(allKeysString) : {};
    
    allKeys[userId] = [...keys, newKey];
    localStorage.setItem(ELEVENLABS_KEYS_STORAGE_KEY, JSON.stringify(allKeys));
    
    return newKey;
  } catch (error) {
    console.error("Error saving local ElevenLabs key:", error);
    throw new Error("Failed to save API key locally.");
  }
};

export const updateLocalElevenLabsKey = (userId: string, keyId: string, updates: Partial<ElevenLabsApiKey>): ElevenLabsApiKey => {
  try {
    const keys = getLocalElevenLabsKeys(userId);
    const keyIndex = keys.findIndex(k => k.id === keyId);
    
    if (keyIndex === -1) {
      throw new Error("API key not found.");
    }
    
    const updatedKey = {
      ...keys[keyIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    keys[keyIndex] = updatedKey;
    
    const allKeysString = localStorage.getItem(ELEVENLABS_KEYS_STORAGE_KEY);
    const allKeys = allKeysString ? JSON.parse(allKeysString) : {};
    
    allKeys[userId] = keys;
    localStorage.setItem(ELEVENLABS_KEYS_STORAGE_KEY, JSON.stringify(allKeys));
    
    return updatedKey;
  } catch (error) {
    console.error("Error updating local ElevenLabs key:", error);
    throw new Error("Failed to update API key locally.");
  }
};

export const deleteLocalElevenLabsKey = (userId: string, keyId: string): void => {
  try {
    const keys = getLocalElevenLabsKeys(userId);
    const filteredKeys = keys.filter(k => k.id !== keyId);
    
    const allKeysString = localStorage.getItem(ELEVENLABS_KEYS_STORAGE_KEY);
    const allKeys = allKeysString ? JSON.parse(allKeysString) : {};
    
    allKeys[userId] = filteredKeys;
    localStorage.setItem(ELEVENLABS_KEYS_STORAGE_KEY, JSON.stringify(allKeys));
  } catch (error) {
    console.error("Error deleting local ElevenLabs key:", error);
    throw new Error("Failed to delete API key locally.");
  }
};
