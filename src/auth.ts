import NextAuth, { type DefaultSession } from "next-auth";
import Authentik from "next-auth/providers/authentik";
import { getMe } from "@/lib/authentik";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string;
      akPk?: number;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Authentik({
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      issuer: process.env.AUTHENTIK_ISSUER,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Without a DB adapter Auth.js gives each sign-in a random id; use Authentik's
    // stable subject instead so per-person access survives re-login.
    async jwt({ token, profile, trigger, session }) {
      if (profile?.sub) token.sub = profile.sub;
      if (profile?.preferred_username) token.username = profile.preferred_username as string;
      // remember the Authentik account number at login, for the profile page
      if (profile?.sub && !token.akPk) {
        const me = await getMe(profile.sub, { username: token.username as string | undefined }).catch(() => null);
        if (me) token.akPk = me.pk;
      }
      // the profile page refreshes these after saving to Authentik
      if (trigger === "update" && session?.user) {
        token.name = session.user.name ?? token.name;
        token.email = session.user.email ?? token.email;
        token.username = session.user.username ?? token.username;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.username === "string") session.user.username = token.username;
      if (typeof token.akPk === "number") session.user.akPk = token.akPk;
      return session;
    },
  },
});
