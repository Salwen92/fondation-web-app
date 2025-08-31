import NextAuth, { type Session } from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth: () => Promise<Session | null> = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
