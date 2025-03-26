
import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = ({
  children,
  className,
  hoverEffect = true,
  ...props
}: GlassCardProps) => {
  return (
    <div
      className={cn(
        "glass-card p-6",
        hoverEffect ? "hover:translate-y-[-5px]" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const GlassPanel = ({
  children,
  className,
  ...props
}: GlassCardProps) => {
  return (
    <div
      className={cn(
        "bg-white/30 backdrop-blur-md border border-white/10 rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
