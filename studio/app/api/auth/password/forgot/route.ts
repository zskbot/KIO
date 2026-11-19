import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOpaqueToken } from "@/lib/auth-tokens";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendAuthEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const schema = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) });
const generic = { message: "If an account matches that email, password reset instructions will be sent." };

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(generic);
  const secret = process.env.KIO_AUTH_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json(generic);
  const key = createHmac("sha256", secret).update(parsed.data.email).digest("hex");
  const rate = await consumeRateLimit(`auth:forgot:${key}`, 3, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json(generic);
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true } });
  if (user) {
    const { token, tokenHash } = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    await sendAuthEmail({ to: user.email, token, kind: "reset" });
  }
  return NextResponse.json(generic);
}
