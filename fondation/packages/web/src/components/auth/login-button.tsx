'use client';

import { Github } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

export function LoginButton() {
  const handleSignIn = async () => {
    try {
      await signIn('github', { callbackUrl: '/' });
    } catch (error) {
      toast.error('Échec de la connexion. Veuillez réessayer.');
      logger.error('Sign in error', error instanceof Error ? error : new Error(String(error)));
    }
  };

  return (
    <Button onClick={handleSignIn} size="lg">
      <Github className="mr-2 h-5 w-5" />
      Se connecter avec GitHub
    </Button>
  );
}
