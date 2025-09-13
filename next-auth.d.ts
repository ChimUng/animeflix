import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string | number;
      name?: string | null;
      email?: string | null;
      image?: {
        large?: string;
        medium?: string;
      } | null;
      token?: string;
      createdAt?: number;
      list?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id?: string | number;
    name?: string | null;
    email?: string | null;
    image?: {
      large?: string;
      medium?: string;
    } | string | null;
    token?: string;
    createdAt?: number;
    list?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string | number;
    name?: string | null;
    email?: string | null;
    image?: {
      large?: string;
      medium?: string;
    } | string | null;
    token?: string;
    createdAt?: number;
    list?: string[];
  }
}
