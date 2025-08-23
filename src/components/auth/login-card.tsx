"use client";

import { useState } from "react";
import { Github, Sparkles, Terminal, Zap } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoginCard() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignIn = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await signIn("github", { callbackUrl: "/dashboard" });
    } catch (error) {
      toast.error("Failed to sign in. Please try again.");
      console.error("Sign in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md">
      {/* Card with glass morphism */}
      <div className="glass glass-hover rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02]">
        {/* Logo and Title */}
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mb-4 inline-flex items-center justify-center rounded-full p-3">
            <Terminal className="text-primary h-8 w-8" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            <span className="text-gradient">Fondation</span>
          </h1>
          <p className="text-muted-foreground">
            AI-Powered Documentation Generation
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 space-y-3">
          <FeatureItem
            icon={<Zap className="h-4 w-4" />}
            text="Lightning-fast documentation generation"
          />
          <FeatureItem
            icon={<Sparkles className="h-4 w-4" />}
            text="Powered by advanced AI models"
          />
          <FeatureItem
            icon={<Terminal className="h-4 w-4" />}
            text="CLI-first developer experience"
          />
        </div>

        {/* Sign in button */}
        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          size="lg"
          className={cn(
            "from-primary to-secondary w-full bg-gradient-to-r",
            "hover:from-primary/90 hover:to-secondary/90",
            "text-primary-foreground font-medium",
            "transition-all duration-300",
            "hover:scale-[1.02] hover:shadow-lg",
            "glow-primary-hover",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isLoading ? (
            <>
              <div className="border-primary-foreground mr-2 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              Connecting...
            </>
          ) : (
            <>
              <Github className="mr-2 h-5 w-5" />
              Continue with GitHub
            </>
          )}
        </Button>

        {/* Footer */}
        <p className="text-muted-foreground mt-6 text-center text-xs">
          By signing in, you agree to our{" "}
          <button className="hover:text-foreground underline transition-colors">
            Terms of Service
          </button>{" "}
          and{" "}
          <button className="hover:text-foreground underline transition-colors">
            Privacy Policy
          </button>
        </p>
      </div>

      {/* Decorative elements */}
      <div className="bg-primary/20 absolute -top-4 -left-4 h-24 w-24 rounded-full blur-3xl" />
      <div className="bg-secondary/20 absolute -right-4 -bottom-4 h-24 w-24 rounded-full blur-3xl" />
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ReactNode;
  text: string;
}

function FeatureItem({ icon, text }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
        {icon}
      </div>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
