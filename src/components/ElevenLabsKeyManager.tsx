
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  ElevenLabsApiKey, 
  fetchElevenLabsApiKeys, 
  addElevenLabsApiKey,
  updateElevenLabsApiKey,
  deleteElevenLabsApiKey,
  validateElevenLabsApiKey
} from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { GlassPanel } from "@/components/ui/GlassMorphism";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, AlertCircle, Edit, Save, X } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  key: z.string().min(20, "API key must be at least 20 characters"),
  name: z.string().min(1, "Name is required"),
});

const ElevenLabsKeyManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ElevenLabsApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      name: "My ElevenLabs Key",
    },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      name: "",
    },
  });

  useEffect(() => {
    if (user) {
      loadKeys();
    }
  }, [user]);

  const loadKeys = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await fetchElevenLabsApiKeys(user.id);
      setKeys(data);
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast({
        title: "Error",
        description: "Failed to load your API keys. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    try {
      setValidating(true);
      toast({
        title: "Validating API key",
        description: "Please wait while we validate your API key...",
      });
      
      // Validate the key before adding it
      await validateElevenLabsApiKey(values.key);
      
      // Add the key to the database
      await addElevenLabsApiKey({
        key: values.key,
        name: values.name,
        is_active: true,
        user_id: user.id
      });
      
      toast({
        title: "Success",
        description: "API key added successfully!",
      });
      
      // Reset the form
      form.reset({
        key: "",
        name: "My ElevenLabs Key"
      });
      
      // Reload the keys
      await loadKeys();
    } catch (error) {
      console.error("Error adding API key:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add API key. Please check and try again.",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const handleToggleActivation = async (key: ElevenLabsApiKey) => {
    if (!user) return;
    
    try {
      await updateElevenLabsApiKey(key.id!, {
        is_active: !key.is_active
      });
      
      toast({
        title: "Success",
        description: `API key ${key.is_active ? "deactivated" : "activated"} successfully!`,
      });
      
      await loadKeys();
    } catch (error) {
      console.error("Error toggling API key activation:", error);
      toast({
        title: "Error",
        description: "Failed to update API key status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    try {
      await deleteElevenLabsApiKey(id);
      
      toast({
        title: "Success",
        description: "API key deleted successfully!",
      });
      
      await loadKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEditing = (key: ElevenLabsApiKey) => {
    editForm.reset({
      key: key.key,
      name: key.name
    });
    setEditingKeyId(key.id!);
  };

  const cancelEditing = () => {
    setEditingKeyId(null);
    editForm.reset();
  };

  const saveEditing = async (values: z.infer<typeof formSchema>) => {
    if (!user || !editingKeyId) return;
    
    try {
      // Validate the key if it was changed
      const currentKey = keys.find(k => k.id === editingKeyId);
      if (currentKey && currentKey.key !== values.key) {
        setValidating(true);
        toast({
          title: "Validating API key",
          description: "Please wait while we validate your API key...",
        });
        
        await validateElevenLabsApiKey(values.key);
      }
      
      await updateElevenLabsApiKey(editingKeyId, {
        key: values.key,
        name: values.name
      });
      
      toast({
        title: "Success",
        description: "API key updated successfully!",
      });
      
      setEditingKeyId(null);
      await loadKeys();
    } catch (error) {
      console.error("Error updating API key:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update API key. Please check and try again.",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const formatQuota = (quota?: number) => {
    if (quota === undefined) return "Unknown";
    if (quota <= 0) return "Depleted";
    
    return quota.toLocaleString();
  };

  return (
    <GlassPanel className="p-6">
      <h2 className="text-2xl font-bold mb-6">Manage ElevenLabs API Keys</h2>
      
      <div className="mb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="sk_..." 
                      {...field} 
                      type="password"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My ElevenLabs Key" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <AnimatedButton 
              type="submit" 
              variant="gradient" 
              disabled={validating}
              className="w-full"
            >
              {validating ? "Validating..." : "Add API Key"}
            </AnimatedButton>
          </form>
        </Form>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">Your API Keys</h3>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No API keys added yet. Add your first key above.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div 
                key={key.id} 
                className={`border rounded-lg p-4 ${key.is_active ? 'border-green-500/40 bg-green-500/5' : 'border-gray-200'}`}
              >
                {editingKeyId === key.id ? (
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(saveEditing)} className="space-y-3">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="password" 
                                className="font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-2 justify-end">
                        <AnimatedButton 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </AnimatedButton>
                        
                        <AnimatedButton 
                          type="submit" 
                          variant="gradient" 
                          size="sm"
                          disabled={validating}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {validating ? "Validating..." : "Save"}
                        </AnimatedButton>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{key.name}</h4>
                          <Badge variant={key.is_active ? "success" : "secondary"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">
                          {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <AnimatedButton 
                          onClick={() => startEditing(key)} 
                          variant="outline" 
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </AnimatedButton>
                        
                        <AnimatedButton 
                          onClick={() => handleToggleActivation(key)} 
                          variant={key.is_active ? "destructive" : "outline"} 
                          size="sm"
                        >
                          {key.is_active ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </AnimatedButton>
                        
                        <AnimatedButton 
                          onClick={() => handleDelete(key.id!)} 
                          variant="destructive" 
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AnimatedButton>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Characters left:</span>{" "}
                        <span className={`font-medium ${(key.quota_remaining || 0) <= 0 ? 'text-destructive' : ''}`}>
                          {formatQuota(key.quota_remaining)}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Last used:</span>{" "}
                        <span className="font-medium">
                          {key.last_used ? new Date(key.last_used).toLocaleDateString() : "Never"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

export default ElevenLabsKeyManager;
