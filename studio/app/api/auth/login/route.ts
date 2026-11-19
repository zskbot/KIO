import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { consumeIdentityRateLimit, getClientRateLimitIdentity } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

  try {
    const emailRate = await consumeIdentityRateLimit("login-email", parsed.data.email, 8, 15 * 60 * 1000);
    const ipRate = await consumeIdentityRateLimit("login-ip", getClientRateLimitIdentity(request), 30, 15 * 60 * 1000);
    if (!emailRate.allowed || !ipRate.allowed) {
      return NextResponse.json({ error: "Too many sign-in attempts. Please try again later." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    return NextResponse.json({ error: "Sign in unavailable. Check database and auth configuration." }, { status: 503 });
  }
}
