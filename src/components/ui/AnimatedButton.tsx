
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "outline" | "ghost";
}

export const AnimatedButton = ({
  children,
  className,
  variant = "default",
  ...props
}: AnimatedButtonProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "gradient":
        return "bg-gradient-to-r from-primary to-accent hover:shadow-lg text-white transition-all duration-300 hover:scale-[1.03]";
      case "outline":
        return "bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300";
      case "ghost":
        return "bg-transparent hover:bg-secondary text-foreground transition-colors";
      default:
        return "bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.03] hover:shadow-md";
    }
  };

  return (
    <Button
      className={cn(
        "rounded-xl font-medium",
        getVariantClasses(),
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};
