
import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./ui/GlassMorphism";
import { AnimatedButton } from "./ui/AnimatedButton";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

const Header = ({ className, ...props }: HeaderProps) => {
  const { user, signOut } = useAuth();
  
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 px-6",
        className
      )}
      {...props}
    >
      <GlassPanel className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent animate-pulse-soft" />
            <span className="font-bold text-xl">VoiceSync</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <nav className="flex items-center space-x-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
            <a href="#hosts" className="text-sm font-medium hover:text-primary transition-colors">Hosts</a>
            <a href="#templates" className="text-sm font-medium hover:text-primary transition-colors">Templates</a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
            {user && (
              <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Dashboard
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <AnimatedButton variant="outline" className="text-sm px-4 py-2" onClick={() => signOut()}>
                  Sign Out
                </AnimatedButton>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <AnimatedButton variant="outline" className="text-sm px-4 py-2">
                    Sign In
                  </AnimatedButton>
                </Link>
                <Link to="/auth">
                  <AnimatedButton variant="gradient" className="text-sm px-4 py-2">
                    Try Free
                  </AnimatedButton>
                </Link>
              </>
            )}
          </div>
        </div>
        
        <button className="md:hidden text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </GlassPanel>
    </header>
  );
};

export default Header;
