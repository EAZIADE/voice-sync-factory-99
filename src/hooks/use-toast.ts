
import { Toast, useToast as useShadcnToast } from "@/components/ui/toast";

// Re-export the useToast hook directly from the shadcn/ui toast component
export const useToast = useShadcnToast;

// Also export the Toast type for convenience
export type { Toast };
