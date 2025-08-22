"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserSync() {
  const { data: session } = useSession();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    if (session?.user && session.user.githubId) {
      void createOrUpdateUser({
        githubId: session.user.githubId,
        username: session.user.name ?? "",
        email: session.user.email ?? undefined,
        avatarUrl: session.user.image ?? undefined,
      });
    }
  }, [session, createOrUpdateUser]);

  return null;
}