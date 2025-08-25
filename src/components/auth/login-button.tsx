"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export function LoginButton() {
  const handleSignIn = async () => {
    try {
      await signIn("github", { callbackUrl: "/" });
    } catch (error) {
      toast.error("Échec de la connexion. Veuillez réessayer.");
      console.error("Sign in error:", error);
    }
  };

  return (
    <Button onClick={handleSignIn} size="lg">
      <Github className="mr-2 h-5 w-5" />
      Se connecter avec GitHub
    </Button>
  );
}
