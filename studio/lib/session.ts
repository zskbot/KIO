import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const cookieName = "kio_session";
function secret() {
  const value = process.env.KIO_AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("KIO_AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}

export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
  if (!user) throw new Error("Cannot create a session for a missing user.");
  const token = await new SignJWT({ sub: userId, ver: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.ver !== "number") return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, createdAt: true, sessionVersion: true },
    });
    if (!user || user.sessionVersion !== payload.ver) return null;
    const { sessionVersion: _sessionVersion, ...publicUser } = user;
    return publicUser;
  } catch {
    return null;
  }
}
