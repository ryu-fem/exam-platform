import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Username & Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
            include: { verification: true },
          });

          if (!user?.passwordHash) return null;
          const valid = await bcrypt.compare(
            credentials.password,
            user.passwordHash,
          );
          if (!valid) return null;

          // Admins are always allowed in (the seed creates them as "active").
          // PENDING students are allowed in too, but in read-only "guest"
          // mode: they can log in and browse, while interactive features are
          // gated client-side and on the API routes. Only rejected or
          // unknown-status accounts are blocked.
          if (user.role !== "admin") {
            if (user.status === "rejected") {
              throw new Error(
                "Your account was rejected. Please contact support.",
              );
            }
            if (user.status !== "active" && user.status !== "pending") {
              throw new Error("Your account is not active.");
            }
          }

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            telegramId: user.telegramId ?? undefined,
            role: user.role,
            status: user.status,
            year: user.year,
            system: user.system ?? undefined,
            track: user.track ?? undefined,
            electiveSubject: user.electiveSubject ?? undefined,
          };
        } catch (error) {
          // Only re-throw our own account-status errors (surfaced to the user
          // through the client `signIn` result). Any database failure degrades
          // to a generic "invalid credentials" instead of leaking internals.
          if (
            error instanceof Error &&
            (error.message.includes("was rejected") ||
              error.message === "Your account is not active.")
          ) {
            throw error;
          }
          console.error(
            "Credentials authorize error for",
            credentials.username,
            error,
          );
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {},
      async authorize(credentials) {
        const telegramId = (credentials as { telegramId?: string } | null)
          ?.telegramId;
        if (!telegramId) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { telegramId },
          });
          // Session-only sign-in for existing accounts that already proved
          // ownership of this telegram id via the server-side widget check
          // (/api/auth/telegram). Pending/rejected accounts are redirected
          // by that route instead of signing in here.
          if (!user) return null;
          if (user.role !== "admin" && user.status !== "active") return null;

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            telegramId: user.telegramId ?? undefined,
            role: user.role,
            status: user.status,
            year: user.year,
            system: user.system ?? undefined,
            track: user.track ?? undefined,
            electiveSubject: user.electiveSubject ?? undefined,
          };
        } catch (error) {
          console.error("Telegram authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (!token) token = {};
      if (user) {
        token.id = user.id as string;
        token.telegramId = (user as { telegramId?: string }).telegramId;
        token.role = (user as { role?: string }).role ?? "student";
        token.status = (user as { status?: string }).status ?? "pending";
        token.year = (user as { year?: string }).year;
        token.system = (user as { system?: string }).system;
        token.track = (user as { track?: string }).track;
        token.electiveSubject = (user as { electiveSubject?: string }).electiveSubject;
      }
      return token;
    },
    async session({ session, token }) {
      // The session object must never be null/undefined — NextAuth's client
      // runs `Object.keys()` on it and would throw otherwise.
      if (!session) {
        return {
          user: {},
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      if (!session.user) {
        session.user = {} as typeof session.user;
      }
      session.user.id = (token?.id as string) ?? "";
      session.user.telegramId = token?.telegramId as string | undefined;
      session.user.role = (token?.role as string) ?? "student";
      session.user.status = (token?.status as string) ?? "pending";
      session.user.year = token?.year as string | undefined;
      session.user.system = token?.system as string | undefined;
      session.user.track = token?.track as string | undefined;
      session.user.electiveSubject = token?.electiveSubject as string | undefined;
      return session;
    },
  },
};