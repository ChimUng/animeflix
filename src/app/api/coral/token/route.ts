import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user) {
    return NextResponse.json({ token: null }, { status: 200 });
  }

  const secret = process.env.CORAL_JWT_SECRET;
  if (!secret) {
    console.error("Thiếu CORAL_JWT_SECRET trong env");
    return NextResponse.json({ token: null }, { status: 500 });
  }

  const userId = session.user.id;
  const username = session.user.name ?? `user_${userId}`;
  const email = `anilist-${userId}@users.noreply.aniplay.local`;
  const avatar = session.user.image?.large || session.user.image?.medium || undefined;

  const now = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      jti: randomUUID(),
      iat: now,
      exp: now + 60 * 60,
      user: {
        id: String(userId),
        email,
        username,
        avatar, 
      },
    },
    secret,
    { algorithm: "HS256" }
  );

  return NextResponse.json({ token });
}