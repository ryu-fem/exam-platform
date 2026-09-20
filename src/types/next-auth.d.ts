import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      telegramId?: string;
      role: string;
      status: string;
      year?: string;
      system?: string;
      track?: string;
      electiveSubject?: string;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    telegramId?: string;
    role: string;
    status: string;
    year?: string;
    system?: string;
    track?: string;
    electiveSubject?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    telegramId?: string;
    role?: string;
    status?: string;
    year?: string;
    system?: string;
    track?: string;
    electiveSubject?: string;
  }
}