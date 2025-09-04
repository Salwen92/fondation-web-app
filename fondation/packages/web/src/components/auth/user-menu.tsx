'use client';

import { LogOut, User } from 'lucide-react';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface UserMenuProps {
  session: Session | null;
}

export function UserMenu({ session }: UserMenuProps) {
  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5" />
        <span className="text-sm font-medium">{session.user.name}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          signOut({
            callbackUrl: '/login',
            redirect: true,
          })
        }
      >
        <LogOut className="mr-2 h-4 w-4" />
        Déconnexion
      </Button>
    </div>
  );
}
