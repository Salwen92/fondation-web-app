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
      toast.error("Échec de la connexion. Veuillez réessayer.");
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
          <p className="text-muted-foreground" id="login-description">
            Génération de Documentation par IA
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 space-y-3">
          <FeatureItem
            icon={<Zap className="h-4 w-4" />}
            text="Génération de documentation ultra-rapide"
          />
          <FeatureItem
            icon={<Sparkles className="h-4 w-4" />}
            text="Propulsé par des modèles d'IA avancés"
          />
          <FeatureItem
            icon={<Terminal className="h-4 w-4" />}
            text="Expérience développeur orientée CLI"
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
          aria-label={
            isLoading 
              ? "Connexion en cours avec GitHub, veuillez patienter"
              : "Se connecter avec GitHub pour accéder à Fondation"
          }
          aria-describedby="login-description"
        >
          {isLoading ? (
            <>
              <div 
                className="border-primary-foreground mr-2 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" 
                aria-hidden="true"
              />
              Connexion...
            </>
          ) : (
            <>
              <Github className="mr-2 h-5 w-5" aria-hidden="true" />
              Continuer avec GitHub
            </>
          )}
        </Button>

        {/* Footer */}
        <p className="text-muted-foreground mt-6 text-center text-xs">
          En vous connectant, vous acceptez nos{" "}
          <button 
            className="hover:text-foreground underline transition-colors"
            aria-label="Lire les conditions d'utilisation"
          >
            Conditions d&apos;utilisation
          </button>{" "}
          et notre{" "}
          <button 
            className="hover:text-foreground underline transition-colors"
            aria-label="Lire la politique de confidentialité"
          >
            Politique de confidentialité
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
