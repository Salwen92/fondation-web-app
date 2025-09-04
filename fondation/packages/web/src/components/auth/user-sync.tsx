'use client';

import { api } from '@convex/generated/api';
import { useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function UserSync() {
  const { data: session } = useSession();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    const syncUser = async () => {
      if (session?.user?.githubId) {
        try {
          await createOrUpdateUser({
            githubId: session.user.githubId,
            username: session.user.name ?? '',
            email: session.user.email ?? undefined,
            avatarUrl: session.user.image ?? undefined,
          });
        } catch (error) {
          toast.error('Échec de la synchronisation des données utilisateur');
          logger.error(
            'User sync error',
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }
    };

    syncUser().catch(() => {
      // User sync error handled by Convex
    });
  }, [session, createOrUpdateUser]);

  return null;
}
