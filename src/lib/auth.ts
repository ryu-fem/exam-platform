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

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

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
      },
    }),
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        telegramId: { label: "Telegram ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.telegramId) return null;

        const user = await prisma.user.findUnique({
          where: { telegramId: credentials.telegramId },
        });

        if (!user) return null;

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
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
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
      if (session.user) {
        session.user.id = token.id as string;
        session.user.telegramId = token.telegramId as string | undefined;
        session.user.role = (token.role as string) ?? "student";
        session.user.status = (token.status as string) ?? "pending";
        session.user.year = token.year as string | undefined;
        session.user.system = token.system as string | undefined;
        session.user.track = token.track as string | undefined;
        session.user.electiveSubject = token.electiveSubject as string | undefined;
      }
      return session;
    },
  },
};