"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { signIn } from "next-auth/react";

export function LoginButton() {
  return (
    <Button
      onClick={() => signIn("github", { callbackUrl: "/" })}
      size="lg"
    >
      <Github className="mr-2 h-5 w-5" />
      Sign in with GitHub
    </Button>
  );
}