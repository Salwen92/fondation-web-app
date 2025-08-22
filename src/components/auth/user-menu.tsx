"use client";

import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

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
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}