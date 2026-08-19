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
      // role/badge dùng để tự UI của chính user đang login
      // (ẩn/hiện nút Pin/Lock/Delete). KHÔNG dùng field này để check role
      // của người khác — role người khác luôn query Mongo riêng.
      role?: 'user' | 'moderator' | 'boss';
      badge?: string;
      isBanned?: boolean;
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
    role?: 'user' | 'moderator' | 'boss';
    badge?: string;
    isBanned?: boolean;
  }
}